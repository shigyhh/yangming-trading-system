const LOOP_NODES = [
  { key: "enter_reflection", label: "入照心" },
  { key: "nine_mirrors", label: "九镜显影" },
  { key: "mirror_report", label: "心镜报告" },
  { key: "daily_practice", label: "今日修行" },
  { key: "trade_review", label: "真实交易复盘" },
  { key: "growth_profile", label: "活镜成长谱" },
  { key: "behavior_loop", label: "循环之镜" },
  { key: "retest", label: "复测变化" },
  { key: "assistant_handoff", label: "助教承接" },
  { key: "share_global", label: "分享照见层" },
  { key: "next_enter_reflection", label: "下一次入照心" }
].map((node, index) => Object.assign({}, node, { order: index + 1 }));

const THOUGHT_OPTIONS = [
  { key: "fomo", label: "怕错过", pattern: /怕错过|来不及|上车|踏空/ },
  { key: "chase", label: "想追进去", pattern: /追|立刻|跟上|冲动/ },
  { key: "wait_pullback", label: "想再等等", pattern: /再等等|等回|等一下|会回来|不认错/ },
  { key: "ask_others", label: "想问别人", pattern: /别人|群里|老师|朋友|外部/ },
  { key: "abandon_plan", label: "想改计划", pattern: /改计划|重新解释|临时|证明|翻本|不甘/ }
];

function buildMiniProgramBinding({ userBinding = {}, profile = {}, linkToken = "", reportId = "" } = {}) {
  const anonymousId = userBinding.userId || profile.anonymousId || `anon_${userBinding.inviteCode || "pending"}`;
  return {
    userId: userBinding.phone ? `phone_${userBinding.phone}` : "",
    anonymousId,
    openid: profile.openid || "",
    unionid: profile.unionid || "",
    phone: userBinding.phone || profile.phone || "",
    phoneMask: userBinding.phoneMask || profile.phoneMask || "",
    linkToken: linkToken || profile.linkToken || "",
    reportId: reportId || profile.reportId || "",
    inviteCode: userBinding.inviteCode || profile.inviteCode || "",
    createdAt: profile.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

function buildMiniLoopProgress(context = {}) {
  const assessment = context.assessment || null;
  const training7View = context.training7View || {};
  const threeSeals = context.threeSeals || {};
  const tradeReviewState = context.tradeReviewState || {};
  const livingMirrorStats = context.livingMirrorStats || {};
  const assistantHandoff = context.assistantHandoff || {};
  const shareCardState = context.shareCardState || {};
  const inviteEvents = context.inviteEvents || [];
  const retestSnapshots = context.retestSnapshots || {};
  const behaviorLoop = buildBehaviorLoop(tradeReviewState);
  const completedDays = Number(training7View.completedCount || 0);
  const heartProofCount = countHeartProofs(shareCardState, context.heartProofState);
  const tradeReviewCount = Number(((tradeReviewState || {}).records || []).length || 0);
  const completedNodes = [];

  if (assessment) completedNodes.push("enter_reflection", "nine_mirrors", "mirror_report");
  if (threeSeals.completed || completedDays > 0) completedNodes.push("daily_practice");
  if (tradeReviewCount > 0) completedNodes.push("trade_review");
  if (Number(livingMirrorStats.totalReviews || 0) > 0) completedNodes.push("growth_profile");
  if (behaviorLoop.ready) completedNodes.push("behavior_loop");
  if ((retestSnapshots || {}).retest || completedDays >= 7) completedNodes.push("retest");
  if (assistantHandoff.ready || Number(assistantHandoff.readyCount || 0) >= 2) completedNodes.push("assistant_handoff");
  if ((inviteEvents || []).length > 0 || heartProofCount > 0) completedNodes.push("share_global");
  if ((retestSnapshots || {}).retest) completedNodes.push("next_enter_reflection");

  const currentNode = getCurrentNode(completedNodes);
  return {
    userId: (context.binding || {}).userId || "",
    anonymousId: (context.binding || {}).anonymousId || "",
    currentNode: currentNode.key,
    currentNodeLabel: currentNode.label,
    currentNodeOrder: currentNode.order,
    completedNodes: Array.from(new Set(completedNodes)),
    completedDays,
    heartProofCount,
    tradeReviewCount,
    retestUnlocked: completedDays >= 7 || !!(retestSnapshots || {}).retest,
    behaviorLoop,
    updatedAt: nowIso()
  };
}

function buildMiniHomeView(context = {}) {
  const loopProgress = context.loopProgress || buildMiniLoopProgress(context);
  const training7View = context.training7View || {};
  const threeSeals = context.threeSeals || {};
  const reminder = context.liveMirrorReminder || {};
  const today = training7View.today || {};
  const tradeReviewCount = Number(loopProgress.tradeReviewCount || 0);
  const practiceSteps = [
    { key: "checkin", label: "签到", done: !!(context.checkedIn || threeSeals.completed) },
    { key: "observe", label: "观念", done: !!(threeSeals.thought || threeSeals.fear || threeSeals.boundary) },
    { key: "seal", label: "落印", done: !!threeSeals.completed }
  ];
  const doneCount = practiceSteps.filter((item) => item.done).length;
  const retestRemaining = Math.max(0, 7 - Number(loopProgress.completedDays || 0));
  const stateLabel = threeSeals.completed
    ? tradeReviewCount > 0 ? "已归卷" : "待复盘"
    : doneCount > 0 ? "待落印" : "未照见";
  const stateHintMap = {
    "未照见": "先看见今日这一念。",
    "待落印": "把一念、一惧、一界落下。",
    "待复盘": "本次照见已写入活镜，下一步做一次真实复盘。",
    "已归卷": "今日照见、复盘与活镜已形成记录。"
  };
  return {
    title: "今日修行",
    stateLabel,
    stateHint: stateHintMap[stateLabel],
    positionText: `第 ${loopProgress.currentNodeOrder} 环 · ${loopProgress.currentNodeLabel}`,
    todayOneThought: reminder.mainTraining || today.boundaryPractice || "今天只照见这一念。",
    dayText: `第 ${training7View.currentDay || 1} 日：${today.title || "今日修行"}`,
    progressText: `今日修行 ${doneCount}/3`,
    practiceSteps,
    primaryText: threeSeals.completed ? "查看今日心证" : "落下今日之印",
    tradeReviewText: tradeReviewCount > 0 ? "继续真实复盘" : "60 秒真实复盘",
    klineText: "今日 K 线观心",
    heartProofText: "查看今日心证",
    livingMirrorFeedback: threeSeals.completed ? "本次照见已写入活镜" : "落印后写入活镜",
    growthText: `已修行 ${loopProgress.completedDays || 0}/7 日 · 已生成 ${loopProgress.heartProofCount || 0} 枚心证 · 真实复盘 ${loopProgress.tradeReviewCount || 0} 次`,
    retestText: loopProgress.retestUnlocked ? "七日已满，可以复测变化" : `复测还差 ${retestRemaining} 日`
  };
}

function buildMiniDailyPractice(context = {}) {
  const training7View = context.training7View || {};
  const threeSeals = context.threeSeals || {};
  const today = training7View.today || {};
  const thought = threeSeals.thought || threeSeals.fear || threeSeals.boundary || "";
  return {
    dailyGrowthId: `daily-${context.todayKey || todayKey()}`,
    reportId: (context.assessment || {}).reportId || "",
    userId: (context.binding || {}).userId || "",
    anonymousId: (context.binding || {}).anonymousId || "",
    trainingDay: training7View.currentDay || today.day || 1,
    checkinType: threeSeals.completed ? "observe" : null,
    thoughtType: normalizeThoughtType(thought),
    reflectionText: thought,
    isCompleted: !!threeSeals.completed,
    completedAt: threeSeals.completed ? nowIso() : ""
  };
}

function buildMiniHeartProof(input = {}) {
  const sourceType = input.sourceType || "daily_practice";
  const sourceId = input.sourceId || `source-${Date.now()}`;
  const reflectionText = input.reflectionText || input.thought || "今天先照见这一念。";
  const thoughtType = input.thoughtType || normalizeThoughtType(reflectionText);
  return {
    heartProofId: input.heartProofId || `hp-${Date.now()}`,
    sourceType,
    sourceId,
    userId: (input.binding || {}).userId || "",
    anonymousId: (input.binding || {}).anonymousId || "",
    thoughtType,
    reflectionText,
    proofText: input.proofText || `我今天照见的是：${getThoughtLabel(thoughtType)}。`,
    nextActionText: input.nextActionText || "下一次同场景，先停十秒，再写下第一念。",
    affectedDimensions: input.affectedDimensions || ["awareness", "boundary", "execution"],
    createdAt: nowIso()
  };
}

function buildBehaviorLoop(tradeReviewState = {}) {
  const records = ((tradeReviewState || {}).records || []).slice();
  if (!records.length) {
    return {
      ready: false,
      title: "循环之镜待生成",
      line: "完成两次真实复盘后，系统会照见重复出现的行为循环。",
      trigger: "待采集",
      thought: "待照见",
      mirror: "待照见",
      thieves: "待照见",
      nextAction: "先完成一条真实复盘。"
    };
  }
  const latest = records[records.length - 1] || {};
  const mirror = mostFrequent(records.map((item) => item.relatedMirror || "待照见"));
  const stage = mostFrequent(records.map((item) => ((item.historicalMatch || {}).stagePosition || item.stageGate || "真实复盘")));
  const thought = latest.firstThought || latest.actionLabel || "第一念待记录";
  const thieves = (latest.heartThieves || []).join("、") || latest.virtuePractice || "知止、守心、执行";
  const nextAction = latest.trainingAction || "下一次同场景先写下第一念。";
  return {
    ready: records.length >= 2,
    title: records.length >= 2 ? "循环之镜" : "循环之镜沉淀中",
    line: `${stage} → ${thought} → ${mirror} → ${thieves}`,
    trigger: stage,
    thought,
    mirror,
    thieves,
    nextAction
  };
}

function buildLivingMirrorTree(context = {}) {
  const stats = context.livingMirrorStats || {};
  const progress = context.loopProgress || buildMiniLoopProgress(context);
  const loop = progress.behaviorLoop || buildBehaviorLoop(context.tradeReviewState);
  const currentMirror = stats.currentMirror || "活镜未点亮";
  const topThieves = stats.topThievesText || "待照见";
  const evidenceSummary = context.evidenceSummary || {};
  const leafCount = Number((evidenceSummary || {}).total || 0) ||
    Number(progress.tradeReviewCount || 0) + Number(progress.heartProofCount || 0);
  return {
    root: "心镜报告",
    trunk: currentMirror,
    branchText: `九镜主枝：${currentMirror}`,
    leafText: `${leafCount} 片行为证据叶`,
    ringsText: `七日年轮 ${progress.completedDays || 0}/7`,
    shadowText: `高频心贼：${topThieves}`,
    loopLine: loop.line,
    nodes: [
      { key: "root", label: "根", value: "我是谁", active: !!context.assessment },
      { key: "trunk", label: "干", value: currentMirror, active: Number(stats.totalReviews || 0) > 0 },
      { key: "leaf", label: "叶", value: `${leafCount} 次证据`, active: leafCount > 0 },
      { key: "seal", label: "印", value: progress.retestUnlocked ? "可复测" : "继续七日", active: progress.retestUnlocked }
    ]
  };
}

function getCurrentNode(completedNodes) {
  const completed = new Set(completedNodes || []);
  return LOOP_NODES.find((node) => !completed.has(node.key)) || LOOP_NODES[LOOP_NODES.length - 1];
}

function countHeartProofs(shareCardState = {}, heartProofState = {}) {
  const cards = Object.keys((shareCardState || {}).records || {}).length;
  const proofs = Object.keys((heartProofState || {}).records || {}).length;
  return Math.max(cards, proofs);
}

function normalizeThoughtType(text) {
  const value = String(text || "");
  const matched = THOUGHT_OPTIONS.find((item) => item.pattern.test(value));
  return matched ? matched.key : null;
}

function getThoughtLabel(key) {
  const item = THOUGHT_OPTIONS.find((thought) => thought.key === key);
  return item ? item.label : "这一念";
}

function mostFrequent(values) {
  const counts = {};
  (values || []).forEach((value) => {
    const key = String(value || "").trim();
    if (!key) return;
    counts[key] = Number(counts[key] || 0) + 1;
  });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] || "待照见";
}

function nowIso() {
  return new Date().toISOString();
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

module.exports = {
  LOOP_NODES,
  THOUGHT_OPTIONS,
  buildMiniProgramBinding,
  buildMiniLoopProgress,
  buildMiniHomeView,
  buildMiniDailyPractice,
  buildMiniHeartProof,
  buildBehaviorLoop,
  buildLivingMirrorTree,
  normalizeThoughtType
};
