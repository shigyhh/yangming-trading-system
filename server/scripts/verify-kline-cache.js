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
    timeframe: args.timeframe
  });
  console.log(`[KLINE VERIFY] status=${result.status} symbols=${result.symbols_count || 0} candles=${result.candles_count || 0} errors=${result.errors.length} warnings=${result.warnings.length}`);
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
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--market" && next) { parsed.market = next; index += 1; }
    if (arg === "--timeframe" && next) { parsed.timeframe = next; index += 1; }
  }
  return parsed;
}

function printHelp() {
  console.log(`
K线缓存校验

用法：
  npm run kline:verify -- --market ashare --timeframe 101

校验：
  manifest 是否存在/过期、symbols_count/candles_count、样本文件可读、
  candles 时间排序、重复 date/time、open/high/low/close 是否完整。
`);
}
