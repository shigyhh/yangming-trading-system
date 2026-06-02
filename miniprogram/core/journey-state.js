const {
  buildEvidenceSummary,
  hasEvidence,
  listEvidence,
  todayKey
} = require("./evidence-ledger");
const { YM_JOURNEY_STATE } = require("./storage-keys");

const JOURNEY_STATES = [
  "new_user",
  "mind_check_started",
  "mind_report_ready",
  "daily_practice_started",
  "daily_checkin_done",
  "daily_concept_done",
  "daily_seal_done",
  "heart_proof_generated",
  "archived",
  "share_ready",
  "seven_day_retest_pending"
];

const STEP_META = {
  new_user: {
    title: "先入照心",
    nextActionText: "开始照心",
    nextPage: "assessment",
    progressLabel: "照见未开始"
  },
  mind_check_started: {
    title: "照心未完成",
    nextActionText: "继续照心",
    nextPage: "assessment",
    progressLabel: "照心进行中"
  },
  mind_report_ready: {
    title: "今天只修这一念",
    nextActionText: "进入今日修行",
    nextPage: "daily-practice",
    progressLabel: "报告已生成"
  },
  daily_practice_started: {
    title: "今日修行已开启",
    nextActionText: "完成今日签到",
    nextPage: "daily-practice",
    progressLabel: "今日修行 0/3"
  },
  daily_checkin_done: {
    title: "今日修行尚未落印",
    nextActionText: "继续观念",
    nextPage: "daily-practice",
    progressLabel: "今日修行 1/3"
  },
  daily_concept_done: {
    title: "今日修行尚未落印",
    nextActionText: "继续落印",
    nextPage: "daily-practice",
    progressLabel: "今日修行 2/3"
  },
  daily_seal_done: {
    title: "今日已落印",
    nextActionText: "生成今日心证",
    nextPage: "share-card",
    progressLabel: "今日修行 3/3"
  },
  heart_proof_generated: {
    title: "今日心证已生成",
    nextActionText: "存入活镜档案",
    nextPage: "mirror-archive",
    progressLabel: "心证待归档"
  },
  archived: {
    title: "今日已落印",
    nextActionText: "进入心镜长卷",
    nextPage: "mirror-scroll",
    progressLabel: "证据已入档"
  },
  share_ready: {
    title: "今日已落印",
    nextActionText: "进入心镜长卷",
    nextPage: "mirror-scroll",
    progressLabel: "今日闭环已完成"
  },
  seven_day_retest_pending: {
    title: "七日已满，可以复测",
    nextActionText: "开始复测",
    nextPage: "assessment",
    progressLabel: "等待七日复测"
  }
};

const PAGE_PATHS = {
  assessment: "/pages/assessment/index",
  report: "/pages/report/index",
  "daily-practice": "/pages/home/index",
  "share-card": "/pages/share-card/index?type=daily_mantra&sourceScene=journey_state",
  "mirror-archive": "/pages/trade-review-archive/index",
  "mirror-scroll": "/pages/living-mirror/index"
};

function safeNow() {
  return Date.now();
}

function safeReadStorage(key, fallback) {
  try {
    if (typeof wx === "undefined" || !wx.getStorageSync) return fallback;
    return wx.getStorageSync(key) || fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    if (typeof wx !== "undefined" && wx.setStorageSync) wx.setStorageSync(key, value);
  } catch (error) {}
  return value;
}

function readTodayJourney(day = todayKey()) {
  const state = safeReadStorage(YM_JOURNEY_STATE, { todayJourney: {}, history: {}, updatedAt: null });
  const todayJourney = (state.history || {})[day] || state.todayJourney || {};
  return normalizeTodayJourney(todayJourney, day);
}

function saveTodayJourney(patch = {}, day = todayKey()) {
  const state = safeReadStorage(YM_JOURNEY_STATE, { todayJourney: {}, history: {}, updatedAt: null });
  const history = Object.assign({}, state.history || {});
  const current = normalizeTodayJourney(history[day] || state.todayJourney || {}, day);
  const nextJourney = normalizeTodayJourney(Object.assign({}, current, patch || {}, {
    day,
    updatedAt: safeNow()
  }), day);
  history[day] = nextJourney;
  return safeWriteStorage(YM_JOURNEY_STATE, {
    todayJourney: nextJourney,
    history,
    updatedAt: safeNow()
  });
}

function normalizeTodayJourney(value = {}, day = todayKey()) {
  return {
    day,
    step: JOURNEY_STATES.includes(value.step) ? value.step : "new_user",
    completedSteps: Array.isArray(value.completedSteps) ? value.completedSteps.filter((item) => JOURNEY_STATES.includes(item)) : [],
    lastPage: value.lastPage || "",
    pendingAction: value.pendingAction || "",
    updatedAt: value.updatedAt || null
  };
}

function resolveJourneyPagePath(nextPage) {
  return PAGE_PATHS[nextPage] || PAGE_PATHS["daily-practice"];
}

function getDailyDoneCount(ledger, day) {
  return ["daily_checkin", "daily_concept", "daily_seal"].filter((type) => hasEvidence(type, day, ledger)).length;
}

function getCompletedSteps(input = {}, ledger, day) {
  const completed = [];
  const records = listEvidence(ledger);
  const hasReport = !!input.hasReport || hasEvidence("mind_report", "", ledger);
  const checkin = hasEvidence("daily_checkin", day, ledger);
  const concept = hasEvidence("daily_concept", day, ledger);
  const seal = hasEvidence("daily_seal", day, ledger);
  const proofRecord = records.find((item) => item.type === "heart_proof_card" && item.day === day) || null;
  const proof = !!proofRecord;
  const archived = !!((proofRecord || {}).archived || input.archived);
  const share = hasEvidence("share_card", day, ledger);
  const retest = hasEvidence("seven_day_retest", "", ledger) || !!input.hasRetest;

  if (hasReport) completed.push("mind_report_ready");
  if (checkin || concept || seal) completed.push("daily_practice_started");
  if (checkin) completed.push("daily_checkin_done");
  if (concept) completed.push("daily_concept_done");
  if (seal) completed.push("daily_seal_done");
  if (proof) completed.push("heart_proof_generated");
  if (archived) completed.push("archived");
  if (share) completed.push("share_ready");
  if (retest) completed.push("seven_day_retest_pending");
  return completed;
}

function pickCurrentStep(input = {}, ledger, day) {
  const records = listEvidence(ledger);
  const hasReport = !!input.hasReport || hasEvidence("mind_report", "", ledger);
  const mindStarted = !!input.mindCheckStarted;
  const checkin = hasEvidence("daily_checkin", day, ledger);
  const concept = hasEvidence("daily_concept", day, ledger);
  const seal = hasEvidence("daily_seal", day, ledger);
  const proofRecord = records.find((item) => item.type === "heart_proof_card" && item.day === day) || null;
  const proof = !!proofRecord;
  const archived = !!((proofRecord || {}).archived || input.archived);
  const share = hasEvidence("share_card", day, ledger);
  const retestDone = hasEvidence("seven_day_retest", "", ledger) || !!input.hasRetest;
  const completedDays = Number(input.completedDays || 0);

  if (completedDays >= 7 && !retestDone) return "seven_day_retest_pending";
  if (!hasReport && mindStarted) return "mind_check_started";
  if (!hasReport) return "new_user";
  if (!checkin && !concept && !seal && !proof) return "mind_report_ready";
  if (!checkin && (concept || seal)) return "daily_practice_started";
  if (checkin && !concept) return "daily_checkin_done";
  if (concept && !seal) return "daily_concept_done";
  if (seal && !proof) return "daily_seal_done";
  if (proof && !archived) return "heart_proof_generated";
  if (proof && archived && !share) return "archived";
  return "share_ready";
}

function buildJourneyState(input = {}) {
  const day = input.day || todayKey();
  const ledger = input.ledger || { records: [] };
  const currentStep = pickCurrentStep(input, ledger, day);
  const meta = STEP_META[currentStep] || STEP_META.new_user;
  const completedSteps = Array.from(new Set([
    ...getCompletedSteps(input, ledger, day),
    ...((input.todayJourney || {}).completedSteps || [])
  ]));
  return {
    currentStep,
    completedSteps,
    nextActionText: meta.nextActionText,
    nextPage: meta.nextPage,
    nextPagePath: resolveJourneyPagePath(meta.nextPage),
    progressLabel: currentStep === "seven_day_retest_pending"
      ? `七日复测 7/7`
      : meta.progressLabel,
    title: meta.title,
    dailyDoneCount: getDailyDoneCount(ledger, day),
    day,
    updatedAt: safeNow()
  };
}

function syncTodayJourney(input = {}) {
  const day = input.day || todayKey();
  const current = readTodayJourney(day);
  const snapshot = buildJourneyState(Object.assign({}, input, { todayJourney: current }));
  const nextLastPage = current.lastPage === "mirror-scroll" && input.lastPage === "home"
    ? current.lastPage
    : input.lastPage || current.lastPage || "";
  saveTodayJourney({
    step: snapshot.currentStep,
    completedSteps: snapshot.completedSteps,
    pendingAction: snapshot.nextActionText,
    lastPage: nextLastPage,
    updatedAt: safeNow()
  }, day);
  return snapshot;
}

function buildCompletionState(input = {}) {
  const day = input.day || todayKey();
  const ledger = input.ledger || { records: [] };
  const records = listEvidence(ledger);
  const checkin = hasEvidence("daily_checkin", day, ledger);
  const concept = hasEvidence("daily_concept", day, ledger);
  const seal = hasEvidence("daily_seal", day, ledger);
  const proof = records.find((item) => item.type === "heart_proof_card" && item.day === day) || null;
  const conceptRecord = records.find((item) => item.type === "daily_concept" && item.day === day) || {};
  const sealRecord = records.find((item) => item.type === "daily_seal" && item.day === day) || {};
  const summary = buildEvidenceSummary(ledger, { day });
  const completedDays = Number(input.completedDays || 0);
  const completedPracticeDays = Math.max(completedDays, countPracticeDays(records));
  const retestRemaining = Math.max(0, 7 - completedPracticeDays);
  const zhixingChange = Number((proof || sealRecord).zhixingChange || input.zhixingChange || 3);
  const heartProofCount = summary.heartProofCount || (proof ? 1 : 0);

  return {
    done: !!(concept && seal),
    title: "今日修行已完成",
    todayCheckedIn: !!checkin,
    thought: input.thought || conceptRecord.stage || conceptRecord.reflection || "今日这一念",
    boundary: sealRecord.action || input.boundary || "追涨前停十秒",
    sealText: input.sealText || "志 · 止 · 照",
    heartProofCount,
    heartProofText: proof
      ? `已生成第 ${heartProofCount || 1} 枚心证`
      : "今日之印已落下，心证卡待生成",
    zhixingChangeText: zhixingChange > 0 ? `+${zhixingChange}` : String(zhixingChange),
    retestRemaining,
    retestText: retestRemaining > 0 ? `距离七日复测还差 ${retestRemaining} 日` : "七日已满，可以复测",
    archiveReady: !!proof,
    actions: [
      { key: "card", text: "查看今日心证卡", primary: true },
      { key: "archive", text: "存入活镜档案" },
      { key: "share", text: "邀请一位同修同行" }
    ]
  };
}

function clampNumber(value, min, max) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function countPracticeDays(records = []) {
  const days = new Set();
  (records || []).forEach((item) => {
    if (!item || !item.day) return;
    if (item.type === "daily_seal" || item.type === "heart_proof_card") days.add(item.day);
  });
  return days.size;
}

function findEvidenceRecord(records = [], type, options = {}) {
  const day = options.day || "";
  return (records || []).find((item) => item && item.type === type && (!day || item.day === day)) || null;
}

function buildChainStep({ key, index, title, done, current, statusText, detail, actionText }) {
  const isDone = !!done;
  const isCurrent = !isDone && !!current;
  return {
    key,
    index,
    numberText: String(index),
    title,
    done: isDone,
    current: isCurrent,
    pending: !isDone && !isCurrent,
    statusText: statusText || (isDone ? "已完成" : isCurrent ? "当前一步" : "待完成"),
    detail: detail || (isDone ? "已写入证据链" : "完成后会写入心镜档案"),
    actionText: actionText || ""
  };
}

function buildClosureEvidenceChainView(input = {}) {
  const day = input.day || todayKey();
  const ledger = input.ledger || { records: [] };
  const records = listEvidence(ledger);
  const concept = findEvidenceRecord(records, "daily_concept", { day });
  const review = findEvidenceRecord(records, "review_record");
  const seal = findEvidenceRecord(records, "daily_seal", { day });
  const heartProof = findEvidenceRecord(records, "heart_proof_card", { day });
  const archivedProof = records.find((item) => item && item.type === "heart_proof_card" && item.day === day && item.archived) || null;
  const retest = findEvidenceRecord(records, "seven_day_retest");
  const completedDays = clampNumber(Math.max(countPracticeDays(records), Number(input.completedDays || 0)), 0, 7);
  const retestRemaining = Math.max(0, 7 - completedDays);
  const retestReady = completedDays >= 7 && !retest;

  const rawSteps = [
    {
      key: "thought",
      title: "我照见了一念",
      done: !!concept,
      detail: concept ? (concept.reflection || "今日一念已写入") : "先写下今天最明显的一念",
      actionText: "写下今日一念"
    },
    {
      key: "review",
      title: "我做了一次真实复盘",
      done: !!review,
      detail: review ? (review.reflection || review.action || "真实复盘已进入活镜") : "上传截图，写下理由和第一念",
      actionText: "做一次真实复盘"
    },
    {
      key: "seal",
      title: "我落下了三印",
      done: !!seal,
      detail: seal ? (seal.action || seal.reflection || "今日三印已落下") : "完成一念、一惧、一界",
      actionText: "落下今日三印"
    },
    {
      key: "card",
      title: "我生成了一张心证卡",
      done: !!heartProof,
      detail: heartProof ? (heartProof.reflection || "今日心证卡已生成") : "把今日照见生成一张心证卡",
      actionText: "生成心证卡"
    },
    {
      key: "archive",
      title: "我的心证已存入活镜档案",
      done: !!archivedProof,
      detail: archivedProof ? "心证已进入活镜档案" : "心证卡生成后会沉入活镜档案",
      actionText: "存入活镜档案"
    },
    {
      key: "retest",
      title: "七日后我可以复测变化",
      done: !!retest,
      current: retestReady,
      statusText: retest ? "已复测" : retestReady ? "可复测" : `还差 ${retestRemaining} 日`,
      detail: retest
        ? (retest.reflection || "复测变化已写入档案")
        : retestReady
          ? "七日已满，可以复测变化"
          : `七日复测 ${completedDays}/7，只看反应模式变化`,
      actionText: retestReady ? "开始复测" : "等待七日复测"
    }
  ];

  const firstPending = rawSteps.find((step) => !step.done && !step.current);
  const currentKey = retestReady
    ? "retest"
    : firstPending
      ? firstPending.key
      : "";
  const steps = rawSteps.map((step, index) => buildChainStep(Object.assign({}, step, {
    index: index + 1,
    current: step.current || (!step.done && step.key === currentKey)
  })));
  const completedCount = steps.filter((step) => step.done).length;
  const activeStep = steps.find((step) => step.current) || steps.find((step) => !step.done) || steps[steps.length - 1];

  return {
    title: "闭环证据链",
    subtitle: completedCount >= 5 && !retest ? "今日证据已成链，等待七日复测。" : "每完成一步，都会留下可回看的证据。",
    progressText: `${completedCount}/6`,
    completedCount,
    totalCount: 6,
    progressPercent: Math.round((completedCount / 6) * 100),
    nextActionText: activeStep && !activeStep.done ? activeStep.actionText : "查看心镜档案",
    retestRemaining,
    retestReady,
    steps
  };
}

function buildUnifiedJourneyView(input = {}) {
  const day = input.day || todayKey();
  const ledger = input.ledger || { records: [] };
  const records = listEvidence(ledger);
  const evidenceSummary = input.evidenceSummary || buildEvidenceSummary(ledger, { day });
  const journeyState = input.journeyState || buildJourneyState(Object.assign({}, input, { day, ledger }));
  const completionView = input.completionView || buildCompletionState(Object.assign({}, input, { day, ledger }));
  const todayByType = evidenceSummary.todayByType || {};
  const byType = evidenceSummary.byType || {};
  const dailyDoneCount = clampNumber(journeyState.dailyDoneCount, 0, 3);
  const todayReviewCount = Number(todayByType.review_record || 0);
  const hasReport = !!input.hasReport || Number(byType.mind_report || 0) > 0;
  const hasAnyTodayPractice = !!(
    todayByType.daily_checkin ||
    todayByType.daily_concept ||
    todayByType.daily_seal ||
    todayByType.heart_proof_card
  );
  const hasSeal = Number(todayByType.daily_seal || 0) > 0;
  const hasHeartProof = Number(todayByType.heart_proof_card || 0) > 0;
  const hasArchived = records.some((item) => item.type === "heart_proof_card" && item.day === day && item.archived);
  const conceptRecord = records.find((item) => item.type === "daily_concept" && item.day === day) || {};
  const sealRecord = records.find((item) => item.type === "daily_seal" && item.day === day) || {};
  const proofRecord = records.find((item) => item.type === "heart_proof_card" && item.day === day) || {};
  const evidencePracticeDays = countPracticeDays(records);
  const sevenDayCompleted = clampNumber(Math.max(
    evidencePracticeDays,
    Number(input.completedDays || 0)
  ), 0, 7);
  const yearlyDay = clampNumber(Math.max(
    evidencePracticeDays,
    Number(byType.heart_proof_card || 0),
    Number(input.personalPracticeDays || 0)
  ), 0, 365);
  const retestDone = Number(byType.seven_day_retest || 0) > 0 || !!input.hasRetest;
  const canRetest = sevenDayCompleted >= 7 && !retestDone;
  const retestRemaining = Math.max(0, 7 - sevenDayCompleted);
  const stateLabel = !hasReport && !hasAnyTodayPractice
    ? "未照见"
    : hasSeal
      ? todayReviewCount > 0 || journeyState.currentStep === "share_ready" ? "已归卷" : "待复盘"
      : "待落印";
  const stateHintMap = {
    "未照见": "先看见今日这一念。",
    "待落印": "把一念、一惧、一界落下。",
    "待复盘": "本次照见已写入活镜，下一步做一次真实复盘。",
    "已归卷": "今日照见、复盘与活镜已形成记录。"
  };
  const themeDay = clampNumber(input.themeDay || ((input.dailyContent || {}).dayNumber), 1, 365);
  const training7View = input.training7View || {};
  const rawTrainingDay = clampNumber(training7View.currentDay, 1, 7);
  const currentTrainingDay = clampNumber(Math.min(rawTrainingDay, sevenDayCompleted + 1), 1, 7);
  const trainingDayItem = ((training7View.days || []).find((item) => Number(item.day || 0) === currentTrainingDay)) ||
    (Number((training7View.today || {}).day || 0) === currentTrainingDay ? training7View.today : null) ||
    {};
  const themeTitle = trainingDayItem.title ||
    (input.todayTitle || (input.dailyContent || {}).stageName || "今日修行");
  const threeSeals = input.threeSeals || {};
  const sealProgressCount = hasSeal
    ? 3
    : ["thought", "fear", "boundary"].filter((key) => !!threeSeals[key]).length || (Number(todayByType.daily_concept || 0) > 0 ? 1 : 0);
  const sevenDayProgressLabel = `${sevenDayCompleted} / 7`;
  const annualPracticeDay = `${themeDay} / 365`;
  const dailyPracticeDay = `Day ${currentTrainingDay}`;
  const todaySealProgress = `${sealProgressCount} / 3`;
  const todayZhixingChange = Number((proofRecord || sealRecord).zhixingChange || 0);
  const dayText = yearlyDay > 0
    ? `今日训练：${dailyPracticeDay} · 全年修行：${annualPracticeDay}`
    : `今日训练：${dailyPracticeDay} · 全年修行：${annualPracticeDay}`;
  const growthText = Number(evidenceSummary.total || 0) > 0
    ? [
      Number(byType.heart_proof_card || 0) ? `已入档 ${byType.heart_proof_card} 枚心证` : "",
      Number(byType.review_record || 0) ? `真实复盘 ${byType.review_record} 次` : "",
      `七日 ${sevenDayCompleted}/7`
    ].filter(Boolean).join(" · ")
    : "这里还没有心证。完成今日落印后，第一枚心证会存入档案。";
  const dailyProgressText = `今日三印 ${todaySealProgress}`;
  const retestText = canRetest
    ? "七日已满，可以复测"
    : `距离七日复测还差 ${retestRemaining} 日`;
  const yearlySubtitle = `全年修行：${annualPracticeDay}`;
  const yearlyNextText = yearlyDay > 0 ? `还差${365 - yearlyDay}日完成全年心证` : "第一枚心证会从今日开始";

  return {
    currentStep: journeyState.currentStep,
    completedSteps: journeyState.completedSteps || [],
    nextActionText: journeyState.nextActionText,
    nextPage: journeyState.nextPage,
    nextPagePath: journeyState.nextPagePath,
    progressLabel: journeyState.progressLabel,
    title: journeyState.title,
    stateLabel,
    stateHint: stateHintMap[stateLabel],
    todayCheckedIn: Number(todayByType.daily_checkin || 0) > 0,
    todayMindSeen: Number(todayByType.daily_concept || 0) > 0 || !!conceptRecord.reflection,
    todayReviewDone: todayReviewCount > 0,
    todayThreeSealsDone: hasSeal,
    todayHeartCardGenerated: hasHeartProof,
    todayArchived: hasArchived,
    todayZhixingChange,
    hasReport,
    hasCheckin: Number(todayByType.daily_checkin || 0) > 0,
    hasConcept: Number(todayByType.daily_concept || 0) > 0,
    hasSeal,
    hasHeartProof,
    hasArchived,
    hasReviewToday: todayReviewCount > 0,
    dailyDoneCount,
    dailyProgressText,
    todaySealProgress,
    todaySealProgressText: `今日三印：${todaySealProgress}`,
    sevenDayCompleted,
    sevenDayTotal: 7,
    sevenDayProgress: sevenDayProgressLabel,
    sevenDayProgressText: `七日复测：${sevenDayProgressLabel}`,
    sevenDayProgressPercent: Math.round((sevenDayCompleted / 7) * 100),
    sevenDayText: `七日复测：${sevenDayProgressLabel}`,
    canRetest,
    retestRemaining,
    retestText,
    yearlyDay,
    annualPracticeDay,
    annualPracticeDayText: `全年修行：${annualPracticeDay}`,
    dailyPracticeDay,
    dailyPracticeDayText: `今日训练：${dailyPracticeDay}`,
    yearlyProgress: Math.round((yearlyDay / 365) * 100),
    yearlySubtitle,
    yearlyNextText,
    currentThemeDay: themeDay,
    currentThemeText: `今日心证第 ${themeDay} 页`,
    currentTheme: themeTitle,
    currentStage: (input.dailyContent || {}).stageName || themeTitle,
    personalStage: input.personalStage || input.growthStage || "事上练心",
    currentThemeTitle: themeTitle,
    currentTrainingDay,
    currentTrainingText: `今日训练：${dailyPracticeDay}`,
    currentTrainingTitle: themeTitle,
    dayText,
    growthText,
    livingMirrorFeedback: hasSeal ? "本次照见已写入活镜" : "落印后写入活镜",
    closureEvidenceChain: buildClosureEvidenceChainView(Object.assign({}, input || {}, {
      day,
      ledger,
      completedDays: sevenDayCompleted
    })),
    completionView,
    source: "journey-state"
  };
}

module.exports = {
  JOURNEY_STATES,
  STEP_META,
  PAGE_PATHS,
  readTodayJourney,
  saveTodayJourney,
  normalizeTodayJourney,
  resolveJourneyPagePath,
  buildJourneyState,
  syncTodayJourney,
  buildCompletionState,
  buildClosureEvidenceChainView,
  buildUnifiedJourneyView
};
