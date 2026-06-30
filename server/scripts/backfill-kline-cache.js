#!/usr/bin/env node
import { backfillKlineCache } from "../src/services/klineCache.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const result = await backfillKlineCache({
    market: args.market,
    timeframe: args.timeframe,
    timeframes: args.timeframes,
    years: args.years,
    months: args.months,
    all: args.all,
    symbols: args.symbols,
    providerChain: args.providerChain,
    concurrency: args.concurrency,
    batchSize: args.batchSize,
    resume: args.resume,
    dryRun: args.dryRun
  });
  console.log(`[KLINE BACKFILL] status=${result.status} timeframes=${result.timeframes.map((item) => item.timeframe).join(",")} errors=${result.errors.length}`);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exitCode = 1;
} catch (error) {
  console.error(`[KLINE BACKFILL] ${error.message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    market: "ashare",
    timeframe: "",
    timeframes: [],
    years: 0,
    months: 0,
    all: false,
    symbols: [],
    providerChain: ["baostock", "akshare"],
    concurrency: 1,
    batchSize: 100,
    resume: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--market" && next) { parsed.market = next; index += 1; }
    if (arg === "--timeframe" && next) { parsed.timeframe = next; index += 1; }
    if (arg === "--timeframes" && next) {
      parsed.timeframes = splitList(next);
      index += 1;
    }
    if (arg === "--years" && next) { parsed.years = Math.max(Number(next || 0), 0); index += 1; }
    if (arg === "--months" && next) { parsed.months = Math.max(Number(next || 0), 0); index += 1; }
    if (arg === "--all") parsed.all = true;
    if (arg === "--symbols" && next) { parsed.symbols = splitList(next); index += 1; }
    if (arg === "--provider-chain" && next) { parsed.providerChain = splitList(next); index += 1; }
    if (arg === "--concurrency" && next) { parsed.concurrency = Math.max(Number(next || 1), 1); index += 1; }
    if (arg === "--batch-size" && next) { parsed.batchSize = Math.max(Number(next || 100), 1); index += 1; }
    if (arg === "--resume") parsed.resume = true;
    if (arg === "--dry-run") parsed.dryRun = true;
  }

  return parsed;
}

function splitList(value = "") {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function printHelp() {
  console.log(`
A股 K线缓存历史回填

用法：
  npm run kline:backfill -- --market ashare --timeframes 101,60m,30m --symbols 600519,300750 --months 6 --provider-chain baostock,akshare --dry-run
  npm run kline:backfill -- --market ashare --timeframe 101 --years 3 --all --provider-chain baostock,akshare --resume
  npm run kline:backfill -- --market ashare --timeframe 60m --years 1 --all --provider-chain baostock,akshare --resume
  npm run kline:backfill -- --market ashare --timeframe 30m --months 6 --all --provider-chain baostock,akshare --resume

说明：
  支持 timeframe: 101(日K)、60m、30m。
  KLINE_CACHE_ROOT 可指定生产缓存根目录，未配置时使用 server/data/market。
  --resume 会读取每个 timeframe 的 backfill-state.json，跳过已完成 symbol。
`);
}
