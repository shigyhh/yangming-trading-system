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
  }
};

const assessmentPayload = buildAssessmentBindingPayload({ auth, state });
assert.strictEqual(assessmentPayload.source, "miniprogram");
assert.strictEqual(assessmentPayload.user.userId, "mp-user-001");
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

const sharePayload = buildShareCardBindingPayload({
  auth,
  state,
  event: { shareCardType: "personality", inviteCode: "ZX567877" }
});
assert.strictEqual(sharePayload.channel, "ZX567877");
assert.strictEqual(sharePayload.source_channel, "微信小程序MVP");

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];
const serialized = JSON.stringify({ assessmentPayload, retestPayload, trainingPayload, klinePayload, sharePayload });
forbiddenPhrases.forEach((phrase) => {
  assert.strictEqual(serialized.includes(phrase), false, `payload should not include ${phrase}`);
});

const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");
assert.ok(apiSource.includes("/api/v1/data-binding/assessment-report"));
assert.ok(apiSource.includes("/api/v1/data-binding/users/"));
assert.strictEqual(apiSource.includes("/assessment-report`"), false);
assert.strictEqual(apiSource.includes("/training-progress`"), false);
assert.strictEqual(apiSource.includes("/share-attribution`"), false);

console.log("miniprogram data-binding adapter tests passed");
