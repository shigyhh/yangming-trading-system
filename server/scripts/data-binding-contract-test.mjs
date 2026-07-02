import assert from "node:assert/strict";
import test from "node:test";

import {
  createTrainingBookmarkBinding,
  deleteTrainingBookmarkBinding,
  generateShareCardBinding,
  getDataBindingUserSummary,
  getInviteSourceStatsBinding,
  getMirrorArchiveBinding,
  listTradeReviewBindings,
  listTrainingBookmarkBindings,
  getRetestComparisonBinding,
  getShareCardBinding,
  getTrainingPrescriptionBinding,
  listAdminUsersFromBindings,
  resetDataBindingForTests,
  saveAssessmentReportBinding,
  saveKLineRecordBinding,
  saveRetestResultBinding,
  saveTradeReviewBinding,
  saveTrainingRecordBinding,
  dispatchTrainingPrescriptionBinding,
  syncAssistantSummaryToFeishuBinding,
  updateTrainingBookmarkBinding,
  unloadDataBindingForTests,
  updateAssistantHandoffBinding
} from "../src/services/dataBinding.js";
import { buildTradeReviewOcrDraft } from "../src/services/tradeReviewOcr.js";

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("data binding service stores assessment, training, kline and retest in runtime JSON", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "web-local-001",
    maskedPhone: "139****8842",
    phoneTail: "8842",
    inviteSource: "网页MVP"
  };
  const baselineReport = makeReport({
    createdAt: "2026-05-31T08:00:00.000Z",
    primary: "冲动型",
    secondary: "焦虑型",
    impulse: 80,
    holding: 40
  });
  const retestReport = makeReport({
    createdAt: "2026-06-01T08:00:00.000Z",
    primary: "冲动型",
    secondary: "平衡型",
    impulse: 62,
    holding: 36
  });

  const assessment = await saveAssessmentReportBinding({
    user,
    report: baselineReport,
    answers: [{ questionId: "q1", optionId: "a" }],
    questionOrder: ["q1"],
    source: "web-next"
  });
  const training = await saveTrainingRecordBinding({
    user,
    record: {
      day: 1,
      title: "停十秒",
      note: "今日只练下单前暂停。",
      checkIn: "preparing_trade",
      cultivationText: "今天看见了一次怕错过。"
    }
  });
  const kline = await saveKLineRecordBinding({
    user,
    record: {
      day: 1,
      sceneKey: "fast_rise_no_plan",
      reactionKey: "fear_missing",
      scene: "急拉",
      reaction: "想追",
      disciplineAction: "先停十秒，再复核计划",
      feedback: "今天先练写下进场理由。",
      reactionTimeMs: 2400,
      processScores: {
        planExecution: 58,
        boundaryKeeping: 54,
        impulseDelay: 42,
        emotionalStability: 56,
        reviewCompletion: 78
      },
      processInsight: "你已经看见第一念，下一步是让手慢半拍。",
      trainingSuggestion: "建议进入 Day 1：观入场冲动。"
    }
  });
  const tradeReview = await saveTradeReviewBinding({
    user,
    review: {
      imageUrl: "/uploads/reviews/review-001.png",
      tradeDate: "2026-06-01",
      lookupSymbol: "600519",
      symbolMasked: "****19",
      marketType: "a_share",
      timeframeKey: "1d",
      buyReason: "看到快速拉升，担心错过机会。",
      sellReason: "回看后发现当时没有写清边界。",
      strongestThought: "怕错过",
      behaviorTags: ["截图复盘"],
      wasPlanned: false,
      changedPlanDuringTrade: true,
      hadExitRule: false,
      ocrDraft: {
        status: "provider_not_configured",
        provider: "manual_confirmation",
        confidence: 0,
        needsUserConfirmation: true,
        fields: {
          tradeDate: "",
          marketType: "",
          symbol: ""
        },
        message: "识别服务未连接，先手动确认字段。"
      }
    },
    source: "web-next"
  });
  const tradeReviewList = await listTradeReviewBindings(user.userId);
  const ocrDraft = await buildTradeReviewOcrDraft({
    user,
    image: {
      fileName: "review-001.png",
      size: 1024
    },
    source: "miniprogram"
  });
  const retest = await saveRetestResultBinding({ user, report: retestReport });
  const handoff = await updateAssistantHandoffBinding(user.userId, {
    status: "已承接",
    owner: "助教明远",
    note: "已记录训练承接，只做觉察、训练与复盘提醒。"
  });
  const reviewHandoff = await updateAssistantHandoffBinding(user.userId, {
    status: "待复盘",
    owner: "助教明远",
    note: "等待查看训练记录与复测变化。"
  });
  const feishuDryRun = await syncAssistantSummaryToFeishuBinding(user.userId, {
    dryRun: true
  });
  const shareCard = await generateShareCardBinding(user.userId, {
    channel: "网页分享卡"
  });
  const mergedTraining = await saveTrainingRecordBinding({
    user: {
      userId: "web-local-merge-001",
      maskedPhone: user.maskedPhone,
      phoneTail: user.phoneTail,
      inviteSource: "二次入口"
    },
    record: {
      day: 2,
      title: "记一念",
      note: "同手机号二次进入后继续训练。",
      cultivationText: "今天继续记录同一个手机号下的训练。"
    }
  });
  const sameDayMiniappTraining = await saveTrainingRecordBinding({
    user: {
      userId: "miniapp-local-merge-001",
      maskedPhone: user.maskedPhone,
      phoneTail: user.phoneTail,
      inviteSource: "小程序入口"
    },
    record: {
      id: "miniapp-day-1-kline",
      day: 1,
      title: "小程序K线盲练",
      note: "同一天从小程序补一条K线训练记录，不覆盖网页训练。",
      checkIn: "kline_blind_training",
      cultivationText: "这一念先入档，再进入K线训练。"
    }
  });

  const summary = await getDataBindingUserSummary(user.userId);
  const aliasSummary = await getDataBindingUserSummary("web-local-merge-001");
  const miniappAliasSummary = await getDataBindingUserSummary("miniapp-local-merge-001");
  const prescription = await getTrainingPrescriptionBinding(user.userId);
  const dispatchedPrescription = await dispatchTrainingPrescriptionBinding(user.userId, {
    source: "web-next"
  });
  const summaryAfterDispatch = await getDataBindingUserSummary(user.userId);
  const fetchedShareCard = await getShareCardBinding(user.userId);
  const inviteStats = await getInviteSourceStatsBinding();
  const admins = await listAdminUsersFromBindings();
  const comparison = await getRetestComparisonBinding(user.userId);

  assert.equal(assessment.admin_user.phone, "139****8842");
  assert.equal(assessment.report.schemaVersion, "assessment_report_v1");
  assert.equal(assessment.mirror_report.schemaVersion, "living_mirror_v1");
  assert.equal(assessment.living_mirror_stats.schemaVersion, "living_mirror_v1");
  assert.equal(assessment.report.trainingPrescription7Days.length, 7);
  assert.equal(assessment.admin_user.assistantSummary.priority, "优先承接");
  assert.equal(training.record.day, 1);
  assert.equal(training.record.check_in, "preparing_trade");
  assert.ok(training.living_mirror_stats.conscienceGrowth > assessment.living_mirror_stats.conscienceGrowth);
  assert.equal(mergedTraining.user.id, user.userId);
  assert.ok(mergedTraining.user.merged_ids.includes("web-local-merge-001"));
  assert.equal(sameDayMiniappTraining.user.id, user.userId);
  assert.ok(sameDayMiniappTraining.user.merged_ids.includes("miniapp-local-merge-001"));
  assert.equal(kline.record.scene, "急拉");
  assert.equal(kline.record.reaction_key, "fear_missing");
  assert.equal(kline.record.feedback, "今天先练写下进场理由。");
  assert.equal(kline.record.reaction_time_ms, 2400);
  assert.equal(kline.record.process_scores.planExecution, 58);
  assert.equal(kline.record.process_insight, "你已经看见第一念，下一步是让手慢半拍。");
  assert.equal(tradeReview.review.detectedMirror, "追涨之镜");
  assert.equal(tradeReview.review.symbolMasked, "****19");
  assert.equal(tradeReview.review.timeframeKey, "1d");
  assert.equal(tradeReview.review.wasPlanned, false);
  assert.equal(tradeReview.review.changedPlanDuringTrade, true);
  assert.equal(tradeReview.review.hadExitRule, false);
  assert.equal(tradeReview.review.ocrDraft.status, "provider_not_configured");
  assert.ok(["待回看", "待训练"].includes(tradeReview.review.crossEndStatusText));
  assert.ok(tradeReview.review.crossEndStatusSteps.some((step) => step.label === "待确认"));
  assert.ok(tradeReview.review.crossEndStatusSteps.some((step) => step.label === "已入镜"));
  assert.equal(tradeReview.review.marketContext.schemaVersion, "trade_review_market_context_v1");
  assert.equal(tradeReview.review.marketContext.marketKey, "cn_equity");
  assert.ok(["ready", "missing_cache", "failed"].includes(tradeReview.review.marketContext.status));
  if (tradeReview.review.marketContext.status === "ready") {
    assert.match(tradeReview.review.marketContext.positionLabel, /阶段|区间|波动/);
  }
  assert.equal(tradeReview.living_mirror_profile.schemaVersion, "living_mirror_profile_v1");
  assert.equal(tradeReview.living_mirror_profile.sourceCounts.tradeReview, 1);
  assert.equal(tradeReview.living_mirror_profile.latestMarketContext.status, tradeReview.review.marketContext.status);
  assert.equal(tradeReview.living_mirror_profile.tripleReflection.unifiedConclusion, "追涨之镜增强");
  assert.ok(tradeReview.living_mirror_profile.tripleReflection.proofLine.includes("→ 追涨之镜增强"));
  assert.equal(tradeReviewList.trade_reviews.length, 1);
  assert.equal(tradeReviewList.trade_reviews[0].id, tradeReview.review.id);
  assert.equal(tradeReviewList.trade_reviews[0].crossEndStatusText, tradeReview.review.crossEndStatusText);
  assert.equal(tradeReviewList.living_mirror_profile.tripleReflection.title, "三证互照");
  assert.equal(ocrDraft.status, "provider_not_configured");
  assert.equal(ocrDraft.needsUserConfirmation, true);
  assert.ok(tradeReview.living_mirror_stats.mirrorScores.chasing >= 0);
  assert.ok(tradeReview.living_mirror_stats.thiefCounts["贪"] >= 1);
  assert.ok(summary.admin_user.klineRecords[0].disciplineAction.includes("过程质量"));
  assert.equal(retest.comparison[0].delta, -18);
  assert.equal(handoff.assistant.status, "已承接");
  assert.equal(handoff.assistant.owner, "助教明远");
  assert.equal(reviewHandoff.assistant.status, "待复盘");
  assert.equal(feishuDryRun.feishu_sync.status, "dry_run");
  assert.equal(feishuDryRun.result.dry_run, true);
  assert.ok(feishuDryRun.assistant_summary.script.includes("连续练七天"));
  assert.equal(shareCard.share_card.primaryType, "冲动型");
  assert.equal(shareCard.share_card.inviteCode, "网页MVP");
  assert.equal(shareCard.share_card.channel, "网页分享卡");
  assert.equal(fetchedShareCard.id, shareCard.share_card.id);
  assert.equal(JSON.stringify(shareCard.share_card).includes(user.maskedPhone), false);
  assert.equal(summary.training_records.length, 3);
  assert.equal(summary.training_records.some((record) => record.id === "miniapp-day-1-kline"), true);
  assert.equal(summary.archive_index.by_type.growth_record, 3);
  assert.equal(aliasSummary.user.id, user.userId);
  assert.equal(aliasSummary.training_records.length, 3);
  assert.equal(miniappAliasSummary.user.id, user.userId);
  assert.equal(miniappAliasSummary.training_records.length, 3);
  assert.equal(summary.kline_records.length, 1);
  assert.equal(summary.trade_reviews.length, 1);
  assert.equal(summary.trade_reviews[0].crossEndStatusText, "已复测");
  assert.equal(summary.mirror_report.mainMirror, "追涨之镜");
  assert.equal(summary.mirror_report.schemaVersion, "living_mirror_v1");
  assert.equal(summary.living_mirror_stats.schemaVersion, "living_mirror_v1");
  assert.equal(summary.living_mirror_profile.currentMainMirror, "追涨之镜");
  assert.equal(summary.living_mirror_profile.sourceCounts.assessment, 1);
  assert.equal(summary.living_mirror_profile.sourceCounts.klineBlind, 1);
  assert.equal(summary.living_mirror_profile.sourceCounts.tradeReview, 1);
  assert.equal(summary.living_mirror_profile.tripleReflection.evidenceLevel, "strong");
  assert.ok(summary.living_mirror_profile.tripleReflection.conclusion.includes("追涨之镜"));
  assert.equal(summary.training_prescription.schemaVersion, "training_prescription_v1");
  assert.equal(summary.training_prescription.mirror, "追涨之镜");
  assert.equal(summary.training_prescription.status, "ready");
  assert.equal(prescription.training_prescription.action, summary.training_prescription.action);
  assert.equal(dispatchedPrescription.training_prescription.status, "dispatched");
  assert.equal(dispatchedPrescription.training_prescription.source, "web-next");
  assert.ok(dispatchedPrescription.training_prescription.dispatchedAt);
  assert.equal(summaryAfterDispatch.training_prescription.status, "dispatched");
  assert.equal(summary.mirror_archive.tradeReviews.length, 1);
  assert.equal(summary.admin_user.tradeReviews[0].detectedMirror, "追涨之镜");
  assert.equal(summary.admin_user.tradeReviews[0].crossEndStatusText, "已复测");
  assert.ok(summary.admin_user.livingMirrorStats.conscienceGrowth > 0);
  assert.equal(summary.assistant_summary.primaryType, "冲动型");
  assert.equal(summary.admin_user.klineRecords.length, 1);
  assert.equal(summary.admin_user.retestComparisons.length, 2);
  assert.equal(summary.feishu_sync.status, "dry_run");
  assert.equal(summary.share_card.primaryType, "冲动型");
  assert.equal(comparison.length, 2);
  assert.ok(inviteStats.some((item) => item.source === "网页MVP" && item.assistantHandoffCount === 1 && item.shareCardCount === 1));
  assert.ok(admins.some((adminUser) => adminUser.id === user.userId));

  unloadDataBindingForTests();
  const reloadedSummary = await getDataBindingUserSummary(user.userId);
  assert.equal(reloadedSummary.user.id, user.userId);
  assert.equal(reloadedSummary.training_records.length, 3);
  assert.equal(reloadedSummary.archive_index.by_type.growth_record, 3);
  assert.equal(reloadedSummary.kline_records.length, 1);
  assert.equal(reloadedSummary.trade_reviews.length, 1);
  assert.equal(reloadedSummary.living_mirror_stats.loopRelapseCount, 1);
  assert.equal(reloadedSummary.living_mirror_profile.latestMarketContext.schemaVersion, "trade_review_market_context_v1");
  assert.equal(reloadedSummary.training_prescription.status, "dispatched");
  assert.equal(reloadedSummary.admin_user.assistant.owner, "助教明远");
  assert.equal(reloadedSummary.admin_user.assistantSummary.primaryType, "冲动型");
  assert.equal(reloadedSummary.feishu_sync.status, "dry_run");
  assert.equal(reloadedSummary.share_card.id, shareCard.share_card.id);

  const searchableText = JSON.stringify({ summary, admins });
  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });

  await resetDataBindingForTests();
});

test("data binding preserves P1 field aliases for miniapp review and kline sync", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p1-field-contract-001",
    maskedPhone: "136****7788",
    phoneTail: "7788",
    inviteSource: "微信小程序MVP"
  };

  const kline = await saveKLineRecordBinding({
    user,
    record: {
      id: "p1-kline-record-camel",
      day: 2,
      recordedAt: "2026-06-02T08:00:00.000Z",
      scene: "急拉",
      reaction: "想追",
      disciplineAction: "先停十秒，再复核计划",
      sourceType: "kline_training",
      errorType: "chasing",
      sceneTags: ["急拉", "边界触碰"],
      trainingPrescription: { action: "停十秒，写下边界。" },
      executionResult: "执行偏离",
      repeatCount: 2,
      trainingMistakeCard: { title: "急拉旧题" }
    },
    source: "miniprogram"
  });

  assert.equal(kline.record.id, "p1-kline-record-camel");
  assert.equal(kline.record.sourceType, "kline_training");
  assert.equal(kline.record.source_type, "kline_training");
  assert.equal(kline.record.errorType, "chasing");
  assert.equal(kline.record.error_type, "chasing");
  assert.deepEqual(kline.record.sceneTags, ["急拉", "边界触碰"]);
  assert.deepEqual(kline.record.scene_tags, ["急拉", "边界触碰"]);
  assert.deepEqual(kline.record.trainingPrescription, { action: "停十秒，写下边界。" });
  assert.deepEqual(kline.record.training_prescription, { action: "停十秒，写下边界。" });
  assert.equal(kline.record.executionResult, "执行偏离");
  assert.equal(kline.record.execution_result, "执行偏离");
  assert.equal(kline.record.repeatCount, 2);
  assert.equal(kline.record.repeat_count, 2);
  assert.deepEqual(kline.record.trainingMistakeCard, { title: "急拉旧题" });
  assert.deepEqual(kline.record.training_mistake_card, { title: "急拉旧题" });

  const snakeOnlyKline = await saveKLineRecordBinding({
    user,
    record: {
      day: 3,
      recordedAt: "2026-06-03T08:00:00.000Z",
      scene: "横盘磨人",
      reaction: "想等确认",
      disciplineAction: "固定观察窗口",
      source_type: "review_focus",
      error_type: "hesitation",
      scene_tags: ["横盘", "犹疑"],
      training_prescription: { action: "固定观察窗口。" },
      execution_result: "暂无明确执行结果",
      repeat_count: 0,
      training_mistake_card: { title: "最明显执行偏离" }
    },
    source: "miniprogram"
  });
  assert.equal(snakeOnlyKline.record.sourceType, "review_focus");
  assert.equal(snakeOnlyKline.record.source_type, "review_focus");
  assert.equal(snakeOnlyKline.record.errorType, "hesitation");
  assert.equal(snakeOnlyKline.record.error_type, "hesitation");
  assert.deepEqual(snakeOnlyKline.record.sceneTags, ["横盘", "犹疑"]);
  assert.deepEqual(snakeOnlyKline.record.scene_tags, ["横盘", "犹疑"]);
  assert.deepEqual(snakeOnlyKline.record.trainingPrescription, { action: "固定观察窗口。" });
  assert.deepEqual(snakeOnlyKline.record.training_prescription, { action: "固定观察窗口。" });
  assert.equal(snakeOnlyKline.record.executionResult, "暂无明确执行结果");
  assert.equal(snakeOnlyKline.record.execution_result, "暂无明确执行结果");
  assert.equal(snakeOnlyKline.record.repeatCount, 0);
  assert.equal(snakeOnlyKline.record.repeat_count, 0);
  assert.deepEqual(snakeOnlyKline.record.trainingMistakeCard, { title: "最明显执行偏离" });
  assert.deepEqual(snakeOnlyKline.record.training_mistake_card, { title: "最明显执行偏离" });

  const tradeReview = await saveTradeReviewBinding({
    user,
    review: {
      id: "tr-p1-snake-only",
      image_url: "/uploads/reviews/review-p1.png",
      trade_date: "2026-06-02",
      market_type: "a_share",
      timeframe_key: "1d",
      buy_reason: "看到快速拉升，担心错过机会。",
      sell_reason: "回看后发现边界没有提前写清。",
      strongest_thought: "怕错过",
      main_error_type: "impulse",
      first_thought: "又想追",
      trigger_scene: "放量突破",
      training_prescription: { action: "只记录，不行动。" },
      next_rule: "下次看见放量先停十秒",
      mistake_card: { title: "追涨旧题复现" }
    },
    source: "miniprogram"
  });

  assert.equal(tradeReview.review.mainErrorType, "impulse");
  assert.equal(tradeReview.review.main_error_type, "impulse");
  assert.equal(tradeReview.review.firstThought, "又想追");
  assert.equal(tradeReview.review.first_thought, "又想追");
  assert.equal(tradeReview.review.triggerScene, "放量突破");
  assert.equal(tradeReview.review.trigger_scene, "放量突破");
  assert.deepEqual(tradeReview.review.trainingPrescription, { action: "只记录，不行动。" });
  assert.deepEqual(tradeReview.review.training_prescription, { action: "只记录，不行动。" });
  assert.equal(tradeReview.review.nextRule, "下次看见放量先停十秒");
  assert.equal(tradeReview.review.next_rule, "下次看见放量先停十秒");
  assert.deepEqual(tradeReview.review.mistakeCard, { title: "追涨旧题复现" });
  assert.deepEqual(tradeReview.review.mistake_card, { title: "追涨旧题复现" });

  const camelOnlyTradeReview = await saveTradeReviewBinding({
    user,
    review: {
      id: "tr-p1-camel-only",
      imageUrl: "/uploads/reviews/review-p1-camel.png",
      tradeDate: "2026-06-03",
      marketType: "a_share",
      timeframeKey: "1d",
      buyReason: "看到放量拉升，怕错过。",
      sellReason: "回看后发现没有按计划。",
      strongestThought: "怕错过",
      mainErrorType: "chasing",
      firstThought: "怕错过",
      triggerScene: "放量拉升",
      trainingPrescription: { action: "停十秒，写第一念。" },
      nextRule: "下次看见放量先停十秒",
      mistakeCard: { title: "追涨旧题复现" }
    },
    source: "miniprogram"
  });
  assert.equal(camelOnlyTradeReview.review.mainErrorType, "chasing");
  assert.equal(camelOnlyTradeReview.review.main_error_type, "chasing");
  assert.equal(camelOnlyTradeReview.review.firstThought, "怕错过");
  assert.equal(camelOnlyTradeReview.review.first_thought, "怕错过");
  assert.equal(camelOnlyTradeReview.review.triggerScene, "放量拉升");
  assert.equal(camelOnlyTradeReview.review.trigger_scene, "放量拉升");
  assert.deepEqual(camelOnlyTradeReview.review.trainingPrescription, { action: "停十秒，写第一念。" });
  assert.deepEqual(camelOnlyTradeReview.review.training_prescription, { action: "停十秒，写第一念。" });
  assert.equal(camelOnlyTradeReview.review.nextRule, "下次看见放量先停十秒");
  assert.equal(camelOnlyTradeReview.review.next_rule, "下次看见放量先停十秒");
  assert.deepEqual(camelOnlyTradeReview.review.mistakeCard, { title: "追涨旧题复现" });
  assert.deepEqual(camelOnlyTradeReview.review.mistake_card, { title: "追涨旧题复现" });

  const summary = await getDataBindingUserSummary(user.userId);
  const archive = await getMirrorArchiveBinding(user.userId);
  const klineArchiveItem = archive.archive_index.latest_items.find((item) => item.type === "kline_record" && item.source_id === "p1-kline-record-camel");
  assert.ok(klineArchiveItem);
  assert.equal(klineArchiveItem.id, "archive_kline_record_p1-kline-record-camel");
  assert.equal(summary.kline_records[0].execution_result, "执行偏离");
  assert.equal(summary.kline_records[0].repeat_count, 2);
  assert.equal(summary.trade_reviews[0].main_error_type, "impulse");
  assert.equal(summary.trade_reviews[0].first_thought, "又想追");

  await resetDataBindingForTests();
});

test("data binding preserves kline sampling metadata aliases without storing bars", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p8-kline-sampling-fields-001",
    maskedPhone: "137****6601",
    phoneTail: "6601",
    inviteSource: "微信小程序MVP"
  };

  const camelKline = await saveKLineRecordBinding({
    user,
    record: {
      day: 1,
      recordedAt: "2026-06-04T08:00:00.000Z",
      scene: "放量拉升",
      reaction: "怕错过",
      disciplineAction: "先观察，不立刻行动",
      trainingPackId: "pack-chasing-surge",
      segmentId: "segment-fast-rise",
      samplingResult: {
        segmentId: "segment-fast-rise",
        segment_id: "segment-fast-rise",
        trainingPackId: "pack-chasing-surge",
        training_pack_id: "pack-chasing-surge",
        errorType: "追高冲动",
        error_type: "追高冲动",
        sceneTags: ["放量拉升", "假突破"],
        scene_tags: ["放量拉升", "假突破"],
        symbol: "600000",
        name: "样例片段",
        period: "101",
        startDate: "2026-06-01",
        start_date: "2026-06-01",
        endDate: "2026-06-04",
        end_date: "2026-06-04",
        fallbackUsed: false,
        fallback_used: false,
        fallbackReason: "",
        fallback_reason: "",
        source: "segment",
        bars: [{ date: "2026-06-01", close: 10.2 }]
      },
      fallbackUsed: false,
      fallbackReason: ""
    },
    source: "miniprogram"
  });

  assert.equal(camelKline.record.trainingPackId, "pack-chasing-surge");
  assert.equal(camelKline.record.training_pack_id, "pack-chasing-surge");
  assert.equal(camelKline.record.segmentId, "segment-fast-rise");
  assert.equal(camelKline.record.segment_id, "segment-fast-rise");
  assert.equal(camelKline.record.fallbackUsed, false);
  assert.equal(camelKline.record.fallback_used, false);
  assert.equal(camelKline.record.fallbackReason, undefined);
  assert.equal(camelKline.record.fallback_reason, undefined);
  assert.equal(camelKline.record.samplingResult.segmentId, "segment-fast-rise");
  assert.equal(camelKline.record.sampling_result.segment_id, "segment-fast-rise");
  assert.equal(camelKline.record.samplingResult.trainingPackId, "pack-chasing-surge");
  assert.equal(camelKline.record.sampling_result.training_pack_id, "pack-chasing-surge");
  assert.equal(camelKline.record.samplingResult.source, "segment");
  assert.equal(camelKline.record.samplingResult.fallbackUsed, false);
  assert.equal(camelKline.record.sampling_result.fallback_used, false);
  assert.equal("bars" in camelKline.record.samplingResult, false);
  assert.equal("bars" in camelKline.record.sampling_result, false);

  const snakeKline = await saveKLineRecordBinding({
    user,
    record: {
      day: 2,
      recordedAt: "2026-06-05T08:00:00.000Z",
      scene: "弱反弹",
      reaction: "想翻本",
      disciplineAction: "先复盘旧题",
      training_pack_id: "pack-revenge-trade",
      segment_id: "segment-fallback",
      sampling_result: {
        segment_id: "segment-fallback",
        training_pack_id: "pack-revenge-trade",
        error_type: "急于翻本",
        scene_tags: ["弱反弹"],
        symbol: "000001",
        name: "fallback 样例",
        period: "101",
        start_date: "2026-06-02",
        end_date: "2026-06-05",
        fallback_used: true,
        fallback_reason: "no_enabled_segment",
        source: "fallback_catalog_slice",
        bars: [{ date: "2026-06-02", close: 8.6 }]
      },
      fallback_used: true,
      fallback_reason: "no_enabled_segment"
    },
    source: "miniprogram"
  });

  assert.equal(snakeKline.record.trainingPackId, "pack-revenge-trade");
  assert.equal(snakeKline.record.training_pack_id, "pack-revenge-trade");
  assert.equal(snakeKline.record.segmentId, "segment-fallback");
  assert.equal(snakeKline.record.segment_id, "segment-fallback");
  assert.equal(snakeKline.record.fallbackUsed, true);
  assert.equal(snakeKline.record.fallback_used, true);
  assert.equal(snakeKline.record.fallbackReason, "no_enabled_segment");
  assert.equal(snakeKline.record.fallback_reason, "no_enabled_segment");
  assert.equal(snakeKline.record.samplingResult.segmentId, "segment-fallback");
  assert.equal(snakeKline.record.sampling_result.segment_id, "segment-fallback");
  assert.equal(snakeKline.record.samplingResult.trainingPackId, "pack-revenge-trade");
  assert.equal(snakeKline.record.sampling_result.training_pack_id, "pack-revenge-trade");
  assert.equal(snakeKline.record.samplingResult.source, "fallback_catalog_slice");
  assert.equal(snakeKline.record.samplingResult.fallbackUsed, true);
  assert.equal(snakeKline.record.sampling_result.fallback_used, true);
  assert.equal("bars" in snakeKline.record.samplingResult, false);
  assert.equal("bars" in snakeKline.record.sampling_result, false);

  await saveKLineRecordBinding({
    user,
    record: {
      day: 3,
      scene: "旧记录",
      reaction: "只记录",
      disciplineAction: "保持原记录可读"
    },
    source: "miniprogram"
  });

  const summary = await getDataBindingUserSummary(user.userId);
  const camelSummary = summary.kline_records.find((record) => record.segment_id === "segment-fast-rise");
  const snakeSummary = summary.kline_records.find((record) => record.segmentId === "segment-fallback");
  const legacySummary = summary.kline_records.find((record) => record.scene === "旧记录");

  assert.equal(camelSummary.training_pack_id, "pack-chasing-surge");
  assert.equal(camelSummary.sampling_result.source, "segment");
  assert.equal(camelSummary.sampling_result.fallback_used, false);
  assert.equal("bars" in camelSummary.sampling_result, false);
  assert.equal(snakeSummary.trainingPackId, "pack-revenge-trade");
  assert.equal(snakeSummary.samplingResult.fallbackReason, "no_enabled_segment");
  assert.equal("bars" in snakeSummary.samplingResult, false);
  assert.equal(legacySummary.segmentId, undefined);
  assert.equal(legacySummary.samplingResult, undefined);

  unloadDataBindingForTests();
  const reloadedSummary = await getDataBindingUserSummary(user.userId);
  assert.equal(reloadedSummary.kline_records.find((record) => record.segment_id === "segment-fast-rise").trainingPackId, "pack-chasing-surge");
  assert.equal(reloadedSummary.kline_records.find((record) => record.segment_id === "segment-fallback").fallback_used, true);

  await resetDataBindingForTests();
});

test("data binding stores training bookmarks with aliases and stripped sampling metadata", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p8-training-bookmark-001",
    maskedPhone: "138****1133",
    phoneTail: "1133",
    inviteSource: "微信小程序MVP"
  };

  const sessionBookmark = await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmarkType: "session",
    sessionId: "session-001",
    sourceType: "custom_session",
    title: "自选盲练整局",
    note: "收藏整局，后续回放。"
  });
  const actionBookmark = await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmark_type: "action",
    session_id: "session-001",
    action_id: "action-002",
    bar_index: 7,
    source_type: "special_training",
    error_type: "追高冲动",
    scene_tags: ["放量拉升", "假突破"],
    execution_result: "执行偏离",
    segment_id: "segment-fast-rise",
    training_pack_id: "pack-chasing-surge",
    sampling_result: {
      segment_id: "segment-fast-rise",
      training_pack_id: "pack-chasing-surge",
      error_type: "追高冲动",
      scene_tags: ["放量拉升", "假突破"],
      symbol: "600000",
      name: "样例片段",
      period: "101",
      start_date: "2026-06-01",
      end_date: "2026-06-04",
      fallback_used: false,
      fallback_reason: "",
      source: "segment",
      bars: [{ date: "2026-06-01", close: 10.2 }]
    },
    symbol: "600000",
    period: "101",
    start_date: "2026-06-01",
    end_date: "2026-06-04",
    title: "第 7 根动作",
    note: "这根 K 线前，先看见怕错过。"
  });
  const mistakeCardBookmark = await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmarkType: "mistake_card",
    sessionId: "session-001",
    sourceType: "review_focus",
    errorType: "急于翻本",
    title: "错题卡收藏"
  });

  assert.equal(sessionBookmark.training_bookmark.bookmarkType, "session");
  assert.equal(sessionBookmark.training_bookmark.bookmark_type, "session");
  assert.equal(sessionBookmark.training_bookmark.sessionId, "session-001");
  assert.equal(sessionBookmark.training_bookmark.session_id, "session-001");
  assert.equal(actionBookmark.training_bookmark.bookmarkType, "action");
  assert.equal(actionBookmark.training_bookmark.bookmark_type, "action");
  assert.equal(actionBookmark.training_bookmark.actionId, "action-002");
  assert.equal(actionBookmark.training_bookmark.action_id, "action-002");
  assert.equal(actionBookmark.training_bookmark.barIndex, 7);
  assert.equal(actionBookmark.training_bookmark.bar_index, 7);
  assert.equal(actionBookmark.training_bookmark.segmentId, "segment-fast-rise");
  assert.equal(actionBookmark.training_bookmark.segment_id, "segment-fast-rise");
  assert.equal(actionBookmark.training_bookmark.trainingPackId, "pack-chasing-surge");
  assert.equal(actionBookmark.training_bookmark.training_pack_id, "pack-chasing-surge");
  assert.equal(actionBookmark.training_bookmark.samplingResult.source, "segment");
  assert.equal(actionBookmark.training_bookmark.sampling_result.source, "segment");
  assert.equal("bars" in actionBookmark.training_bookmark.samplingResult, false);
  assert.equal("bars" in actionBookmark.training_bookmark.sampling_result, false);
  assert.equal(mistakeCardBookmark.training_bookmark.bookmarkType, "mistake_card");

  const enabledList = await listTrainingBookmarkBindings(user.userId);
  assert.equal(enabledList.training_bookmarks.length, 3);
  assert.equal(enabledList.trainingBookmarks.length, 3);

  const actionList = await listTrainingBookmarkBindings(user.userId, { bookmark_type: "action" });
  assert.deepEqual(actionList.training_bookmarks.map((bookmark) => bookmark.id), [actionBookmark.training_bookmark.id]);

  const trainingPackList = await listTrainingBookmarkBindings(user.userId, { training_pack_id: "pack-chasing-surge" });
  assert.deepEqual(trainingPackList.trainingBookmarks.map((bookmark) => bookmark.id), [actionBookmark.training_bookmark.id]);

  const updated = await updateTrainingBookmarkBinding(user.userId, actionBookmark.training_bookmark.id, {
    title: "第 7 根动作复看",
    note: "先停十秒，再写下第一念。",
    enabled: false
  });
  assert.equal(updated.training_bookmark.title, "第 7 根动作复看");
  assert.equal(updated.training_bookmark.note, "先停十秒，再写下第一念。");
  assert.equal(updated.training_bookmark.enabled, false);

  const defaultAfterDisable = await listTrainingBookmarkBindings(user.userId);
  assert.equal(defaultAfterDisable.training_bookmarks.length, 2);

  const includeDisabled = await listTrainingBookmarkBindings(user.userId, { include_disabled: true });
  assert.equal(includeDisabled.training_bookmarks.length, 3);

  const deleted = await deleteTrainingBookmarkBinding(user.userId, mistakeCardBookmark.training_bookmark.id);
  assert.equal(deleted.training_bookmark.enabled, false);

  const summary = await getDataBindingUserSummary(user.userId);
  assert.equal(summary.training_bookmarks.length, 3);
  assert.equal(summary.trainingBookmarks.length, 3);
  assert.equal(summary.training_bookmarks.find((bookmark) => bookmark.id === sessionBookmark.training_bookmark.id).segmentId, undefined);
  assert.equal(summary.training_bookmarks.find((bookmark) => bookmark.id === actionBookmark.training_bookmark.id).sampling_result.source, "segment");
  assert.equal("bars" in summary.training_bookmarks.find((bookmark) => bookmark.id === actionBookmark.training_bookmark.id).sampling_result, false);

  unloadDataBindingForTests();
  const reloadedSummary = await getDataBindingUserSummary(user.userId);
  assert.equal(reloadedSummary.training_bookmarks.length, 3);
  assert.equal(reloadedSummary.training_bookmarks.find((bookmark) => bookmark.id === actionBookmark.training_bookmark.id).trainingPackId, "pack-chasing-surge");
  assert.equal(reloadedSummary.training_bookmarks.find((bookmark) => bookmark.id === mistakeCardBookmark.training_bookmark.id).enabled, false);

  await resetDataBindingForTests();
});

function makeReport({ createdAt, primary, secondary, impulse, holding }) {
  const primaryPersonality = {
    type: primary,
    label: primary,
    summary: "看见第一念后，先回到计划与复盘。",
    score: impulse
  };
  const secondaryPersonality = {
    type: secondary,
    label: secondary,
    summary: "压力下可能出现的副反应。",
    score: holding
  };

  return {
    schemaVersion: "assessment_report_v1",
    reportId: `RPT-${createdAt.replace(/\D/g, "").slice(0, 12)}-${primary}`,
    userId: "web-local-001",
    createdAt,
    conclusion: "你最容易被第一念牵动，训练重点是停十秒、记录念头、再复盘。",
    primaryPersonality,
    secondaryPersonality,
    totalQuestions: 12,
    answeredCount: 12,
    primaryType: {
      key: primary,
      label: primary,
      summary: "看见第一念后，先回到计划与复盘。",
      training: "停十秒，记录念头，再复盘。"
    },
    secondaryType: {
      key: secondary,
      label: secondary,
      summary: "",
      training: ""
    },
    scores: {},
    riskRadar: [
      { key: "impulse", label: "冲动追入", value: impulse, description: "看到快速波动时容易先动手。" },
      { key: "holding", label: "扛单拖延", value: holding, description: "条件失效后容易把边界往后挪。" }
    ],
    emotionalTriggers: [
      {
        key: "fear_missing_out",
        label: "怕错过",
        description: "看到快速波动时先记录第一念。",
        firstThought: "再不上就错过了。"
      }
    ],
    trainingPrescription7Days: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      theme: `第 ${index + 1} 日事上练`,
      action: "停十秒，记录念头，再复盘。",
      reflectionPrompt: "今天看见了哪一念？"
    })),
    campSuggestion: {
      name: `${primary}七日知行训练`,
      reason: "根据主反应推荐七日训练路径。",
      focus: "照见第一念、记录触发、复盘动作。"
    },
    complianceNotice: "本报告用于交易心理觉察，不构成投资建议",
    metadata: {
      source: "test",
      assessmentVersion: "unit",
      scoringVersion: "unit",
      contentVersion: "unit"
    },
    firstThought: "再不上就错过了。",
    firstThoughtDisplay: "怕错过",
    trainingDirection: "停十秒，记录念头，再复盘。",
    disclaimer: "本报告用于交易心理觉察，不构成投资建议。"
  };
}
