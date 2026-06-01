import assert from "node:assert/strict";
import test from "node:test";

import {
  generateShareCardBinding,
  getDataBindingUserSummary,
  getInviteSourceStatsBinding,
  getRetestComparisonBinding,
  getShareCardBinding,
  listAdminUsersFromBindings,
  resetDataBindingForTests,
  saveAssessmentReportBinding,
  saveKLineRecordBinding,
  saveRetestResultBinding,
  saveTradeReviewBinding,
  saveTrainingRecordBinding,
  syncAssistantSummaryToFeishuBinding,
  unloadDataBindingForTests,
  updateAssistantHandoffBinding
} from "../src/services/dataBinding.js";

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
      symbol: "600519",
      marketType: "a_share",
      buyReason: "看到快速拉升，担心错过机会。",
      sellReason: "回看后发现当时没有写清边界。",
      strongestThought: "怕错过",
      behaviorTags: ["截图复盘"]
    },
    source: "web-next"
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

  const summary = await getDataBindingUserSummary(user.userId);
  const aliasSummary = await getDataBindingUserSummary("web-local-merge-001");
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
  assert.equal(kline.record.scene, "急拉");
  assert.equal(kline.record.reaction_key, "fear_missing");
  assert.equal(kline.record.feedback, "今天先练写下进场理由。");
  assert.equal(kline.record.reaction_time_ms, 2400);
  assert.equal(kline.record.process_scores.planExecution, 58);
  assert.equal(kline.record.process_insight, "你已经看见第一念，下一步是让手慢半拍。");
  assert.equal(tradeReview.review.detectedMirror, "追涨之镜");
  assert.equal(tradeReview.review.symbolMasked, "****19");
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
  assert.equal(summary.training_records.length, 2);
  assert.equal(aliasSummary.user.id, user.userId);
  assert.equal(aliasSummary.training_records.length, 2);
  assert.equal(summary.kline_records.length, 1);
  assert.equal(summary.trade_reviews.length, 1);
  assert.equal(summary.mirror_report.mainMirror, "追涨之镜");
  assert.equal(summary.mirror_report.schemaVersion, "living_mirror_v1");
  assert.equal(summary.living_mirror_stats.schemaVersion, "living_mirror_v1");
  assert.equal(summary.mirror_archive.tradeReviews.length, 1);
  assert.equal(summary.admin_user.tradeReviews[0].detectedMirror, "追涨之镜");
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
  assert.equal(reloadedSummary.training_records.length, 2);
  assert.equal(reloadedSummary.kline_records.length, 1);
  assert.equal(reloadedSummary.trade_reviews.length, 1);
  assert.equal(reloadedSummary.living_mirror_stats.loopRelapseCount, 1);
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
