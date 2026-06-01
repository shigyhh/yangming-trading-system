#!/usr/bin/env node
import { downloadHistoricalKline } from "../src/services/historicalKline.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const symbols = args.symbols.length ? args.symbols : [args.symbol].filter(Boolean);
if (!symbols.length) {
  console.error("请提供 --symbol 或 --symbols");
  process.exit(1);
}

const results = [];
for (const symbol of symbols) {
  try {
    const result = await downloadHistoricalKline({
      provider: args.provider,
      marketKey: args.market,
      symbol,
      timeframeKey: args.timeframe,
      adjustmentMode: args.adjustment,
      startDate: args.start,
      endDate: args.end,
      limit: args.limit,
      incremental: args.incremental,
      dryRun: args.dryRun
    });
    results.push({ ok: true, ...result.job });
    console.log(`[OK] ${symbol} ${result.job.market_label} ${result.job.timeframe_label} ${result.job.candle_count}根 -> ${result.job.file}`);
  } catch (error) {
    results.push({ ok: false, symbol, error: error.message });
    console.error(`[FAIL] ${symbol} ${error.message}`);
    if (args.strict) process.exitCode = 1;
  }
}

console.log(JSON.stringify({ ok: results.every((item) => item.ok), results }, null, 2));

function parseArgs(argv) {
  const parsed = {
    provider: "",
    market: "cn_equity",
    symbol: "",
    symbols: [],
    timeframe: "1d",
    adjustment: "none",
    start: "",
    end: "",
    limit: 1000,
    incremental: true,
    dryRun: false,
    strict: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--provider" && next) { parsed.provider = next; index += 1; }
    if (arg === "--market" && next) { parsed.market = next; index += 1; }
    if (arg === "--symbol" && next) { parsed.symbol = next; index += 1; }
    if (arg === "--symbols" && next) {
      parsed.symbols = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--timeframe" && next) { parsed.timeframe = next; index += 1; }
    if (arg === "--adjustment" && next) { parsed.adjustment = next; index += 1; }
    if (arg === "--start" && next) { parsed.start = next; index += 1; }
    if (arg === "--end" && next) { parsed.end = next; index += 1; }
    if (arg === "--limit" && next) { parsed.limit = Number(next || 1000); index += 1; }
    if (arg === "--full") parsed.incremental = false;
    if (arg === "--dry-run") parsed.dryRun = true;
    if (arg === "--strict") parsed.strict = true;
  }
  return parsed;
}

function printHelp() {
  console.log(`
历史K线下载脚本

示例：
  node scripts/download-kline-history.mjs --provider tushare --market cn_equity --symbol 600519.SH --timeframe 1d --start 20200101
  node scripts/download-kline-history.mjs --provider futu --market us_equity --symbol AAPL --timeframe 60m
  node scripts/download-kline-history.mjs --provider okx --market crypto --symbol BTC-USDT --timeframe 5m

必要环境变量：
  TUSHARE_TOKEN=...
  FUTU_OPENAPI_BRIDGE_URL=http://127.0.0.1:xxxx
  OKX_ENDPOINT=https://www.okx.com
`);
}
