const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  COMPLIANCE_NOTICE,
  buildAssessmentBindingPayload,
  buildRetestBindingPayload,
  shouldSyncRetest,
  buildTrainingBindingPayload,
  buildKLineBindingPayload,
  buildTradeReviewBindingPayload,
  buildShareCardBindingPayload
} = require("./data-binding-adapter");

const auth = {
  user: {
    id: "mp-user-001",
    display_name: "测试同修"
  },
  access_token: "test-token"
};

const state = {
  profile: {
    nickname: "测试同修",
    phone: "13812345678",
    phoneMask: "138****5678",
    inviteSource: "ZX567877"
  },
  user_binding: {
    userId: "phone_13812345678",
    userIdDisplay: "phone_138****5678",
    phone: "13812345678",
    phoneMask: "138****5678",
    inviteSource: "ZX567877",
    inviteCode: "ZX567877"
  },
  assessment_result: {
    primary: "冲动型",
    secondary: "焦虑型",
    intensity: 72,
    ranked: [
      { type: "冲动型", score: 9.2 },
      { type: "焦虑型", score: 6.8 }
    ],
    trigger: "盘面突然变快时，心里出现想立刻行动的念头。",
    createdAt: 1764547200000
  },
  assessment_history: [
    {
      primary: "焦虑型",
      secondary: "拖延型",
      intensity: 64,
      savedAt: 1763942400000
    },
    {
      primary: "冲动型",
      secondary: "焦虑型",
      intensity: 72,
      savedAt: 1764547200000
    }
  ],
  assessment_answers: [3, 1, 0, 2, 1, 0, 1, 2, 2],
  retest_snapshots: {
    baseline: {
      riskRadar: {
        entryImpulse: 80,
        stopResistance: 66,
        proving: 70,
        execution: 52,
        stability: 48
      }
    },
    retest: {
      riskRadar: {
        entryImpulse: 68,
        stopResistance: 60,
        proving: 62,
        execution: 61,
        stability: 57
      }
    }
  },
  training7_state: {
    currentDay: 3,
    records: {
      1: {
        day: 1,
        dateKey: "2026-06-01",
        tasks: {
          opening_check: true,
          intraday_boundary: true,
          reaction_record: true,
          daily_practice: true,
          closing_review: true
        },
        completed: true,
        reflection: "今天先看见了急念，再记录边界。",
        updatedAt: 1764547200000
      }
    }
  },
  intraday_boundary_records: {
    "2026-06-01": {
      date: "2026-06-01",
      trigger: "看到波动加快",
      firstReaction: "想立刻行动",
      boundary: "先停十秒，再写下理由与边界。",
      completed: true,
      updatedAt: 1764547200000
    }
  },
  kline_mind_records: {
    "2026-06-01": {
      date: "2026-06-01",
      day: 1,
      sourceType: "kline_training",
      errorType: "chasing",
      sceneTags: ["急拉", "边界触碰"],
      trainingPrescription: {
        action: "停十秒，写下边界。"
      },
      executionResult: "执行偏离",
      repeatCount: 2,
      trainingMistakeCard: {
        title: "急拉旧题"
      },
      scenarioTitle: "边界触碰",
      firstReaction: "急躁",
      boundaryChoice: "停十秒",
      insightLine: "我看见自己想用行动缓解不安。",
      completed: true,
      updatedAt: 1764547300000
    }
  },
  share_cards: {
    latest: {
      id: "share-001",
      type: "personality",
      inviteCode: "ZX567877",
      createdAt: 1764547200000
    },
    records: {}
  },
  trade_review_records: {
    latest: {
      id: "tr-local-001",
      screenshotPath: "wxfile://review-001.png",
      tradeDate: "2026-06-01",
      marketKey: "cn",
      symbol: "600519",
      entryReason: "看到波动变快，心里怕错过。",
      exitReason: "回看后发现边界没有提前写清。",
      firstThought: "怕错过",
      inPlan: "no",
      changedPlan: "yes",
      exitPrepared: "no",
      relatedMirror: "追涨之镜",
      heartThieves: ["贪", "急"],
      mainErrorType: "chasing",
      triggerScene: "急拉时怕错过",
      trainingPrescription: {
        action: "停十秒，写第一念。"
      },
      nextRule: "下次先写边界",
      mistakeCard: {
        title: "怕错过错题卡"
      },
      actionLabel: "计划外动作",
      emotion: "急躁",
      verdict: "这次复盘照见的是怕错过带动动作。",
      nextAction: "边界前停十秒，先写第一念。",
      ocrDraft: {
        status: "provider_not_configured",
        needsUserConfirmation: true
      },
      createdAt: 1764547400000
    },
    records: []
  }
};

const assessmentPayload = buildAssessmentBindingPayload({ auth, state });
assert.strictEqual(assessmentPayload.source, "miniprogram");
assert.strictEqual(assessmentPayload.user.userId, "phone_13812345678");
assert.strictEqual(assessmentPayload.user.maskedPhone, "138****5678");
assert.strictEqual(assessmentPayload.report.schemaVersion, "assessment_report_v1");
assert.strictEqual(assessmentPayload.report.primaryType.label, "冲动型");
assert.strictEqual(assessmentPayload.report.secondaryType.label, "焦虑型");
assert.strictEqual(assessmentPayload.report.complianceNotice, COMPLIANCE_NOTICE);
assert.strictEqual(assessmentPayload.report.trainingPrescription7Days.length, 7);
assert.strictEqual(assessmentPayload.answers.length, 9);
assert.ok(assessmentPayload.report.riskRadar.length >= 5);

assert.strictEqual(shouldSyncRetest(state), true);
const retestPayload = buildRetestBindingPayload({ auth, state });
assert.strictEqual(retestPayload.comparison.length, 5);
assert.strictEqual(retestPayload.comparison[0].key, "entryImpulse");
assert.strictEqual(retestPayload.comparison[0].delta, -12);

const trainingPayload = buildTrainingBindingPayload({ auth, state });
assert.ok(trainingPayload);
assert.strictEqual(trainingPayload.record.day, 1);
assert.strictEqual(trainingPayload.record.status, "completed");
assert.ok(trainingPayload.record.actions.includes("开盘照心"));
assert.ok(trainingPayload.record.cultivationText.includes("急念"));

const klinePayload = buildKLineBindingPayload({
  auth,
  state,
  progress: trainingPayload.practiceState,
  trainingRecord: trainingPayload.record
});
assert.ok(klinePayload);
assert.strictEqual(klinePayload.record.day, 1);
assert.ok(klinePayload.record.scene.includes("边界触碰"));
assert.strictEqual(klinePayload.record.reaction, "急躁");
assert.strictEqual(klinePayload.record.disciplineAction, "停十秒");
assert.strictEqual(klinePayload.record.sourceType, "kline_training");
assert.strictEqual(klinePayload.record.source_type, "kline_training");
assert.strictEqual(klinePayload.record.errorType, "chasing");
assert.strictEqual(klinePayload.record.error_type, "chasing");
assert.deepStrictEqual(klinePayload.record.sceneTags, ["急拉", "边界触碰"]);
assert.deepStrictEqual(klinePayload.record.scene_tags, ["急拉", "边界触碰"]);
assert.deepStrictEqual(klinePayload.record.trainingPrescription, { action: "停十秒，写下边界。" });
assert.deepStrictEqual(klinePayload.record.training_prescription, { action: "停十秒，写下边界。" });
assert.strictEqual(klinePayload.record.executionResult, "执行偏离");
assert.strictEqual(klinePayload.record.execution_result, "执行偏离");
assert.strictEqual(klinePayload.record.repeatCount, 2);
assert.strictEqual(klinePayload.record.repeat_count, 2);
assert.deepStrictEqual(klinePayload.record.trainingMistakeCard, { title: "急拉旧题" });
assert.deepStrictEqual(klinePayload.record.training_mistake_card, { title: "急拉旧题" });

const tradeReviewPayload = buildTradeReviewBindingPayload({ auth, state });
assert.ok(tradeReviewPayload);
assert.strictEqual(tradeReviewPayload.user.userId, "phone_13812345678");
assert.strictEqual(tradeReviewPayload.review.id, "tr-local-001");
assert.strictEqual(tradeReviewPayload.review.marketType, "a_share");
assert.strictEqual(tradeReviewPayload.review.symbol, "600519");
assert.strictEqual(tradeReviewPayload.review.timeframeKey, "1d");
assert.strictEqual(tradeReviewPayload.review.detectedMirror, "追涨之镜");
assert.deepStrictEqual(tradeReviewPayload.review.detectedThieves, ["贪", "急"]);
assert.strictEqual(tradeReviewPayload.review.wasPlanned, false);
assert.strictEqual(tradeReviewPayload.review.hadExitRule, false);
assert.strictEqual(tradeReviewPayload.review.changedPlanDuringTrade, true);
assert.strictEqual(tradeReviewPayload.review.ocrDraft.status, "provider_not_configured");
assert.strictEqual(tradeReviewPayload.review.mainErrorType, "chasing");
assert.strictEqual(tradeReviewPayload.review.main_error_type, "chasing");
assert.strictEqual(tradeReviewPayload.review.firstThought, "怕错过");
assert.strictEqual(tradeReviewPayload.review.first_thought, "怕错过");
assert.strictEqual(tradeReviewPayload.review.triggerScene, "急拉时怕错过");
assert.strictEqual(tradeReviewPayload.review.trigger_scene, "急拉时怕错过");
assert.deepStrictEqual(tradeReviewPayload.review.trainingPrescription, { action: "停十秒，写第一念。" });
assert.deepStrictEqual(tradeReviewPayload.review.training_prescription, { action: "停十秒，写第一念。" });
assert.strictEqual(tradeReviewPayload.review.nextRule, "下次先写边界");
assert.strictEqual(tradeReviewPayload.review.next_rule, "下次先写边界");
assert.deepStrictEqual(tradeReviewPayload.review.mistakeCard, { title: "怕错过错题卡" });
assert.deepStrictEqual(tradeReviewPayload.review.mistake_card, { title: "怕错过错题卡" });

const snakeOnlyTradeReviewPayload = buildTradeReviewBindingPayload({
  auth,
  state: Object.assign({}, state, {
    trade_review_records: {
      latest: {
        id: "tr-snake-001",
        trade_date: "2026-06-02",
        market_type: "cn",
        first_thought: "又想追",
        main_error_type: "impulse",
        trigger_scene: "放量突破",
        training_prescription: { action: "只记录，不行动。" },
        next_rule: "下次看见放量先停十秒",
        mistake_card: { title: "追涨旧题复现" },
        createdAt: 1764547500000
      },
      records: []
    }
  })
});
assert.strictEqual(snakeOnlyTradeReviewPayload.review.mainErrorType, "impulse");
assert.strictEqual(snakeOnlyTradeReviewPayload.review.main_error_type, "impulse");
assert.strictEqual(snakeOnlyTradeReviewPayload.review.firstThought, "又想追");
assert.strictEqual(snakeOnlyTradeReviewPayload.review.first_thought, "又想追");
assert.deepStrictEqual(snakeOnlyTradeReviewPayload.review.trainingPrescription, { action: "只记录，不行动。" });
assert.deepStrictEqual(snakeOnlyTradeReviewPayload.review.training_prescription, { action: "只记录，不行动。" });

const snakeOnlyKlinePayload = buildKLineBindingPayload({
  auth,
  state: Object.assign({}, state, {
    intraday_boundary_records: {},
    kline_mind_records: {
      "2026-06-02": {
        date: "2026-06-02",
        day: 2,
        source_type: "kline_training",
        error_type: "hesitation",
        scene_tags: ["横盘", "犹疑"],
        training_prescription: { action: "固定观察窗口。" },
        execution_result: "按计划执行",
        repeat_count: 3,
        training_mistake_card: { title: "犹疑旧题" },
        scenarioTitle: "横盘犹疑",
        firstReaction: "想等确认",
        boundaryChoice: "固定观察窗口",
        updatedAt: 1764547600000
      }
    }
  })
});
assert.strictEqual(snakeOnlyKlinePayload.record.errorType, "hesitation");
assert.strictEqual(snakeOnlyKlinePayload.record.error_type, "hesitation");
assert.deepStrictEqual(snakeOnlyKlinePayload.record.sceneTags, ["横盘", "犹疑"]);
assert.deepStrictEqual(snakeOnlyKlinePayload.record.scene_tags, ["横盘", "犹疑"]);
assert.strictEqual(snakeOnlyKlinePayload.record.executionResult, "按计划执行");
assert.strictEqual(snakeOnlyKlinePayload.record.execution_result, "按计划执行");
assert.strictEqual(snakeOnlyKlinePayload.record.repeatCount, 3);
assert.strictEqual(snakeOnlyKlinePayload.record.repeat_count, 3);

const sharePayload = buildShareCardBindingPayload({
  auth,
  state,
  event: { shareCardType: "personality", inviteCode: "ZX567877" }
});
assert.strictEqual(sharePayload.channel, "ZX567877");
assert.strictEqual(sharePayload.source_channel, "微信小程序MVP");

const localIdentityPayload = buildShareCardBindingPayload({
  auth: {},
  state,
  event: { shareCardType: "daily_mantra" }
});
assert.strictEqual(localIdentityPayload.user.userId, "phone_13812345678");
assert.strictEqual(localIdentityPayload.user.maskedPhone, "138****5678");

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];
const serialized = JSON.stringify({ assessmentPayload, retestPayload, trainingPayload, klinePayload, tradeReviewPayload, sharePayload });
forbiddenPhrases.forEach((phrase) => {
  assert.strictEqual(serialized.includes(phrase), false, `payload should not include ${phrase}`);
});

const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");
assert.ok(apiSource.includes("/api/v1/data-binding/assessment-report"));
assert.ok(apiSource.includes("/api/v1/data-binding/users/"));
assert.ok(apiSource.includes("/trade-reviews"));
assert.ok(apiSource.includes("/trade-review-ocr"));
assert.ok(apiSource.includes("/training-prescription"));
assert.ok(apiSource.includes("pullTrainingPrescription"));
assert.strictEqual(apiSource.includes("/assessment-report`"), false);
assert.strictEqual(apiSource.includes("/training-progress`"), false);
assert.strictEqual(apiSource.includes("/share-attribution`"), false);

console.log("miniprogram data-binding adapter tests passed");
