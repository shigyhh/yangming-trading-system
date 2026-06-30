import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const { handleDataBindingRoute } = await import("../src/routes/dataBinding.js");
const {
  createExecutionPlanBinding,
  createInterventionEventBinding,
  createTrainingBookmarkBinding,
  getDashboardSummaryBinding,
  getWeeklyMirrorSummaryBinding,
  resetDataBindingForTests,
  saveKLineRecordBinding,
  saveTradeReviewBinding
} = await import("../src/services/dataBinding.js");

test("dashboard summary aggregates data-binding evidence without dropping aliases", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p9-dashboard-user",
    maskedPhone: "138****9001",
    phoneTail: "9001",
    inviteSource: "P9B"
  };

  await saveTradeReviewBinding({
    user,
    review: {
      id: "review-dashboard-001",
      tradeDate: "2026-06-10",
      strongestThought: "怕错过",
      mainErrorType: "计划外交易",
      firstThought: "怕错过",
      triggerScene: "突然异动",
      reviewText: "只记录第一念和执行动作。"
    },
    source: "test"
  });

  await saveKLineRecordBinding({
    user,
    record: {
      day: 1,
      recordedAt: "2026-06-11T09:00:00.000Z",
      scene: "放量拉升",
      reaction: "想追",
      sourceType: "sampling",
      errorType: "追高冲动",
      sceneTags: ["放量拉升", "冲高回落"],
      executionResult: "aligned",
      trainingPackId: "pack-chasing",
      segmentId: "segment-rise",
      samplingResult: {
        segmentId: "segment-rise",
        trainingPackId: "pack-chasing",
        errorType: "追高冲动",
        sceneTags: ["放量拉升"],
        source: "segment",
        fallbackUsed: false,
        bars: [{ date: "2026-06-11", close: 10.2 }]
      }
    },
    source: "test"
  });

  await saveKLineRecordBinding({
    user,
    record: {
      day: 2,
      recorded_at: "2026-06-12T09:00:00.000Z",
      scene: "反抽诱多",
      reaction: "想补",
      source_type: "custom_session",
      error_type: "补仓冲动",
      scene_tags: ["反抽诱多"],
      execution_result: "deviated",
      training_pack_id: "pack-add-position",
      segment_id: "segment-rebound",
      fallback_used: true,
      fallback_reason: "no_segment_match",
      sampling_result: {
        segment_id: "segment-rebound",
        training_pack_id: "pack-add-position",
        error_type: "补仓冲动",
        scene_tags: ["反抽诱多"],
        source: "fallback",
        fallback_used: true,
        fallback_reason: "no_segment_match",
        bars: [{ date: "2026-06-12", close: 9.8 }]
      }
    },
    source: "test"
  });

  await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmarkType: "action",
    sourceType: "special_training",
    errorType: "追高冲动",
    sceneTags: ["放量拉升"],
    executionResult: "deviated",
    trainingPackId: "pack-chasing",
    segmentId: "segment-rise",
    samplingResult: {
      segmentId: "segment-rise",
      trainingPackId: "pack-chasing",
      errorType: "追高冲动",
      sceneTags: ["放量拉升"],
      source: "segment",
      bars: [{ date: "2026-06-11", close: 10.2 }]
    },
    title: "追高动作收藏",
    createdAt: "2026-06-12T10:00:00.000Z"
  });

  const result = await getDashboardSummaryBinding(user.userId, {
    range: "30d",
    dateFrom: "2026-06-01",
    dateTo: "2026-06-30"
  });

  const summary = result.dashboard_summary;
  assert.equal(summary.userId, user.userId);
  assert.equal(summary.range, "30d");
  assert.equal(summary.overview.tradeReviewCount, 1);
  assert.equal(summary.overview.klineTrainingCount, 2);
  assert.equal(summary.overview.trainingBookmarkCount, 1);
  assert.equal(summary.execution.alignedCount, 1);
  assert.equal(summary.execution.deviatedCount, 2);
  assert.equal(summary.execution.sampleCount, 3);
  assert.equal(summary.execution.consistencyRate, 1 / 3);
  assert.equal(summary.mistakes.topErrorTypes[0].label, "追高冲动");
  assert.equal(summary.firstThoughts.topFirstThoughts[0].label, "怕错过");
  assert.equal(summary.triggerScenes.topTriggerScenes.some((item) => item.label === "放量拉升"), true);
  assert.equal(summary.training.byTrainingPack.find((item) => item.key === "pack-chasing").count, 2);
  assert.equal(summary.training.bySegment.find((item) => item.key === "segment-rise").count, 2);
  assert.equal(summary.training.fallbackCount, 1);
  assert.equal(summary.training.samplingCount, 2);
  assert.equal(summary.training.customSessionCount, 1);
  assert.equal(summary.bookmarks.totalCount, 1);
  assert.equal(summary.archive.totalCount >= 4, true);
  assert.equal(summary.dataGaps.some((gap) => gap.type === "missingInterventionEvents"), true);
  assert.equal(summary.dataGaps.some((gap) => gap.type === "missingExecutionPlans"), true);
  assert.equal(summary.dashboard_summary, undefined);

  const searchable = JSON.stringify(summary);
  assert.equal(searchable.includes("bars"), false);

  await resetDataBindingForTests();
});

test("dashboard summary analyzes intervention outcomes and execution plan coverage", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p10-dashboard-analysis",
    maskedPhone: "137****9010",
    phoneTail: "9010",
    inviteSource: "P10"
  };

  await saveTradeReviewBinding({
    user,
    review: {
      id: "review-p10-analysis-001",
      tradeDate: "2026-06-10",
      mainErrorType: "计划外交易",
      firstThought: "这次不一样",
      triggerScene: "突然异动",
      executionResult: "deviated",
      reviewText: "记录一次计划外交易旧题。"
    },
    source: "test"
  });

  await saveKLineRecordBinding({
    user,
    record: {
      day: 1,
      recordedAt: "2026-06-11T09:00:00.000Z",
      scene: "放量拉升",
      reaction: "想追",
      sourceType: "special_training",
      errorType: "追高冲动",
      sceneTags: ["放量拉升"],
      executionResult: "aligned",
      trainingPackId: "pack-chasing",
      segmentId: "segment-rise"
    },
    source: "test"
  });

  await createInterventionEventBinding(user.userId, {
    user,
    triggerType: "before_training",
    sourceType: "special_training",
    sessionId: "session-p10-001",
    errorType: "追高冲动",
    sceneTags: ["放量拉升"],
    message: "先停一下，是否仍按计划？",
    expectedAction: "按你的执行计划处理",
    userResponse: "followed_plan",
    executionResult: "aligned",
    createdAt: "2026-06-12T09:00:00.000Z"
  });

  await createInterventionEventBinding(user.userId, {
    user,
    trigger_type: "after_review",
    source_type: "trade_review",
    review_id: "review-p10-analysis-001",
    error_type: "计划外交易",
    scene_tags: ["突然异动"],
    message: "这可能是你的高频旧题，先记录，再行动。",
    expected_action: "无计划不行动",
    user_response: "deviated_again",
    execution_result: "deviated",
    created_at: "2026-06-13T09:00:00.000Z"
  });

  await createInterventionEventBinding(user.userId, {
    user,
    triggerType: "during_training",
    sourceType: "custom_session",
    errorType: "追高冲动",
    message: "本次只练一个动作。",
    userResponse: "later",
    executionResult: "unclear",
    createdAt: "2026-06-14T09:00:00.000Z"
  });

  await createInterventionEventBinding(user.userId, {
    user,
    triggerType: "weekly_plan",
    sourceType: "review_focus",
    errorType: "急于翻本",
    message: "先回到本周训练重点。",
    userResponse: "followed_plan",
    executionResult: "aligned",
    createdAt: "2026-03-01T09:00:00.000Z"
  });

  await createExecutionPlanBinding(user.userId, {
    user,
    title: "追高前停十秒",
    errorType: "追高冲动",
    expectedAction: "先停十秒，再记录第一念",
    nextAction: "按计划处理",
    enabled: true,
    createdAt: "2026-06-12T09:00:00.000Z"
  });

  await createExecutionPlanBinding(user.userId, {
    user,
    title: "计划外交易复位",
    error_type: "计划外交易",
    expected_action: "无计划不行动",
    next_action: "稍后再练",
    enabled: false,
    created_at: "2026-06-12T09:00:00.000Z"
  });

  const summary30d = await getDashboardSummaryBinding(user.userId, {
    range: "30d",
    dateFrom: "2026-06-01",
    dateTo: "2026-06-30"
  });

  const interventions = summary30d.dashboard_summary.interventions;
  assert.equal(interventions.totalCount, 3);
  assert.equal(interventions.total_count, 3);
  assert.equal(interventions.byTriggerType.find((item) => item.key === "before_training").count, 1);
  assert.equal(interventions.by_trigger_type.find((item) => item.key === "after_review").count, 1);
  assert.equal(interventions.byUserResponse.find((item) => item.key === "followed_plan").count, 1);
  assert.equal(interventions.by_user_response.find((item) => item.key === "deviated_again").count, 1);
  assert.equal(interventions.byErrorType.find((item) => item.key === "追高冲动").count, 2);
  assert.equal(interventions.by_error_type.find((item) => item.key === "计划外交易").count, 1);
  assert.equal(interventions.bySourceType.find((item) => item.key === "special_training").count, 1);
  assert.equal(interventions.by_source_type.find((item) => item.key === "trade_review").count, 1);
  assert.equal(interventions.responseSummary.followedPlanCount, 1);
  assert.equal(interventions.response_summary.followed_plan_count, 1);
  assert.equal(interventions.responseSummary.deviatedAgainCount, 1);
  assert.equal(interventions.response_summary.deviated_again_count, 1);
  assert.equal(interventions.responseSummary.laterCount, 1);
  assert.equal(interventions.response_summary.later_count, 1);
  assert.equal(interventions.outcome.sampleCount, 2);
  assert.equal(interventions.outcome.sample_count, 2);
  assert.equal(interventions.outcome.followedPlanRate, 0.5);
  assert.equal(interventions.outcome.followed_plan_rate, 0.5);
  assert.equal(interventions.outcome.deviatedAgainRate, 0.5);
  assert.equal(interventions.outcome.deviated_again_rate, 0.5);
  assert.equal(interventions.outcome.label.includes("执行反馈"), true);
  assert.equal(interventions.latestItems.length, 3);
  assert.equal(interventions.latest_items.length, 3);
  assert.equal(interventions.dataGaps.some((gap) => gap.type === "missing_intervention_events"), false);
  assert.equal(interventions.data_gaps.some((gap) => gap.type === "insufficient_outcome_samples"), false);

  const executionPlans = summary30d.dashboard_summary.executionPlans;
  assert.equal(executionPlans.totalCount, 2);
  assert.equal(executionPlans.total_count, 2);
  assert.equal(executionPlans.enabledCount, 1);
  assert.equal(executionPlans.enabled_count, 1);
  assert.equal(executionPlans.disabledCount, 1);
  assert.equal(executionPlans.disabled_count, 1);
  assert.equal(executionPlans.byErrorType.find((item) => item.key === "追高冲动").count, 1);
  assert.equal(executionPlans.by_error_type.find((item) => item.key === "计划外交易").count, 1);
  assert.equal(executionPlans.coverage.errorTypesWithPlan.some((item) => item.key === "追高冲动"), true);
  assert.equal(executionPlans.coverage.error_types_with_plan.some((item) => item.key === "追高冲动"), true);
  assert.equal(executionPlans.coverage.topMissingErrorTypes.some((item) => item.key === "计划外交易"), true);
  assert.equal(executionPlans.coverage.top_missing_error_types.some((item) => item.key === "计划外交易"), true);
  assert.equal(executionPlans.dataGaps.some((gap) => gap.type === "missing_execution_plan_coverage"), true);
  assert.equal(executionPlans.data_gaps.some((gap) => gap.type === "missing_execution_plan_coverage"), true);

  const weekly = await getWeeklyMirrorSummaryBinding(user.userId, {
    weekStart: "2026-06-08",
    weekEnd: "2026-06-14"
  });
  assert.equal(weekly.weekly_mirror_summary.interventionCount, 3);
  assert.equal(weekly.weekly_mirror_summary.intervention_count, 3);
  assert.equal(weekly.weekly_mirror_summary.topInterventionTriggers.find((item) => item.key === "before_training").count, 1);
  assert.equal(weekly.weekly_mirror_summary.top_user_responses.find((item) => item.key === "deviated_again").count, 1);
  assert.equal(weekly.weekly_mirror_summary.followedPlanCount, 1);
  assert.equal(weekly.weekly_mirror_summary.followed_plan_count, 1);
  assert.equal(weekly.weekly_mirror_summary.deviatedAgainCount, 1);
  assert.equal(weekly.weekly_mirror_summary.deviated_again_count, 1);
  assert.equal(Array.isArray(weekly.weekly_mirror_summary.interventionDataGaps), true);

  const summary7d = await getDashboardSummaryBinding(user.userId, {
    range: "7d",
    dateFrom: "2026-06-10",
    dateTo: "2026-06-16"
  });
  assert.equal(summary7d.dashboard_summary.interventions.totalCount, 3);

  const summary90d = await getDashboardSummaryBinding(user.userId, {
    range: "90d",
    dateFrom: "2026-03-01",
    dateTo: "2026-06-30"
  });
  assert.equal(summary90d.dashboard_summary.interventions.totalCount, 4);

  const emptyUser = {
    userId: "p10-dashboard-empty",
    maskedPhone: "137****9011",
    phoneTail: "9011",
    inviteSource: "P10"
  };
  await saveKLineRecordBinding({
    user: emptyUser,
    record: {
      day: 1,
      recordedAt: "2026-06-12T09:00:00.000Z",
      scene: "横盘噪音",
      reaction: "想动手",
      executionResult: "unclear"
    },
    source: "test"
  });
  const emptySummary = await getDashboardSummaryBinding(emptyUser.userId, {
    range: "30d",
    dateFrom: "2026-06-01",
    dateTo: "2026-06-30"
  });
  assert.equal(emptySummary.dashboard_summary.interventions.totalCount, 0);
  assert.equal(emptySummary.dashboard_summary.interventions.outcome.label, "样本不足");
  assert.equal(emptySummary.dashboard_summary.interventions.dataGaps.some((gap) => gap.type === "missing_intervention_events"), true);
  assert.equal(emptySummary.dashboard_summary.executionPlans.totalCount, 0);
  assert.equal(emptySummary.dashboard_summary.executionPlans.dataGaps.some((gap) => gap.type === "missing_execution_plans"), true);

  await resetDataBindingForTests();
});

test("weekly mirror summary and route endpoints expose stable dashboard contracts", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p9-dashboard-api",
    maskedPhone: "139****9002",
    phoneTail: "9002",
    inviteSource: "P9B"
  };

  await saveTradeReviewBinding({
    user,
    review: {
      id: "review-dashboard-api",
      tradeDate: "2026-06-10",
      strongestThought: "还想追回",
      main_error_type: "急于翻本",
      first_thought: "不能输",
      trigger_scene: "快速反弹",
      reviewText: "记录一次真实复盘。"
    },
    source: "test"
  });

  await saveKLineRecordBinding({
    user,
    record: {
      day: 1,
      recordedAt: "2026-06-11T09:00:00.000Z",
      scene: "快速反弹",
      reaction: "想打回来",
      errorType: "急于翻本",
      sceneTags: ["快速反弹"],
      executionResult: "aligned",
      trainingPackId: "pack-revenge",
      segmentId: "segment-fast-rebound",
      samplingResult: {
        segmentId: "segment-fast-rebound",
        trainingPackId: "pack-revenge",
        source: "segment"
      }
    },
    source: "test"
  });

  const weekly = await getWeeklyMirrorSummaryBinding(user.userId, {
    weekStart: "2026-06-08",
    weekEnd: "2026-06-14"
  });
  assert.equal(weekly.weekly_mirror_summary.weekStart, "2026-06-08");
  assert.equal(weekly.weeklyMirrorSummary.weekEnd, "2026-06-14");
  assert.equal(weekly.weekly_mirror_summary.tradeReviewCount, 1);
  assert.equal(weekly.weekly_mirror_summary.trainingCount, 1);
  assert.equal(weekly.weekly_mirror_summary.topErrorTypes[0].label, "急于翻本");
  assert.equal(weekly.weekly_mirror_summary.executionConsistency.sampleCount, 1);
  assert.equal(Array.isArray(weekly.weekly_mirror_summary.nextWeekTrainingPlan), true);

  const dashboardResponse = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p9-dashboard-api/dashboard-summary?range=30d&date_from=2026-06-01&date_to=2026-06-30"
  });
  assert.equal(dashboardResponse.statusCode, 200);
  assert.equal(dashboardResponse.body.ok, true);
  assert.equal(dashboardResponse.body.dashboard_summary.user_id, user.userId);
  assert.equal(dashboardResponse.body.dashboardSummary.overview.klineTrainingCount, 1);

  const weeklyResponse = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p9-dashboard-api/dashboard-weekly?week_start=2026-06-08&week_end=2026-06-14"
  });
  assert.equal(weeklyResponse.statusCode, 200);
  assert.equal(weeklyResponse.body.ok, true);
  assert.equal(weeklyResponse.body.weekly_mirror_summary.week_start, "2026-06-08");
  assert.equal(weeklyResponse.body.weeklyMirrorSummary.trainingCount, 1);

  const missing = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/missing-dashboard/dashboard-summary"
  });
  assert.equal(missing.statusCode, 404);

  await resetDataBindingForTests();
});

async function request({ method, url, headers = {}, body = Buffer.alloc(0) }) {
  const req = new MockRequest(body);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "localhost:8787",
    ...headers
  };

  const res = new MockResponse();
  const parsedUrl = new URL(url, "http://localhost:8787");
  const handled = await handleDataBindingRoute(req, res, {
    url: parsedUrl,
    pathname: parsedUrl.pathname
  });
  if (!handled && !res.finished) {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  }

  return res.toResult();
}

class MockRequest extends Readable {
  constructor(body) {
    super();
    this.body = body;
    this.sent = false;
    this.headers = {};
    this.method = "GET";
    this.url = "/";
  }

  _read() {
    if (this.sent) {
      this.push(null);
      return;
    }
    this.sent = true;
    this.push(this.body);
    this.push(null);
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.chunks = [];
    this.finished = false;
  }

  setHeader(key, value) {
    this.headers[key.toLowerCase()] = value;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([key, value]) => {
      this.setHeader(key, value);
    });
  }

  end(chunk) {
    if (chunk) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    this.finished = true;
  }

  toResult() {
    const text = Buffer.concat(this.chunks).toString("utf8");
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: text ? JSON.parse(text) : null
    };
  }
}
