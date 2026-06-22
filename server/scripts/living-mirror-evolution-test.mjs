import assert from "node:assert/strict";
import test from "node:test";

import {
  resetDataBindingForTests,
  saveKLineRecordBinding
} from "../src/services/dataBinding.js";
import { getLivingMirrorGrowthProjection } from "../src/services/eventAggregator.js";
import { route } from "../src/routes/router.js";
import { buildLivingMirrorGrowthProjection } from "../src/services/livingMirrorEvolution.js";

const forbiddenPhrases = ["买入", "卖出", "荐股", "喊单", "预测", "收益保证", "必赚", "稳赚", "信号", "抄底", "逃顶"];

test("living mirror growth projection summarizes thoughts, behaviors and data gaps", () => {
  const projection = buildLivingMirrorGrowthProjection("user-growth-001", {
    kline_records: [
      makeKlineRecord("2026-06-20T09:30:00.000Z", "怕错过", "追涨冲动", "停十秒", "追涨之镜"),
      makeKlineRecord("2026-06-20T10:00:00.000Z", "怕错过", "追涨冲动", "停十秒", "追涨之镜"),
      makeKlineRecord("2026-06-21T09:30:00.000Z", "先观望", "犹豫反复", "写下边界", "犹疑之镜")
    ],
    trade_reviews: []
  }, { now: "2026-06-22T08:00:00.000Z" });

  assert.equal(projection.schemaVersion, "living_mirror_growth_projection_v1");
  assert.equal(projection.userId, "user-growth-001");
  assert.equal(projection.highFrequencyThoughts[0].text, "怕错过");
  assert.equal(projection.highFrequencyThoughts[0].count, 2);
  assert.equal(projection.repeatedBehaviors[0].label, "追涨冲动");
  assert.equal(projection.trainingContinuity.totalEvents, 3);
  assert.equal(projection.trainingContinuity.activeDays, 2);
  assert.equal(projection.mirrorLifeStage, "sprout");
  assert.equal(projection.nextCycleFocus.action.includes("复盘"), true);
  assert.ok(projection.dataGaps.some((gap) => gap.key === "heartProof"));
  assert.ok(projection.dataGaps.some((gap) => gap.key === "dailyGrowth"));
  assert.ok(projection.dataGaps.some((gap) => gap.key === "retest"));
  assert.equal(projection.topBehaviorLoops[0].label, "追涨冲动");
  assert.equal(projection.zhixingStability.updatedAt, "2026-06-22T08:00:00.000Z");
  assert.equal(projection.sourceSummary.oneThoughtEvents, 3);
  assert.ok(projection.complianceNotice.includes("交易心理训练"));
});

test("living mirror growth projection keeps sensitive and advice-like text out", () => {
  const projection = buildLivingMirrorGrowthProjection("user-growth-002", {
    kline_records: [
      {
        recorded_at: "2026-06-20T09:30:00.000Z",
        reaction: "token=secret openId=open-secret 13912345678 推荐买入",
        discipline_action: "code=999999 unionId=union-secret",
        one_thought_event: {
          thought: "token=secret openId=open-secret 13912345678 推荐买入",
          reaction: "收益保证",
          boundary_state: "code=999999 unionId=union-secret",
          mirror_type: "必赚"
        }
      }
    ]
  }, { now: "2026-06-22T08:00:00.000Z" });

  const payload = JSON.stringify(projection);
  for (const sensitive of ["13912345678", "secret", "open-secret", "union-secret", "999999", "phone", "token", "openId", "unionId"]) {
    assert.equal(payload.includes(sensitive), false, `${sensitive} leaked`);
  }
  for (const phrase of forbiddenPhrases) {
    assert.equal(payload.includes(phrase), false, `${phrase} appeared`);
  }
});

test("living mirror growth projection accepts data-binding style inputs and trade reviews", () => {
  const projection = buildLivingMirrorGrowthProjection("growth-input-user", {
    klineRecords: [
      makeKlineRecord("2026-06-20T09:30:00.000Z", "怕错过", "追涨冲动", "停十秒", "追涨之镜")
    ],
    tradeReviews: [
      {
        createdAt: "2026-06-20T15:00:00.000Z",
        strongestThought: "怕错过",
        detectedMirror: "追涨之镜",
        behaviorTags: ["追涨冲动"]
      },
      {
        createdAt: "2026-06-21T15:00:00.000Z",
        strongestThought: "怕错过",
        detectedMirror: "追涨之镜",
        behaviorTags: ["追涨冲动"]
      }
    ],
    mirrorReports: [{ id: "mirror-001", mainMirror: "追涨之镜" }],
    retests: [{ id: "retest-001" }]
  }, { now: "2026-06-22T08:00:00.000Z" });

  assert.equal(projection.sourceSummary.klineRecords, 1);
  assert.equal(projection.sourceSummary.tradeReviews, 2);
  assert.equal(projection.sourceSummary.mirrorReport, true);
  assert.equal(projection.sourceSummary.retests, 1);
  assert.equal(projection.sourceSummary.heartProof, false);
  assert.equal(projection.sourceSummary.dailyGrowth, false);
  assert.equal(projection.repeatedBehaviors[0].label, "追涨冲动");
  assert.equal(projection.repeatedBehaviors[0].count, 3);
  assert.ok(projection.affectedDimensions.some((dimension) => dimension.key === "review"));
  assert.equal(projection.mirrorLifeStage, "sprout");
  assert.ok(projection.dataGaps.some((gap) => gap.key === "heartProof"));
  assert.ok(projection.dataGaps.some((gap) => gap.key === "dailyGrowth"));
  assert.equal(projection.dataGaps.some((gap) => gap.key === "retest"), false);
});

test("event aggregator exposes living mirror growth projection from stored kline records", async () => {
  await resetDataBindingForTests();
  await saveKLineRecordBinding({
    user: { userId: "growth-source-user", maskedPhone: "139****0001", phoneTail: "0001" },
    source: "miniprogram",
    record: {
      day: 1,
      recordedAt: "2026-06-21T09:30:00.000Z",
      scene: "边界触碰",
      reaction: "急躁",
      disciplineAction: "停十秒",
      dataSource: "server_cache",
      oneThoughtEvent: {
        thought: "怕错过",
        reaction: "急躁",
        boundaryState: "停十秒",
        mirrorType: "追涨之镜",
        createdAt: "2026-06-21T09:30:00.000Z"
      }
    }
  });

  const projection = await getLivingMirrorGrowthProjection("growth-source-user", {
    now: "2026-06-22T08:00:00.000Z"
  });

  assert.equal(projection.userId, "growth-source-user");
  assert.equal(projection.highFrequencyThoughts[0].text, "怕错过");
  assert.equal(projection.sourceSummary.klineRecords, 1);
});

test("living mirror growth route returns a stable read-only projection", async () => {
  await resetDataBindingForTests();
  await saveKLineRecordBinding({
    user: { userId: "growth-route-user", maskedPhone: "139****0001", phoneTail: "0001" },
    source: "miniprogram",
    record: {
      day: 1,
      recordedAt: "2026-06-21T09:30:00.000Z",
      scene: "边界触碰",
      reaction: "追涨冲动",
      disciplineAction: "停十秒",
      dataSource: "server_cache",
      oneThoughtEvent: {
        thought: "怕错过",
        reaction: "追涨冲动",
        boundaryState: "停十秒",
        mirrorType: "追涨之镜",
        createdAt: "2026-06-21T09:30:00.000Z"
      }
    }
  });

  const result = await requestJson("/api/v1/users/growth-route-user/living-mirror/growth");

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.projection.userId, "growth-route-user");
  assert.equal(result.body.projection.highFrequencyThoughts[0].text, "怕错过");
  assert.ok(result.body.projection.complianceNotice.includes("交易心理训练"));

  const payload = JSON.stringify(result.body);
  for (const phrase of forbiddenPhrases) {
    assert.equal(payload.includes(phrase), false, `${phrase} appeared`);
  }
});

function makeKlineRecord(recordedAt, thought, reaction, boundaryState, mirrorType) {
  return {
    recorded_at: recordedAt,
    reaction,
    discipline_action: boundaryState,
    data_source: "server_cache",
    one_thought_event: {
      thought,
      reaction,
      boundary_state: boundaryState,
      mirror_type: mirrorType,
      created_at: recordedAt
    }
  };
}

async function requestJson(url) {
  const req = {
    method: "GET",
    url,
    headers: { host: "localhost:8787" },
    socket: { remoteAddress: "127.0.0.1" }
  };
  const res = {
    statusCode: 0,
    body: "",
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end(body) {
      this.body = body ? JSON.parse(String(body)) : null;
    }
  };

  await route(req, res);
  return res;
}
