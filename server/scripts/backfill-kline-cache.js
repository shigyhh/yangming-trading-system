#!/usr/bin/env node
console.log(JSON.stringify({
  ok: false,
  status: "todo",
  message: "P2.2-A 暂未实现历史区间回填。请先使用 kline:update 做每日缓存更新；backfill 将在不影响 update/verify 后续补齐。"
}, null, 2));
process.exitCode = 1;
