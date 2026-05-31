#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-root@116.62.146.166}"

echo "连接服务器修复公网 80 入口: ${REMOTE}"
ssh -tt "$REMOTE" "bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

echo "== 1. 确认后端 8787 =="
curl -fsS "http://127.0.0.1:8787/health"
echo

echo "== 2. 检查 Nginx 配置 =="
nginx -t

echo "== 3. 启动并设置 Nginx 开机自启 =="
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl restart nginx
else
  nginx -s reload >/dev/null 2>&1 || nginx
fi

echo "== 4. 验证 80 入口 =="
curl -i --max-time 5 "http://127.0.0.1/health"
echo

echo "== 5. 当前监听端口 =="
lsof -nP -iTCP:80 -sTCP:LISTEN || true
lsof -nP -iTCP:8787 -sTCP:LISTEN || true
REMOTE_SCRIPT

