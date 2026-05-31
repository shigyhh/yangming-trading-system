#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-root@116.62.146.166}"
PORT="${2:-8787}"

echo "连接服务器做只读排查: ${REMOTE}"
ssh -tt "$REMOTE" "PORT='${PORT}' bash -s" <<'REMOTE_SCRIPT'
set -u

echo "== 1. 本机后端健康检查 =="
curl -i --max-time 5 "http://127.0.0.1:${PORT}/health" || true
echo

echo "== 2. 本机 80 入口健康检查 =="
curl -i --max-time 5 "http://127.0.0.1/health" || true
echo

echo "== 2.1 首页资源版本 =="
echo "-- 8787 后端首页 --"
curl -fsS --max-time 5 "http://127.0.0.1:${PORT}/" | grep -E 'styles\.css|app\.js' || true
echo "-- 80 入口首页 --"
curl -fsS --max-time 5 "http://127.0.0.1/" | grep -E 'styles\.css|app\.js' || true
echo "-- 服务器文件首页 --"
grep -E 'styles\.css|app\.js' /opt/xxjyxt/web-mvp/index.html || true
echo

echo "== 3. 端口监听情况 =="
lsof -nP -iTCP:80 -sTCP:LISTEN || true
lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN || true
echo

echo "== 4. Node / Nginx 进程 =="
ps -ef | grep -E 'node|nginx|openresty|bt|宝塔' | grep -v grep || true
echo

echo "== 5. Nginx 配置里是否转发到后端 =="
if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | grep -nE 'server_name|listen|proxy_pass|upstream|8787|8795|8080' | tail -n 120 || true
else
  echo "未检测到 nginx 命令"
fi
echo

echo "== 6. 后端最近日志 =="
tail -n 80 /root/xxjyxt-server.log 2>/dev/null || true
REMOTE_SCRIPT
