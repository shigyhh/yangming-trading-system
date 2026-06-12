#!/usr/bin/env node
import { updateKlineCache } from "../src/services/klineCache.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const result = await updateKlineCache({
    market: args.market,
    timeframe: args.timeframe,
    provider: args.provider,
    date: args.date,
    symbols: args.symbols,
    limit: args.limit,
    dryRun: args.dryRun
  });
  console.log(`[KLINE UPDATE] status=${result.status} updated=${result.updated_symbols || 0} added=${result.added_candles || 0} skipped=${result.skipped_symbols || 0} errors=${result.errors?.length || 0}`);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exitCode = 1;
} catch (error) {
  console.error(`[KLINE UPDATE] ${error.message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    market: "ashare",
    timeframe: "101",
    provider: "",
    date: "",
    symbols: [],
    limit: 0,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--market" && next) { parsed.market = next; index += 1; }
    if (arg === "--timeframe" && next) { parsed.timeframe = next; index += 1; }
    if (arg === "--provider" && next) { parsed.provider = next; index += 1; }
    if (arg === "--date" && next) { parsed.date = next; index += 1; }
    if (arg === "--symbols" && next) {
      parsed.symbols = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--limit" && next) {
      parsed.limit = next === "all" ? 0 : Math.max(Number(next || 0), 0);
      index += 1;
    }
    if (arg === "--dry-run") parsed.dryRun = true;
  }
  return parsed;
}

function printHelp() {
  console.log(`
每日 K线缓存更新

用法：
  npm run kline:update -- --market ashare --timeframe 101 --date 20240611
  npm run kline:update -- --market ashare --timeframe 101 --provider akshare --symbols 600519,300750 --dry-run
  npm run kline:update -- --market ashare --timeframe 101 --provider akshare --symbols 600519,300750
  npm run kline:update -- --market ashare --timeframe 101 --symbols 600519,300750 --dry-run

说明：
  未传 --date 时，会使用最近一个工作日。
  当前 P2.2-A 只接 A股日线缓存：market=ashare timeframe=101。
  默认 provider=tushare，需要服务端环境变量 TUSHARE_TOKEN。
  指定 --provider akshare 时，通过服务端 Python + AKShare 更新；单标的失败会 fallback 到 BaoStock。
  如果本机代理导致 Eastmoney 断连，可设置 AKSHARE_NO_PROXY=true。
`);
}
