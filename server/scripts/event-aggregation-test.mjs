import assert from "node:assert/strict";
import test from "node:test";

import {
  resetDataBindingForTests,
  saveKLineRecordBinding
} from "../src/services/dataBinding.js";
import {
  getLivingMirrorProfile,
  getRiskPatternSummary,
  getTodayState
} from "../src/services/eventAggregator.js";
import { route } from "../src/routes/router.js";

const user = {
  userId: "projection-user-001",
  maskedPhone: "139****0001",
  phoneTail: "0001",
  inviteSource: "server-test"
};

test("event aggregation returns safe empty projections for a user with no events", async () => {
  await resetDataBindingForTests();

  const profile = await getLivingMirrorProfile(user.userId);
  const risk = await getRiskPatternSummary(user.userId);
  const today = await getTodayState(user.userId);

  assert.equal(profile.userId, user.userId);
  assert.equal(profile.totalEvents, 0);
  assert.deepEqual(profile.repeatedThoughts, []);
  assert.equal(risk.userId, user.userId);
  assert.deepEqual(risk.topRiskPatterns, []);
  assert.equal(today.userId, user.userId);
  assert.equal(today.status, "not_seen");
  assert.equal(today.nextAction, "照见一念");
  assert.equal(today.progress.totalEvents, 0);
});

test("event aggregation marks a single kline training event as trained", async () => {
  await resetDataBindingForTests();

  await saveKLineRecordBinding({
    user,
    source: "miniprogram",
    record: {
      day: 1,
      recordedAt: "2026-06-18T09:30:00.000Z",
      sceneKey: "boundary_touch",
      reactionKey: "chasing_impulse",
      scene: "边界触碰",
      reaction: "追涨冲动",
      disciplineAction: "停十秒",
      dataSource: "server_cache"
    }
  });

  const profile = await getLivingMirrorProfile(user.userId);
  const risk = await getRiskPatternSummary(user.userId);
  const today = await getTodayState(user.userId);

  assert.equal(profile.totalEvents, 1);
  assert.equal(profile.dominantReaction, "追涨冲动");
  assert.equal(profile.latestBoundaryState, "停十秒");
  assert.equal(today.status, "trained");
  assert.equal(today.nextAction, "轻复盘");
  assert.equal(today.progress.klineTrainingCount, 1);
  assert.equal(risk.recentServerSourceQuality.server_cache, 1);
});

test("event aggregation summarizes repeated thoughts and source quality", async () => {
  await resetDataBindingForTests();

  const records = [
    ["2026-06-18T09:30:00.000Z", "追涨冲动", "server_cache"],
    ["2026-06-18T10:00:00.000Z", "追涨冲动", "local_demo"],
    ["2026-06-18T10:30:00.000Z", "观望犹豫", "network_error"]
  ];

  for (const [recordedAt, reaction, dataSource] of records) {
    await saveKLineRecordBinding({
      user,
      source: "miniprogram",
      record: {
        day: 1,
        recordedAt,
        sceneKey: "boundary_touch",
        reactionKey: reaction === "追涨冲动" ? "chasing_impulse" : "hesitation",
        scene: "边界触碰",
        reaction,
        disciplineAction: reaction === "追涨冲动" ? "停十秒" : "先记录第一念",
        dataSource
      }
    });
  }

  const profile = await getLivingMirrorProfile(user.userId);
  const risk = await getRiskPatternSummary(user.userId);

  assert.equal(profile.totalEvents, 3);
  assert.equal(profile.dominantReaction, "追涨冲动");
  assert.deepEqual(profile.repeatedThoughts, ["追涨冲动"]);
  assert.ok(risk.topRiskPatterns.includes("追涨冲动"));
  assert.equal(risk.repeatedReactionChoice, "追涨冲动");
  assert.equal(risk.recentServerSourceQuality.server_cache, 1);
  assert.equal(risk.recentServerSourceQuality.local_demo, 1);
  assert.equal(risk.recentServerSourceQuality.network_error, 1);
});

test("event aggregation routes expose stable read-only JSON projections", async () => {
  await resetDataBindingForTests();

  await saveKLineRecordBinding({
    user,
    source: "miniprogram",
    record: {
      day: 1,
      recordedAt: "2026-06-18T09:30:00.000Z",
      scene: "边界触碰",
      reaction: "追涨冲动",
      disciplineAction: "停十秒",
      dataSource: "server_cache"
    }
  });

  const profile = await requestJson(`/api/v1/users/${user.userId}/living-mirror/profile`);
  const risk = await requestJson(`/api/v1/users/${user.userId}/risk-patterns/summary`);
  const today = await requestJson(`/api/v1/users/${user.userId}/today/state`);

  assert.equal(profile.statusCode, 200);
  assert.equal(profile.body.ok, true);
  assert.equal(profile.body.profile.userId, user.userId);
  assert.equal(risk.statusCode, 200);
  assert.equal(risk.body.summary.recentServerSourceQuality.server_cache, 1);
  assert.equal(today.statusCode, 200);
  assert.equal(today.body.state.status, "trained");
});

test("event aggregation projections do not expose sensitive fields or raw payload", async () => {
  await resetDataBindingForTests();

  await saveKLineRecordBinding({
    user,
    source: "miniprogram",
    record: {
      day: 1,
      recordedAt: "2026-06-18T09:30:00.000Z",
      scene: "敏感字段输入",
      reaction: "token=token_secret openId=open_secret 13912345678 推荐买入",
      disciplineAction: "code=999999 unionId=union_secret",
      dataSource: "network_error",
      oneThoughtEvent: {
        id: "evt-sensitive",
        thought: "openId=open_secret",
        reaction: "token=token_secret",
        boundaryState: "code=999999",
        mirrorType: "unionId=union_secret",
        phone: "13912345678",
        rawPayload: { token: "token_secret" }
      }
    }
  });

  const profile = await requestJson(`/api/v1/users/${user.userId}/living-mirror/profile`);
  const risk = await requestJson(`/api/v1/users/${user.userId}/risk-patterns/summary`);
  const today = await requestJson(`/api/v1/users/${user.userId}/today/state`);
  const payload = JSON.stringify([profile.body, risk.body, today.body]);

  for (const forbidden of [
    "13912345678",
    "open_secret",
    "union_secret",
    "token_secret",
    "999999",
    "rawPayload",
    "phone",
    "openId",
    "unionId",
    "token"
  ]) {
    assert.equal(payload.includes(forbidden), false, `${forbidden} leaked in projection payload`);
  }

  for (const adviceWord of ["买入", "卖出", "荐股", "喊单", "预测", "收益", "必赚", "信号", "抄底", "逃顶", "推荐"]) {
    assert.equal(payload.includes(adviceWord), false, `${adviceWord} appeared in projection payload`);
  }
});

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
