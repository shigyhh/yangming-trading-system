#!/usr/bin/env node
import { verifyKlineCache } from "../src/services/klineCache.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const result = await verifyKlineCache({
    market: args.market,
    timeframe: args.timeframe,
    timeframes: args.timeframes
  });
  const symbolCount = result.symbols_count ?? result.timeframes?.reduce((sum, item) => sum + Number(item.symbols_count || 0), 0) ?? 0;
  const candleCount = result.candles_count ?? result.timeframes?.reduce((sum, item) => sum + Number(item.candles_count || 0), 0) ?? 0;
  console.log(`[KLINE VERIFY] status=${result.status} symbols=${symbolCount} candles=${candleCount} errors=${result.errors.length} warnings=${result.warnings.length}`);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exitCode = 1;
} catch (error) {
  console.error(`[KLINE VERIFY] ${error.message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    market: "ashare",
    timeframe: "101",
    timeframes: [],
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--market" && next) { parsed.market = next; index += 1; }
    if (arg === "--timeframe" && next) { parsed.timeframe = next; index += 1; }
    if (arg === "--timeframes" && next) {
      parsed.timeframes = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`
K线缓存校验

用法：
  npm run kline:verify -- --market ashare --timeframe 101
  npm run kline:verify -- --market ashare --timeframes 101,60m,30m

校验：
  manifest 是否存在/过期、symbols_count/candles_count、样本文件可读、
  candles 时间排序、重复 date/time、open/high/low/close/source/adjust 是否完整。
`);
}
