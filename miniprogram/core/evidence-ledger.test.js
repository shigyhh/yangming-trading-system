const assert = require("assert");
const {
  upsertEvidence,
  buildEvidenceSummary,
  formatRiskLevel
} = require("./evidence-ledger");
const {
  buildJourneyState,
  buildCompletionState,
  buildClosureEvidenceChainView,
  buildUnifiedJourneyView,
  resolveJourneyPagePath,
  readTodayJourney,
  saveTodayJourney,
  syncTodayJourney
} = require("./journey-state");

const day = "2026-06-02";
let ledger = { records: [] };

ledger = upsertEvidence(ledger, {
  type: "mind_report",
  day,
  personality: "冲动型",
  heartThief: "贪",
  action: "生成心镜报告",
  reflection: "照见第一念",
  sourcePage: "assessment",
  sourceId: "report-1"
});

let state = buildJourneyState({ ledger, day, hasReport: true, completedDays: 0 });
assert.strictEqual(state.currentStep, "mind_report_ready");
assert.strictEqual(state.nextActionText, "进入今日修行");
assert.strictEqual(state.nextPage, "daily-practice");

ledger = upsertEvidence(ledger, { type: "daily_checkin", day, action: "完成今日签到", sourceId: "daily_checkin" });
ledger = upsertEvidence(ledger, { type: "daily_concept", day, action: "写下今日一念", reflection: "怕错过", sourceId: "daily_concept" });

state = buildJourneyState({ ledger, day, hasReport: true, completedDays: 0 });
assert.strictEqual(state.currentStep, "daily_concept_done");
assert.strictEqual(state.progressLabel, "今日修行 2/3");

ledger = upsertEvidence(ledger, {
  type: "daily_seal",
  day,
  action: "追涨前停十秒",
  reflection: "怕错过",
  zhixingChange: 3,
  sourceId: "daily_seal"
});

const sealedOnlyCompletion = buildCompletionState({ ledger, day, completedDays: 1 });
assert.strictEqual(sealedOnlyCompletion.done, true);
assert.strictEqual(sealedOnlyCompletion.heartProofCount, 0);
assert.strictEqual(sealedOnlyCompletion.heartProofText, "今日之印已落下，心证卡待生成");
assert.strictEqual(sealedOnlyCompletion.sealText, "志 · 止 · 照");

ledger = upsertEvidence(ledger, {
  type: "heart_proof_card",
  day,
  action: "生成今日心证",
  reflection: "我今天照见的是：怕错过。",
  sourceId: "hp-1",
  archived: true
});

const completion = buildCompletionState({ ledger, day, completedDays: 1 });
assert.strictEqual(completion.done, true);
assert.strictEqual(completion.thought, "怕错过");
assert.strictEqual(completion.boundary, "追涨前停十秒");
assert.strictEqual(completion.zhixingChangeText, "+3");
assert.strictEqual(completion.retestText, "距离七日复测还差 6 日");
assert.strictEqual(completion.heartProofText, "已生成第 1 枚心证");
assert.deepStrictEqual(completion.actions.map((item) => item.text), ["查看今日心证卡", "存入活镜档案", "邀请一位同修同行"]);

let closureChain = buildClosureEvidenceChainView({ ledger, day, completedDays: 1 });
assert.strictEqual(closureChain.steps.length, 6);
assert.strictEqual(closureChain.steps[0].title, "我照见了一念");
assert.strictEqual(closureChain.steps[0].done, true);
assert.strictEqual(closureChain.steps[1].title, "我做了一次真实复盘");
assert.strictEqual(closureChain.steps[1].current, true);
assert.strictEqual(closureChain.steps[4].title, "我的心证已存入活镜档案");
assert.strictEqual(closureChain.steps[4].done, true);
assert.strictEqual(closureChain.steps[5].statusText, "还差 6 日");
assert.strictEqual(closureChain.nextActionText, "做一次真实复盘");

const reviewLedger = upsertEvidence(ledger, {
  type: "review_record",
  day,
  action: "完成真实复盘",
  reflection: "怕错过",
  sourcePage: "trade_review",
  sourceId: "review-1"
});
closureChain = buildClosureEvidenceChainView({ ledger: reviewLedger, day, completedDays: 7 });
assert.strictEqual(closureChain.steps[1].done, true);
assert.strictEqual(closureChain.steps[5].current, true);
assert.strictEqual(closureChain.steps[5].statusText, "可复测");
assert.strictEqual(closureChain.nextActionText, "开始复测");

const unified = buildUnifiedJourneyView({
  ledger,
  day,
  hasReport: true,
  completedDays: 1,
  dailyContent: { dayNumber: 153, stageName: "事上磨" },
  training7View: {
    currentDay: 3,
    today: { day: 3, title: "观亏损后的证明欲" },
    days: [
      { day: 1, title: "观入场冲动" },
      { day: 2, title: "观止损抗拒" },
      { day: 3, title: "观亏损后的证明欲" }
    ]
  }
});
assert.strictEqual(unified.stateLabel, "待复盘");
assert.strictEqual(unified.sevenDayText, "七日复测：1 / 7");
assert.strictEqual(unified.sevenDayProgress, "1 / 7");
assert.strictEqual(unified.sevenDayProgressPercent, 14);
assert.strictEqual(unified.dailyPracticeDay, "Day 2");
assert.strictEqual(unified.annualPracticeDay, "153 / 365");
assert.strictEqual(unified.todaySealProgress, "3 / 3");
assert.strictEqual(unified.todayReviewDone, false);
assert.strictEqual(unified.todayThreeSealsDone, true);
assert.strictEqual(unified.todayHeartCardGenerated, true);
assert.strictEqual(unified.todayArchived, true);
assert.strictEqual(unified.closureEvidenceChain.steps[1].current, true);
assert.strictEqual(unified.yearlySubtitle, "全年修行：153 / 365");
assert.strictEqual(unified.dayText, "今日训练：Day 2 · 全年修行：153 / 365");
assert.strictEqual(unified.currentTrainingText, "今日训练：Day 2");
assert.strictEqual(unified.currentTrainingTitle, "观止损抗拒");

const unifiedWithReview = buildUnifiedJourneyView({
  ledger: reviewLedger,
  day,
  hasReport: true,
  completedDays: 1,
  dailyContent: { dayNumber: 153, stageName: "事上磨" }
});
assert.strictEqual(unifiedWithReview.todayReviewDone, true);

state = buildJourneyState({ ledger, day, hasReport: true, completedDays: 1 });
assert.strictEqual(state.currentStep, "archived");
assert.strictEqual(state.nextActionText, "进入心镜长卷");
assert.strictEqual(resolveJourneyPagePath(state.nextPage), "/pages/living-mirror/index");

state = buildJourneyState({ ledger, day, hasReport: true, completedDays: 7 });
assert.strictEqual(state.currentStep, "seven_day_retest_pending");
assert.strictEqual(state.nextActionText, "开始复测");
assert.strictEqual(resolveJourneyPagePath(state.nextPage), "/pages/assessment/index");

const summary = buildEvidenceSummary(ledger, { day });
assert.strictEqual(summary.heartProofCount, 1);
assert.strictEqual(summary.todayTotal, 5);
assert.ok(summary.rows[0].typeLabel);

assert.strictEqual(formatRiskLevel(80), "明显 · 80");
assert.strictEqual(formatRiskLevel(12, { hideLowScore: true }), "较低");

const emptyUnified = buildUnifiedJourneyView({
  ledger: { records: [] },
  day,
  hasReport: false,
  dailyContent: { dayNumber: 153 }
});
assert.strictEqual(emptyUnified.stateLabel, "未照见");
assert.strictEqual(emptyUnified.yearlySubtitle, "全年修行：153 / 365");
assert.strictEqual(emptyUnified.todaySealProgress, "0 / 3");
assert.strictEqual(emptyUnified.retestText, "距离七日复测还差 7 日");

const storage = {};
global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  }
};
saveTodayJourney({ lastPage: "mirror-scroll", pendingAction: "等待七日复测" }, day);
syncTodayJourney({ ledger, day, hasReport: true, completedDays: 1, lastPage: "home" });
assert.strictEqual(readTodayJourney(day).lastPage, "mirror-scroll");
delete global.wx;

console.log("evidence-ledger journey-state tests passed");
