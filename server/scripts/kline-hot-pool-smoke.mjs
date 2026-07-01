const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_SCENARIO_ID = "scene-fast-001";
const DEFAULT_TIMEFRAMES = ["1d", "60m", "30m"];
const DEFAULT_WINDOW_SIZE = 180;
const DEFAULT_MODE = "step_replay";
const DEFAULT_GATE = "shi_shang_mo";

async function requestJson({ baseUrl, path, method = "GET", body = null, fetchImpl = fetch }) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

function buildPreheatPlanPath({
  timeframes,
  windowSize,
  scenarioId,
  mode,
  gate
}) {
  return [
    "/api/v1/kline-history/preheat-plan?",
    "market=cn_equity",
    `&timeframes=${encodeURIComponent(timeframes.join(","))}`,
    `&window=${encodeURIComponent(windowSize)}`,
    `&mode=${encodeURIComponent(mode)}`,
    `&gate=${encodeURIComponent(gate)}`,
    "&blind=1",
    `&scenario_id=${encodeURIComponent(scenarioId)}`,
    "&prefetch_depth=1"
  ].join("");
}

function normalizePlanItem(item = {}, fallback = {}) {
  return {
    market: item.market || "cn_equity",
    timeframe: item.timeframe || fallback.timeframe || "1d",
    window: Number(item.window || fallback.windowSize || DEFAULT_WINDOW_SIZE),
    mode: item.mode || fallback.mode || DEFAULT_MODE,
    gate: item.gate || fallback.gate || DEFAULT_GATE,
    blind: item.blind !== false,
    seed: item.seed || item.pool_slot || "",
    pool_slot: item.pool_slot || item.seed || ""
  };
}

export async function runKlineHotPoolSmoke({
  baseUrl = process.env.SERVER_URL || DEFAULT_BASE_URL,
  scenarioId = DEFAULT_SCENARIO_ID,
  timeframes = DEFAULT_TIMEFRAMES,
  windowSize = DEFAULT_WINDOW_SIZE,
  mode = DEFAULT_MODE,
  gate = DEFAULT_GATE,
  fetchImpl = fetch
} = {}) {
  const plan = await requestJson({
    baseUrl,
    fetchImpl,
    path: buildPreheatPlanPath({ timeframes, windowSize, scenarioId, mode, gate })
  });
  const items = (plan.items || []).map((item) => normalizePlanItem(item, { windowSize, mode, gate }));
  if (items.length !== timeframes.length) {
    throw new Error(`expected ${timeframes.length} preheat items, got ${items.length}`);
  }
  const missingSlot = items.find((item) => !item.pool_slot);
  if (missingSlot) throw new Error("preheat plan item missing pool_slot");

  await requestJson({
    baseUrl,
    fetchImpl,
    path: "/api/v1/kline-history/preheat",
    method: "POST",
    body: {
      market: "cn_equity",
      symbol: "",
      window: windowSize,
      mode,
      gate,
      blind: true,
      items
    }
  });

  const hotHits = [];
  for (const item of items) {
    const hot = await requestJson({
      baseUrl,
      fetchImpl,
      path: [
        "/api/v1/kline-history/hot-slice?",
        "market=cn_equity",
        `&timeframe=${encodeURIComponent(item.timeframe)}`,
        `&window=${encodeURIComponent(windowSize)}`,
        `&mode=${encodeURIComponent(mode)}`,
        `&gate=${encodeURIComponent(gate)}`,
        "&blind=1",
        `&pool_slot=${encodeURIComponent(item.pool_slot)}`
      ].join("")
    });
    const slice = hot.slice || {};
    const candleCount = (slice.candles || []).length;
    if (!slice.hot_pool || slice.cache_status !== "hot_hit" || candleCount < windowSize) {
      throw new Error(`hot pool miss for ${item.pool_slot}: ${JSON.stringify({
        hot_pool: slice.hot_pool,
        cache_status: slice.cache_status,
        candleCount
      })}`);
    }
    hotHits.push({
      timeframe: item.timeframe,
      poolSlot: item.pool_slot,
      cacheStatus: slice.cache_status,
      candleCount
    });
  }

  return {
    ok: true,
    baseUrl,
    scenarioId,
    windowSize,
    hotHits
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runKlineHotPoolSmoke()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}
