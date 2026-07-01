import assert from "node:assert/strict";
import test from "node:test";

import { runKlineHotPoolSmoke } from "./kline-hot-pool-smoke.mjs";

function buildFetchMock(requests) {
  return async (url, options = {}) => {
    const parsed = new URL(url);
    requests.push({
      method: options.method || "GET",
      path: parsed.pathname,
      search: parsed.search,
      body: options.body ? JSON.parse(options.body) : null
    });

    if (parsed.pathname === "/api/v1/kline-history/preheat-plan") {
      const scenarioId = parsed.searchParams.get("scenario_id");
      const timeframes = parsed.searchParams.get("timeframes").split(",");
      return jsonResponse({
        ok: true,
        scenario_id: scenarioId,
        items: timeframes.map((timeframe) => ({
          market: "cn_equity",
          timeframe,
          window: 180,
          mode: "step_replay",
          gate: "shi_shang_mo",
          blind: true,
          seed: `${scenarioId}:${timeframe}:01`,
          pool_slot: `${scenarioId}:${timeframe}:01`
        }))
      });
    }

    if (parsed.pathname === "/api/v1/kline-history/preheat") {
      return jsonResponse({
        ok: true,
        preheated: options.body ? JSON.parse(options.body).items.map((item) => ({
          ok: true,
          pool_slot: item.pool_slot,
          candle_count: 180
        })) : []
      });
    }

    if (parsed.pathname === "/api/v1/kline-history/hot-slice") {
      return jsonResponse({
        ok: true,
        slice: {
          hot_pool: true,
          cache_status: "hot_hit",
          pool_slot: parsed.searchParams.get("pool_slot"),
          candles: Array.from({ length: 180 }, (_, index) => ({
            index: index + 1,
            open: 100,
            high: 101,
            low: 99,
            close: 100,
            volume: 1000
          }))
        }
      });
    }

    return jsonResponse({ ok: false, reason: "unexpected_path" }, 404);
  };
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    }
  };
}

test("kline hot-pool smoke validates preheat plan and hot-hit slices without dumping candles", async () => {
  const requests = [];
  const result = await runKlineHotPoolSmoke({
    baseUrl: "http://127.0.0.1:8787",
    fetchImpl: buildFetchMock(requests)
  });

  assert.equal(result.ok, true);
  assert.equal(result.scenarioId, "scene-fast-001");
  assert.deepEqual(
    result.hotHits.map((item) => item.poolSlot),
    ["scene-fast-001:1d:01", "scene-fast-001:60m:01", "scene-fast-001:30m:01"]
  );
  assert.equal(result.hotHits.every((item) => item.cacheStatus === "hot_hit" && item.candleCount === 180), true);
  assert.equal(JSON.stringify(result).includes("\"candles\""), false);
  assert.deepEqual(
    requests.map((item) => item.path),
    [
      "/api/v1/kline-history/preheat-plan",
      "/api/v1/kline-history/preheat",
      "/api/v1/kline-history/hot-slice",
      "/api/v1/kline-history/hot-slice",
      "/api/v1/kline-history/hot-slice"
    ]
  );
  assert.equal(requests[1].body.items.length, 3);
});
