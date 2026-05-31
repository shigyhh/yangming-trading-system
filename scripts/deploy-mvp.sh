#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-root@116.62.146.166}"
APP_DIR="${2:-/opt/xxjyxt}"
PORT="${3:-8787}"
PUBLIC_URL="${PUBLIC_URL:-http://116.62.146.166}"
VERSION="${VERSION:-$(date +%Y%m%d%H%M%S)}"
ARCHIVE="xxjyxt-release-${VERSION}.tar.gz"
TMP_DIR="$(mktemp -d)"

export COPYFILE_DISABLE=1
export COPY_EXTENDED_ATTRIBUTES_DISABLE=1

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "1/6 准备发布包: ${ARCHIVE}"
cp -R server web-mvp "$TMP_DIR/"
TAR_ITEMS=(server web-mvp)
if [ -f AGENTS.md ]; then
  cp AGENTS.md "$TMP_DIR/"
  TAR_ITEMS+=(AGENTS.md)
fi
find "$TMP_DIR/server" -maxdepth 1 -type f \( -name ".env" -o -name ".env.*" \) ! -name ".env.example" -delete
echo "已清理发布包内 server/.env / server/.env.*，服务器现有 server/.env 将由远程脚本备份并恢复。"

python3 - "$TMP_DIR/web-mvp/index.html" "$VERSION" <<'PY'
import re
import sys

path, version = sys.argv[1], sys.argv[2]
text = open(path, "r", encoding="utf-8").read()
text = re.sub(r'href="\./styles\.css(?:\?[^"]*)?"', f'href="./styles.css?v={version}"', text)
text = re.sub(r'src="\./app\.js(?:\?[^"]*)?"', f'src="./app.js?v={version}"', text)
open(path, "w", encoding="utf-8").write(text)
PY

tar --no-xattrs --no-mac-metadata \
  --exclude='server/node_modules' \
  --exclude='server/data/runtime' \
  --exclude='server/data/market' \
  --exclude='web-mvp/node_modules' \
  -czf "$ARCHIVE" -C "$TMP_DIR" "${TAR_ITEMS[@]}"

cat > "$TMP_DIR/remote-deploy.sh" <<'REMOTE_SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
PORT="$2"
VERSION="$3"
ARCHIVE="$4"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

ENV_BACKUP=""
if [ -f "$APP_DIR/server/.env" ]; then
  ENV_BACKUP="/tmp/xxjyxt-server-env-${VERSION}.bak"
  cp "$APP_DIR/server/.env" "$ENV_BACKUP"
  chmod 600 "$ENV_BACKUP" 2>/dev/null || true
  echo "已备份服务器 server/.env"
fi

if [ -d server ] || [ -d web-mvp ]; then
  tar -czf "/root/xxjyxt-backup-${VERSION}.tar.gz" server web-mvp 2>/dev/null || true
fi

tar -xzf "/tmp/${ARCHIVE}" -C "$APP_DIR"
mkdir -p "$APP_DIR/server"

if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "$APP_DIR/server/.env"
  chmod 600 "$APP_DIR/server/.env" 2>/dev/null || true
  echo "已恢复服务器 server/.env"
elif [ ! -f "$APP_DIR/server/.env" ] && [ -f "$APP_DIR/server/.env.example" ]; then
  cp "$APP_DIR/server/.env.example" "$APP_DIR/server/.env"
  chmod 600 "$APP_DIR/server/.env" 2>/dev/null || true
  echo "已创建 server/.env 示例，请补齐真实配置"
fi

echo "确认前端文件已覆盖"
if ! grep -q "styles.css?v=${VERSION}" "$APP_DIR/web-mvp/index.html"; then
  echo "错误：前端首页没有写入本次版本号 ${VERSION}，可能没有覆盖到正确目录。"
  exit 1
fi

cd "$APP_DIR/server"
npm install --omit=dev

echo "停止旧服务"
PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill -TERM $PIDS 2>/dev/null || true
  sleep 1
  kill -KILL $PIDS 2>/dev/null || true
fi

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "提示：端口 ${PORT} 仍被旧服务占用，本次已完成文件覆盖，跳过重复启动。"
else
  nohup env HOST=0.0.0.0 PORT="$PORT" NODE_OPTIONS="--max-old-space-size=384" node src/index.js > /root/xxjyxt-server.log 2>&1 &
fi

sleep 2
curl -fsS "http://127.0.0.1:${PORT}/health"
echo
curl -fsS "http://127.0.0.1:${PORT}/?v=${VERSION}" | grep -q "styles.css?v=${VERSION}"
echo "本机后端首页版本确认：${VERSION}"

if command -v nginx >/dev/null 2>&1; then
  echo "检查并启动 Nginx 入口"
  if nginx -t >/tmp/xxjyxt-nginx-test.log 2>&1; then
    if command -v systemctl >/dev/null 2>&1; then
      systemctl enable nginx >/dev/null 2>&1 || true
      systemctl restart nginx >/dev/null 2>&1 || nginx -s reload >/dev/null 2>&1 || nginx || true
    else
      nginx -s reload >/dev/null 2>&1 || nginx || true
    fi
    curl -fsS "http://127.0.0.1/health" >/dev/null 2>&1 || true
    if curl -fsS "http://127.0.0.1/?v=${VERSION}" | grep -q "styles.css?v=${VERSION}"; then
      echo "80 入口首页版本确认：${VERSION}"
    else
      echo "提示：80 入口可以访问，但返回的首页不是本次版本，可能还有另一层静态目录或缓存。"
    fi
  else
    cat /tmp/xxjyxt-nginx-test.log || true
    echo "提示：Nginx 配置检查未通过，公网 80 入口可能仍然打不开。"
  fi
else
  echo "提示：服务器未检测到 Nginx，公网 80 入口需要另行配置。"
fi

tail -n 20 /root/xxjyxt-server.log
REMOTE_SCRIPT

echo "2/6 上传到服务器: ${REMOTE}"
scp "$ARCHIVE" "$TMP_DIR/remote-deploy.sh" "${REMOTE}:/tmp/"

echo "3/6 服务器备份、解压、安装依赖、重启服务"
echo "如果这里被服务器断开，请在服务器终端手动执行："
echo "bash /tmp/remote-deploy.sh '${APP_DIR}' '${PORT}' '${VERSION}' '${ARCHIVE}'"
ssh -o ServerAliveInterval=20 -o ServerAliveCountMax=3 "$REMOTE" "bash /tmp/remote-deploy.sh '${APP_DIR}' '${PORT}' '${VERSION}' '${ARCHIVE}'"

echo
echo "发布完成。请打开: ${PUBLIC_URL}/?v=${VERSION}"
