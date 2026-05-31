const { buildGrowthLevel } = require("../zhixing/index");

const STAGE_SEALS = {
  lizhi: { seal: "志", name: "立志印", meaning: "先立其志，再入其事。" },
  zhaoxin: { seal: "照", name: "照心印", meaning: "先照此心，再看外物。" },
  shishangmo: { seal: "磨", name: "事上磨印", meaning: "在触发处练，不在空想里练。" },
  poxinzei: { seal: "破", name: "破心贼印", meaning: "破一念私欲，守一分清明。" },
  zhixing: { seal: "合", name: "知行合印", meaning: "说过的计划，成为盘中的行动。" },
  zhiliangzhi: { seal: "良", name: "良知印", meaning: "良知无尽，一日一省。" }
};

const HEART_THIEF_BADGES = {
  "冲动型": { id: "rush", name: "破急印", heartThief: "急", scene: "追高、追回、临盘改念" },
  "扛单型": { id: "hold", name: "破扛印", heartThief: "不认错", scene: "扛单、移动边界" },
  "赌徒型": { id: "gamble", name: "破赌印", heartThief: "赌", scene: "连续失守后加重动作" },
  "焦虑型": { id: "fear", name: "破惧印", heartThief: "惧", scene: "提前否定计划" },
  "完美型": { id: "perfect", name: "破苛印", heartThief: "苛", scene: "过度修饰、迟迟不动" },
  "从众型": { id: "crowd", name: "破随印", heartThief: "随", scene: "被讨论和气氛牵走" },
  "偏执型": { id: "bias", name: "破执印", heartThief: "执", scene: "只看支持自己的证据" },
  "拖延型": { id: "delay", name: "破拖印", heartThief: "拖", scene: "知而不行，迟迟未落地" },
  "平衡型": { id: "balance", name: "守一印", heartThief: "松", scene: "顺手时省略基础动作" }
};

function getStageSeal(stageKey) {
  return STAGE_SEALS[stageKey] || STAGE_SEALS.lizhi;
}

function getHeartThiefBadge(personalityType) {
  return HEART_THIEF_BADGES[personalityType] || HEART_THIEF_BADGES["平衡型"];
}

function buildStageSealState(stageState = {}) {
  const stages = stageState.stages || [];
  return stages.map((stage) => {
    const seal = getStageSeal(stage.key);
    const earned = !!stage.completed || (stage.key === "zhiliangzhi" && Number(stage.progress || 0) >= 60);
    return Object.assign({}, seal, {
      key: stage.key,
      stageName: stage.name,
      stageTitle: stage.title,
      earned,
      progress: Number(stage.progress || 0),
      status: earned ? "已授印" : stage.unlocked ? "修行中" : "未解锁"
    });
  });
}

function buildHeartProofShareCard({
  dailyContent = {},
  stageState = {},
  profile = {},
  zhixingScoreState = {},
  continuity = {},
  trainingState = {},
  reviews = {}
} = {}) {
  const currentStage = stageState.currentStage || {};
  const stageKey = dailyContent.stageKey || currentStage.key || "lizhi";
  const stageSeal = getStageSeal(stageKey);
  const personalityType = stageState.personalityType || profile.lastAssessmentType || "平衡型";
  const heartBadge = getHeartThiefBadge(personalityType);
  const latest = zhixingScoreState.latest || null;
  const growthLevel = buildGrowthLevel({
    score: latest ? Number(latest.total || 0) : 0,
    continuity,
    trainingState,
    reviews
  });

  return {
    dayId: dailyContent.id || "Day001",
    brand: "阳明心学交易系统",
    subtitle: "交易是第一修炼场",
    heartProof: dailyContent.heartProof || "先立其志，再入其事。",
    commandment: dailyContent.commandment || "无计划不开仓。",
    training: dailyContent.training || "写下今日边界。",
    stageName: dailyContent.stageName || currentStage.name || "立志",
    stageSeal,
    heartBadge,
    rankName: growthLevel.current.name || "观己",
    streakText: `${Number(continuity.currentStreak || profile.streak || 0)}日连修`,
    scoreText: latest ? `${latest.total} 知行` : "待生成知行",
    qrText: "扫码入道场",
    footer: "不做行情评判，不推荐标的。只修说到做到。",
    shareTitle: `${dailyContent.id || "今日"}心证：${dailyContent.heartProof || "先立其志，再入其事。"}`,
    sharePath: `/pages/home/index?from=heart-card&day=${dailyContent.dayNumber || 1}`
  };
}

module.exports = {
  STAGE_SEALS,
  HEART_THIEF_BADGES,
  getStageSeal,
  getHeartThiefBadge,
  buildStageSealState,
  buildHeartProofShareCard
};
