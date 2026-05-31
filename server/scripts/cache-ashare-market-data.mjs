#!/usr/bin/env node
import { cacheAshareMarketData } from "../src/services/marketPractice.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const startedAt = Date.now();
const result = await cacheAshareMarketData({
  codes: args.codes,
  limit: args.limit,
  timeframes: args.timeframes,
  delayMs: args.delayMs,
  skipExisting: args.skipExisting,
  incremental: args.incremental,
  refreshPool: args.refreshPool,
  onProgress(item, index, total) {
    const status = item.skipped
      ? `SKIP ${item.candles}根`
      : item.incremental
        ? `INC +${item.added || 0}/${item.candles}根`
        : item.ok
          ? `OK ${item.candles}根`
          : `FAIL ${item.error}`;
    console.log(`[${index}/${total}] ${item.code} ${item.klt} ${status}`);
  }
});

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
const output = {
  ...result,
  results: args.summaryOnly ? undefined : result.results,
  seconds
};
console.log(JSON.stringify(output, null, 2));

function parseArgs(argv) {
  const parsed = {
    codes: [],
    limit: 30,
    timeframes: ["101"],
    delayMs: 250,
    skipExisting: true,
    incremental: false,
    refreshPool: false,
    summaryOnly: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--codes" && next) {
      parsed.codes = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--limit" && next) {
      parsed.limit = next === "all" ? 10000 : Math.max(Number(next || 30), 1);
      index += 1;
    }
    if (arg === "--timeframes" && next) {
      parsed.timeframes = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--delay" && next) {
      parsed.delayMs = Math.max(Number(next || 0), 0);
      index += 1;
    }
    if (arg === "--force") parsed.skipExisting = false;
    if (arg === "--skip-existing") parsed.skipExisting = true;
    if (arg === "--incremental") parsed.incremental = true;
    if (arg === "--refresh-pool") parsed.refreshPool = true;
    if (arg === "--summary-only") parsed.summaryOnly = true;
  }

  return parsed;
}

function printHelp() {
  console.log(`
A股历史K线缓存脚本

用法：
  npm run cache:ashare -- --limit 30 --timeframes 101
  npm run cache:ashare -- --codes 600519,000001,300750 --timeframes 101,102,103
  npm run cache:ashare -- --limit all --timeframes 101 --delay 500 --refresh-pool --summary-only
  npm run cache:ashare -- --limit all --timeframes 101 --delay 300 --incremental --summary-only
  npm run cache:ashare -- --limit all --timeframes 101,102,103,30,60 --delay 800 --skip-existing --summary-only

参数：
  --limit       从股票池前 N 只股票开始下载；all 表示尽量下载全部A股
  --codes       指定股票代码，逗号分隔；设置后会忽略 --limit
  --timeframes  周期，支持 30,60,101,102,103
  --delay       每次请求后的等待毫秒数，建议全量下载时设为 500 或更高
  --refresh-pool  先刷新全A股票池
  --skip-existing 跳过已经缓存过的K线文件（默认）
  --incremental  已有缓存时只从最后一根K线之后补齐，适合每天收盘后运行
  --force       即使本地已有缓存也重新下载
  --summary-only  只输出汇总，不打印全部结果明细

环境变量：
  ASHARE_KLINE_BEGIN=19900101
  ASHARE_KLINE_LIMIT=5000
`);
}
