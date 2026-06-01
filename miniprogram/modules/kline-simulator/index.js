const { getMirrorBinding } = require("../../utils/content");

const COMPLIANCE_TEXT = "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。";

const PROCESS_SCORE_LABELS = {
  planExecution: "计划执行度",
  boundaryKeeping: "守界度",
  impulseDelay: "冲动延迟度",
  emotionalStability: "情绪稳定度",
  reviewCompletion: "复盘完成度"
};

const KLINE_CHANGE_METRICS = [
  { key: "impulseDelay", label: "冲动延迟度" },
  { key: "boundaryKeeping", label: "守界度" },
  { key: "planExecution", label: "计划执行度" },
  { key: "emotionalStability", label: "情绪稳定度" },
  { key: "reviewCompletion", label: "复盘完成度" }
];

const BOUNDARY_STATE_MAP = {
  kept: { key: "kept", label: "已守住", penalty: 0, insight: "边界已被看见，并回到原先写下的一界。" },
  near: { key: "near", label: "差点失守", penalty: 8, insight: "念头已经很强，但仍有机会用记录把它接住。" },
  lost: { key: "lost", label: "已经失守", penalty: 18, insight: "这一段最重要的不是责备，而是看清失守前的第一念。" }
};

function getBoundaryStateMeta(key) {
  return BOUNDARY_STATE_MAP[key] || BOUNDARY_STATE_MAP.kept;
}

const MARKET_PRESETS = [
  { key: "cn", label: "A股", ruleTag: "T+1 规则", session: "日内节奏固定，重点观察隔夜与边界反应" },
  { key: "hk", label: "港股", ruleTag: "港股规则", session: "波动节奏更开放，重点观察不确定感" },
  { key: "us", label: "美股", ruleTag: "美股规则", session: "交易时段不同，重点观察疲惫与冲动" },
  { key: "futures", label: "期货", ruleTag: "期货规则", session: "杠杆感更强，重点观察急与惧" },
  { key: "crypto", label: "数字货币", ruleTag: "全天候波动", session: "无固定休息感，重点观察频繁查看" }
];

const TIMEFRAME_PRESETS = [
  { key: "1y", label: "年线", pace: "极慢", candleWindow: 6 },
  { key: "1m", label: "月线", pace: "慢", candleWindow: 6 },
  { key: "1w", label: "周线", pace: "慢", candleWindow: 6 },
  { key: "1d", label: "日线", pace: "标准", candleWindow: 6 },
  { key: "60m", label: "60分钟", pace: "中速", candleWindow: 6 },
  { key: "30m", label: "30分钟", pace: "中速", candleWindow: 6 },
  { key: "10m", label: "10分钟", pace: "快速", candleWindow: 6 },
  { key: "5m", label: "5分钟", pace: "快速", candleWindow: 6 }
];

const MOCK_KLINE_SCENARIOS = [
  {
    id: "scene-fast-001",
    title: "快速拉升场景",
    subtitle: "测试入场冲动与下单前延迟能力",
    triggerType: "怕错过",
    relatedPersonalities: ["冲动型", "焦虑型"],
    trainingDay: 1,
    candles: [
      { open: 100, high: 102, low: 99, close: 101 },
      { open: 101, high: 104, low: 100, close: 103 },
      { open: 103, high: 108, low: 102, close: 107 },
      { open: 107, high: 111, low: 106, close: 110 },
      { open: 110, high: 112, low: 105, close: 106 },
      { open: 106, high: 108, low: 102, close: 103 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "盘面突然变快，此刻你的第一反应是什么？",
        options: [
          { id: "rush", label: "想立刻跟上", trait: "冲动型", delayScore: 18, boundaryScore: 34 },
          { id: "confirm", label: "想再等一根确认", trait: "完美型", delayScore: 68, boundaryScore: 72 },
          { id: "expand", label: "想放大动作", trait: "赌徒型", delayScore: 28, boundaryScore: 30 },
          { id: "pause", label: "先停下来观察", trait: "平衡型", delayScore: 88, boundaryScore: 86 }
        ]
      },
      {
        step: 2,
        question: "如果波动继续变快，你最需要守住哪条边界？",
        options: [
          { id: "position", label: "仓位边界", trait: "守界能力", delayScore: 76, boundaryScore: 88 },
          { id: "plan", label: "计划边界", trait: "计划断裂型", delayScore: 74, boundaryScore: 84 },
          { id: "emotion", label: "情绪边界", trait: "焦虑型", delayScore: 72, boundaryScore: 82 },
          { id: "none", label: "先看看再说", trait: "冲动型", delayScore: 34, boundaryScore: 36 }
        ]
      }
    ]
  },
  {
    id: "scene-drop-001",
    title: "突然下跌场景",
    subtitle: "测试恐惧反应与边界抗拒",
    triggerType: "怕失控",
    relatedPersonalities: ["扛单型", "焦虑型"],
    trainingDay: 2,
    candles: [
      { open: 100, high: 101, low: 98, close: 99 },
      { open: 99, high: 100, low: 96, close: 97 },
      { open: 97, high: 98, low: 92, close: 93 },
      { open: 93, high: 95, low: 90, close: 91 },
      { open: 91, high: 96, low: 90, close: 95 },
      { open: 95, high: 97, low: 93, close: 94 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "边界附近波动放大，你的第一念是什么？",
        options: [
          { id: "hope", label: "再等等会修复", trait: "扛单型", delayScore: 32, boundaryScore: 22 },
          { id: "fear", label: "心里突然发紧", trait: "焦虑型", delayScore: 48, boundaryScore: 46 },
          { id: "fact", label: "先记录事实", trait: "平衡型", delayScore: 84, boundaryScore: 86 },
          { id: "argue", label: "想重新解释计划", trait: "偏执型", delayScore: 38, boundaryScore: 32 }
        ]
      },
      {
        step: 2,
        question: "此刻最容易被哪一种念头带走？",
        options: [
          { id: "unwilling", label: "不甘心承认失守", trait: "扛单型", delayScore: 42, boundaryScore: 28 },
          { id: "panic", label: "害怕继续扩大", trait: "焦虑型", delayScore: 50, boundaryScore: 50 },
          { id: "proof", label: "想证明原判断没错", trait: "偏执型", delayScore: 36, boundaryScore: 34 },
          { id: "review", label: "先回到复盘依据", trait: "平衡型", delayScore: 86, boundaryScore: 88 }
        ]
      }
    ]
  },
  {
    id: "scene-sideways-001",
    title: "横盘震荡场景",
    subtitle: "测试耐心与过度交易倾向",
    triggerType: "想做点什么",
    relatedPersonalities: ["拖延型", "赌徒型"],
    trainingDay: 5,
    candles: [
      { open: 100, high: 102, low: 99, close: 101 },
      { open: 101, high: 102, low: 99, close: 100 },
      { open: 100, high: 101, low: 98, close: 99 },
      { open: 99, high: 102, low: 98, close: 101 },
      { open: 101, high: 103, low: 100, close: 100 },
      { open: 100, high: 101, low: 98, close: 99 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "迟迟没有方向时，你最明显的反应是什么？",
        options: [
          { id: "bored", label: "手痒，想做点什么", trait: "赌徒型", delayScore: 36, boundaryScore: 38 },
          { id: "wait_more", label: "一直等到完全确定", trait: "完美型", delayScore: 58, boundaryScore: 64 },
          { id: "avoid", label: "不想继续复盘", trait: "拖延型", delayScore: 42, boundaryScore: 48 },
          { id: "rhythm", label: "按观察节奏记录", trait: "平衡型", delayScore: 86, boundaryScore: 86 }
        ]
      }
    ]
  },
  {
    id: "scene-fake-001",
    title: "假突破场景",
    subtitle: "测试临时改计划与冲动确认",
    triggerType: "急着确认",
    relatedPersonalities: ["冲动型", "偏执型"],
    trainingDay: 6,
    candles: [
      { open: 100, high: 101, low: 98, close: 99 },
      { open: 99, high: 100, low: 97, close: 98 },
      { open: 98, high: 105, low: 98, close: 104 },
      { open: 104, high: 106, low: 99, close: 100 },
      { open: 100, high: 101, low: 95, close: 96 },
      { open: 96, high: 98, low: 94, close: 97 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "突破刚出现时，你会如何解释它？",
        options: [
          { id: "must", label: "这次应该是真的", trait: "偏执型", delayScore: 34, boundaryScore: 36 },
          { id: "rush", label: "先跟上再说", trait: "冲动型", delayScore: 22, boundaryScore: 28 },
          { id: "rule", label: "只看是否符合计划", trait: "平衡型", delayScore: 88, boundaryScore: 86 },
          { id: "afraid", label: "怕自己又判断错", trait: "焦虑型", delayScore: 54, boundaryScore: 58 }
        ]
      }
    ]
  },
  {
    id: "scene-pullback-001",
    title: "盈利回撤场景",
    subtitle: "测试盈利后的失控与收束能力",
    triggerType: "怕回吐",
    relatedPersonalities: ["赌徒型", "焦虑型"],
    trainingDay: 4,
    candles: [
      { open: 100, high: 102, low: 99, close: 101 },
      { open: 101, high: 106, low: 101, close: 105 },
      { open: 105, high: 111, low: 104, close: 110 },
      { open: 110, high: 112, low: 106, close: 107 },
      { open: 107, high: 108, low: 103, close: 104 },
      { open: 104, high: 106, low: 102, close: 105 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "盈利回撤出现时，你最先升起哪一个念头？",
        options: [
          { id: "keep_more", label: "不愿收束，想再看一段", trait: "赌徒型", delayScore: 38, boundaryScore: 42 },
          { id: "tight", label: "心里发紧，怕失去已有成果", trait: "焦虑型", delayScore: 54, boundaryScore: 58 },
          { id: "plan", label: "先回到原计划边界", trait: "平衡型", delayScore: 86, boundaryScore: 88 },
          { id: "bigger", label: "状态不错，想放大动作", trait: "赌徒型", delayScore: 28, boundaryScore: 30 }
        ]
      }
    ]
  },
  {
    id: "scene-loss-streak-001",
    title: "连续不顺场景",
    subtitle: "测试不甘心、证明欲与情绪补偿",
    triggerType: "想证明",
    relatedPersonalities: ["赌徒型", "偏执型"],
    trainingDay: 3,
    candles: [
      { open: 100, high: 101, low: 97, close: 98 },
      { open: 98, high: 99, low: 95, close: 96 },
      { open: 96, high: 98, low: 94, close: 95 },
      { open: 95, high: 96, low: 92, close: 93 },
      { open: 93, high: 95, low: 91, close: 94 },
      { open: 94, high: 96, low: 92, close: 93 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "连续不顺后，此刻最想做什么？",
        options: [
          { id: "recover", label: "想立刻把状态拉回来", trait: "赌徒型", delayScore: 24, boundaryScore: 26 },
          { id: "prove", label: "想证明原判断没有错", trait: "偏执型", delayScore: 32, boundaryScore: 34 },
          { id: "write", label: "先写下不甘心", trait: "平衡型", delayScore: 86, boundaryScore: 84 },
          { id: "avoid", label: "不想复盘这一段", trait: "拖延型", delayScore: 44, boundaryScore: 46 }
        ]
      }
    ]
  },
  {
    id: "scene-missed-001",
    title: "错过机会场景",
    subtitle: "测试空仓焦虑与急躁补偿",
    triggerType: "怕错过",
    relatedPersonalities: ["焦虑型", "冲动型"],
    trainingDay: 1,
    candles: [
      { open: 100, high: 101, low: 99, close: 100 },
      { open: 100, high: 103, low: 100, close: 102 },
      { open: 102, high: 108, low: 102, close: 107 },
      { open: 107, high: 112, low: 106, close: 111 },
      { open: 111, high: 113, low: 108, close: 109 },
      { open: 109, high: 111, low: 106, close: 107 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "错过一段快速波动后，你最容易被什么带走？",
        options: [
          { id: "next_now", label: "急着找下一段", trait: "冲动型", delayScore: 26, boundaryScore: 34 },
          { id: "self_blame", label: "开始责怪自己", trait: "完美型", delayScore: 56, boundaryScore: 60 },
          { id: "crowd", label: "想看别人怎么反应", trait: "从众型", delayScore: 48, boundaryScore: 50 },
          { id: "wait_plan", label: "继续按计划等待", trait: "平衡型", delayScore: 88, boundaryScore: 88 }
        ]
      }
    ]
  },
  {
    id: "scene-boundary-001",
    title: "临近边界场景",
    subtitle: "测试边界执行与知行合一",
    triggerType: "边界被触碰",
    relatedPersonalities: ["扛单型", "拖延型"],
    trainingDay: 2,
    candles: [
      { open: 100, high: 101, low: 98, close: 99 },
      { open: 99, high: 100, low: 97, close: 98 },
      { open: 98, high: 99, low: 95, close: 96 },
      { open: 96, high: 97, low: 94, close: 95 },
      { open: 95, high: 98, low: 94, close: 97 },
      { open: 97, high: 98, low: 93, close: 94 }
    ],
    checkpoints: [
      {
        step: 1,
        question: "边界被触碰时，你会如何面对自己？",
        options: [
          { id: "wait_back", label: "再等等，期待它修复", trait: "扛单型", delayScore: 30, boundaryScore: 24 },
          { id: "rewrite", label: "临时改写原计划", trait: "偏执型", delayScore: 36, boundaryScore: 32 },
          { id: "execute", label: "只执行盘前预案", trait: "平衡型", delayScore: 88, boundaryScore: 92 },
          { id: "later", label: "先不记录，之后再说", trait: "拖延型", delayScore: 42, boundaryScore: 40 }
        ]
      }
    ]
  }
];

function getMarketPreset(key) {
  return MARKET_PRESETS.find((item) => item.key === key) || MARKET_PRESETS[0];
}

function getTimeframePreset(key) {
  return TIMEFRAME_PRESETS.find((item) => item.key === key) || TIMEFRAME_PRESETS[3];
}

function decorateScenario(scene, options = {}) {
  const market = getMarketPreset(options.marketKey || options.market || scene.marketKey);
  const timeframe = getTimeframePreset(options.timeframeKey || options.timeframe || scene.timeframeKey);
  return Object.assign({}, scene, {
    marketKey: market.key,
    marketLabel: market.label,
    timeframeKey: timeframe.key,
    timeframeLabel: timeframe.label,
    ruleTag: market.ruleTag,
    marketSession: market.session,
    paceLabel: timeframe.pace,
    dataSourceLabel: "历史训练切片",
    segmentLabel: `${market.label} · ${timeframe.label} · 离线训练样本`,
    candles: (scene.candles || []).map((item) => Object.assign({}, item)),
    mirrorNames: (scene.relatedPersonalities || []).map((type) => getMirrorBinding(type).mirrorName),
    compliance: COMPLIANCE_TEXT
  });
}

function getKlineScenarios(options = {}) {
  return MOCK_KLINE_SCENARIOS.map((scene) => decorateScenario(scene, options));
}

function getKlineScenario(sceneId, options = {}) {
  return getKlineScenarios(options).find((scene) => scene.id === sceneId) || getKlineScenarios(options)[0];
}

function createKlineSession(sceneId, options = {}) {
  const scene = getKlineScenario(sceneId, options);
  return {
    id: `ks-${Date.now()}`,
    sceneId: scene.id,
    marketKey: scene.marketKey,
    timeframeKey: scene.timeframeKey,
    stepIndex: 0,
    startedAt: Date.now(),
    lastStepAt: Date.now(),
    reactions: [],
    boundary: "",
    boundaryState: "kept",
    changedPlan: false,
    optionSwitchCount: 0,
    completed: false
  };
}

function recordKlineReaction(session, optionId, scene, reactionAt) {
  const safeScene = scene || getKlineScenario(session.sceneId, session);
  const checkpoint = safeScene.checkpoints[session.stepIndex] || safeScene.checkpoints[0];
  const option = checkpoint.options.find((item) => item.id === optionId) || checkpoint.options[0];
  const now = Number(reactionAt || Date.now());
  const reaction = {
    step: checkpoint.step,
    question: checkpoint.question,
    optionId: option.id,
    label: option.label,
    trait: option.trait,
    reactionTimeMs: Math.max(0, now - Number(session.lastStepAt || session.startedAt || now)),
    emotion: session.currentEmotion || session.emotion || "",
    firstThought: session.currentFirstThought || session.firstThought || "",
    boundaryState: session.currentBoundaryState || session.boundaryState || "kept",
    delayScore: option.delayScore,
    boundaryScore: option.boundaryScore,
    createdAt: now
  };
  const nextStepIndex = Number(session.stepIndex || 0) + 1;
  return Object.assign({}, session, {
    stepIndex: nextStepIndex,
    lastStepAt: now,
    reactions: (session.reactions || []).concat(reaction),
    completed: nextStepIndex >= safeScene.checkpoints.length
  });
}

function buildKlineReview(session, scene, patch) {
  const safeScene = scene || getKlineScenario(session.sceneId, session);
  const reactions = session.reactions || [];
  const primary = reactions[0] || {};
  const avgDelay = average(reactions.map((item) => Number(item.delayScore || 0)));
  const avgBoundary = average(reactions.map((item) => Number(item.boundaryScore || 0)));
  const changedPlan = !!((patch || {}).changedPlan || session.changedPlan);
  const optionSwitchCount = Number((patch || {}).optionSwitchCount || session.optionSwitchCount || 0);
  const switchPenalty = Math.min(12, optionSwitchCount * 4);
  const boundary = (patch || {}).boundary || session.boundary || "计划边界";
  const boundaryState = primary.boundaryState || (patch || {}).boundaryState || session.boundaryState || "kept";
  const boundaryMeta = getBoundaryStateMeta(boundaryState);
  const emotion = primary.emotion || (patch || {}).emotion || session.emotion || "";
  const firstThought = primary.firstThought || (patch || {}).firstThought || session.firstThought || "";
  const impulseWithin3s = Number(primary.reactionTimeMs || 0) > 0 && Number(primary.reactionTimeMs || 0) <= 3000;
  const emotionPenalty = /急躁|兴奋|恐惧|不甘|证明|逃避/.test(emotion) ? 5 : 0;
  const scores = {
    planExecution: clamp(avgBoundary + (changedPlan ? -18 : 8) - boundaryMeta.penalty, 18, 96),
    boundaryKeeping: clamp(avgBoundary - boundaryMeta.penalty, 18, 96),
    impulseDelay: clamp(avgDelay - switchPenalty, 18, 96),
    emotionalStability: clamp((avgDelay + avgBoundary) / 2 + (changedPlan ? -10 : 4) - switchPenalty - emotionPenalty, 18, 96),
    reviewCompletion: 90
  };
  const relatedPersonality = primary.trait || safeScene.relatedPersonalities[0] || "平衡型";
  const mirrorBinding = getMirrorBinding(relatedPersonality);
  return {
    id: `kr-${Date.now()}`,
    sceneId: safeScene.id,
    sceneTitle: safeScene.title,
    marketKey: safeScene.marketKey,
    marketLabel: safeScene.marketLabel,
    timeframeKey: safeScene.timeframeKey,
    timeframeLabel: safeScene.timeframeLabel,
    ruleTag: safeScene.ruleTag,
    date: todayKey(),
    primaryReaction: primary.label || "待照见",
    reactionTimeMs: primary.reactionTimeMs || 0,
    reactionSecondsText: `${(Number(primary.reactionTimeMs || 0) / 1000).toFixed(1)} 秒`,
    impulseWithin3s,
    emotion,
    firstThought,
    trigger: safeScene.triggerType,
    relatedPersonality,
    relatedMirror: mirrorBinding.mirrorName,
    relatedHeartMirror: mirrorBinding.heartMirrorName,
    heartThieves: mirrorBinding.thieves,
    virtuePractice: mirrorBinding.virtue || "",
    boundary,
    boundaryState,
    boundaryStateLabel: boundaryMeta.label,
    boundaryInsight: boundaryMeta.insight,
    keptBoundary: boundaryState === "kept" && !changedPlan,
    changedPlan,
    optionSwitchCount,
    scores,
    scoreLabels: PROCESS_SCORE_LABELS,
    processEvidence: buildProcessEvidence({ primary, boundary, boundaryMeta, changedPlan, optionSwitchCount, emotion, firstThought, scores }),
    insight: buildKlineInsight({ scene: safeScene, reaction: primary, scores, impulseWithin3s, firstThought, boundaryMeta }),
    trainingSuggestion: `建议进入 Day ${safeScene.trainingDay || 1}：${getTrainingSuggestion(relatedPersonality)}。`,
    anonymousStats: buildAnonymousStats(primary, safeScene),
    compliance: COMPLIANCE_TEXT,
    createdAt: Date.now()
  };
}

function buildProcessEvidence({ primary, boundary, boundaryMeta, changedPlan, optionSwitchCount, emotion, firstThought, scores }) {
  return [
    { label: "第一反应", value: primary.label || "待照见", detail: `反应时间 ${(Number(primary.reactionTimeMs || 0) / 1000).toFixed(1)} 秒` },
    { label: "第一念", value: firstThought || "未记录", detail: emotion ? `当下情绪：${emotion}` : "情绪未记录" },
    { label: "守界状态", value: boundaryMeta.label, detail: `${boundary || "计划边界"} · ${boundaryMeta.insight}` },
    { label: "计划漂移", value: changedPlan ? "曾临时改计划" : "未记录临时改计划", detail: `选择改动 ${optionSwitchCount || 0} 次` },
    { label: "过程重点", value: `${scores.boundaryKeeping} / ${scores.impulseDelay}`, detail: "前者看守界，后者看第一念是否慢下来。" }
  ];
}

function buildKlineInsight({ scene, reaction, scores, impulseWithin3s, firstThought, boundaryMeta }) {
  if (boundaryMeta && boundaryMeta.key === "lost") {
    return `这一段最清楚的材料，是边界失守前那一念「${firstThought || reaction.label || scene.triggerType}」。`;
  }
  if (boundaryMeta && boundaryMeta.key === "near") {
    return `你已经看见边界差点失守，下一次训练重点是把这一念更早写下来。`;
  }
  if (impulseWithin3s) {
    return `你在三秒内完成选择，第一念「${firstThought || reaction.label || scene.triggerType}」很快接管了注意力。`;
  }
  if ((scores.impulseDelay || 0) < 45) {
    return `你并不是看不懂波动，而是在「${scene.triggerType}」升起时，很难等计划确认。`;
  }
  if ((scores.boundaryKeeping || 0) < 50) {
    return `你已经看见第一反应，但边界被触碰时，还容易继续解释。`;
  }
  return `你能先看见「${reaction.label || scene.triggerType}」，再回到边界，这是事上练心的开始。`;
}

function getTrainingSuggestion(trait) {
  if (/冲动|怕错过/.test(trait)) return "观入场冲动";
  if (/扛|边界/.test(trait)) return "观止损抗拒";
  if (/偏执|证明/.test(trait)) return "观亏损后的证明欲";
  if (/赌徒|放大/.test(trait)) return "观盈利后的失控";
  if (/拖延|完美/.test(trait)) return "观计划执行断裂";
  return "复盘与复测";
}

function buildAnonymousStats(reaction, scene) {
  const label = reaction.label || "先停下来观察";
  const rows = [
    { key: "fast", label: "想立刻行动", value: 42 },
    { key: "wait", label: "想继续等待", value: 27 },
    { key: "expand", label: "想放大动作", value: 18 },
    { key: "pause", label: "想先停下来", value: 13 }
  ].map((item) => Object.assign({}, item, {
    active: isReactionInBucket(label, item.key)
  }));
  return {
    title: `这一段 ${((scene || {}).marketLabel || "市场")} ${((scene || {}).timeframeLabel || "K线")}，100 位同修的第一反应`,
    rows,
    userLabel: label,
    insight: `你的反应属于：${reaction.trait || "守界能力"}。同一段历史切片，照见的是不同人的第一念。`,
    compliance: "这是交易心理反应分布，不是行情预测，不构成投资建议。"
  };
}

function isReactionInBucket(label, bucket) {
  const value = String(label || "");
  if (bucket === "fast") return /立刻|跟上|急着|先跟/.test(value);
  if (bucket === "wait") return /等|确认|继续|观察/.test(value);
  if (bucket === "expand") return /放大|加大|状态|拉回/.test(value);
  if (bucket === "pause") return /停|记录|计划|复盘|事实/.test(value);
  return false;
}

function createMirrorChallenge(review, inviteeOptionId) {
  const scene = getKlineScenario(review.sceneId, review);
  const options = (scene.checkpoints[0] || {}).options || [];
  const invitee = options.find((item) => item.id === inviteeOptionId) || options.find((item) => item.label !== review.primaryReaction) || options[0] || {};
  return {
    id: `mc-${Date.now()}`,
    challengeId: `MC${String(Date.now()).slice(-8)}`,
    sceneId: review.sceneId,
    sceneTitle: review.sceneTitle,
    marketLabel: review.marketLabel,
    timeframeLabel: review.timeframeLabel,
    inviterReaction: review.primaryReaction,
    inviteeReaction: invitee.label || "想继续等待",
    inviterTrigger: review.trigger,
    inviteeTrigger: invitee.trait || "怕犯错",
    inviterMirror: review.relatedMirror || getMirrorBinding(review.relatedPersonality).mirrorName,
    inviteeMirror: getMirrorBinding(invitee.trait).mirrorName,
    comparisonInsight: "你们面对的不是同一根 K 线，而是各自心里的念头。",
    createdAt: Date.now(),
    compliance: COMPLIANCE_TEXT
  };
}

function buildKlineChange(reportsState = {}) {
  const records = (reportsState.records || []).slice().sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  const first = records[0] || null;
  const latest = records[records.length - 1] || first;
  const ready = records.length >= 2;
  const metrics = KLINE_CHANGE_METRICS.map((metric) => {
    const before = Number(((first || {}).scores || {})[metric.key] || 0);
    const after = Number(((latest || {}).scores || {})[metric.key] || 0);
    const delta = Math.round(after - before);
    return {
      key: metric.key,
      label: metric.label,
      before,
      after,
      value: ready ? (delta > 0 ? `提升 ${delta}%` : delta < 0 ? `回落 ${Math.abs(delta)}%` : "持平") : "待完成第二次",
      improved: delta > 0
    };
  });
  const beforeAfterRows = metrics.map((item) => ({
    key: item.key,
    label: item.label,
    before: item.before || "待测",
    after: item.after || "待测",
    deltaText: item.value,
    improved: item.improved
  }));
  const improvedCount = metrics.filter((item) => item.improved).length;
  return {
    ready,
    count: records.length,
    title: ready ? "K线复测变化" : "K线复测待完成",
    stageText: ready ? `${first.date || "初测"} → ${latest.date || "复测"}` : `${records.length}/2 段`,
    fromScene: first ? first.sceneTitle : "待完成",
    toScene: latest ? latest.sceneTitle : "待完成",
    fromMirror: first ? first.relatedMirror : "待照见",
    toMirror: latest ? latest.relatedMirror : "待照见",
    fromSegment: first ? `${first.marketLabel || "市场"} · ${first.timeframeLabel || "周期"}` : "待完成",
    toSegment: latest ? `${latest.marketLabel || "市场"} · ${latest.timeframeLabel || "周期"}` : "待完成",
    metrics,
    beforeAfterRows,
    improvedCount,
    insight: ready
      ? improvedCount >= 3
        ? "你已经不只是完成练习，而是在同类压力里开始看见变化。"
        : "变化仍需要更多记录，但第一反应已经可以被看见。"
      : "再完成一次 K线压力测试后，这里会呈现本地变化对比。"
  };
}

function average(values) {
  const list = (values || []).filter((item) => Number.isFinite(item));
  if (!list.length) return 60;
  return list.reduce((sum, item) => sum + item, 0) / list.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value || 0))));
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

module.exports = {
  COMPLIANCE_TEXT,
  PROCESS_SCORE_LABELS,
  MARKET_PRESETS,
  TIMEFRAME_PRESETS,
  MOCK_KLINE_SCENARIOS,
  getMarketPreset,
  getTimeframePreset,
  getKlineScenarios,
  getKlineScenario,
  createKlineSession,
  recordKlineReaction,
  buildKlineReview,
  createMirrorChallenge,
  buildKlineChange
};
