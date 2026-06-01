const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { buildStageState } = require("../stages/index");

const COACH_INTERFACE_SCHEMA = {
  version: "v1",
  role: "AI观心教练",
  input: [
    "user_emotion",
    "user_review",
    "user_question",
    "personality_type",
    "current_stage",
    "heart_thief",
    "today_training",
    "today_commandment"
  ],
  output: [
    "trigger_personality",
    "current_heart_thief",
    "suggestion",
    "today_only_practice",
    "commandment_reminder",
    "coach_note"
  ],
  boundary: "只做观心、戒律、事上练动作，不输出操作判断、具体标的、结果承诺。"
};

function inferTriggerFromText(text = "") {
  const value = String(text || "");
  if (/止损后|追回|追.*回|追回去|追单|又追|马上动|立刻/.test(value)) {
    return {
      personality: "冲动型",
      heartThief: "急",
      stageKey: "shishangmo",
      stageName: "第三关：事上磨",
      training: "止损后30分钟不下单，只记录当时那一念。"
    };
  }
  if (/扛|舍不得|不想认错|再等等|拿着/.test(value)) {
    return {
      personality: "扛单型",
      heartThief: "不愿认错",
      stageKey: "zhixing",
      stageName: "第五关：知行合一",
      training: "触发边界后，只按原计划知行合一，不再补理由。"
    };
  }
  if (/翻本|搏|赌|加仓|重仓|不甘/.test(value)) {
    return {
      personality: "赌徒型",
      heartThief: "急于补回",
      stageKey: "shishangmo",
      stageName: "第三关：事上磨",
      training: "连续不顺后，只允许降频观察，不追加动作。"
    };
  }
  if (/害怕|焦虑|睡不着|一直看|反复看/.test(value)) {
    return {
      personality: "焦虑型",
      heartThief: "求确定",
      stageKey: "zhaoxin",
      stageName: "第二关：照心",
      training: "只在固定窗口观察，窗口外只记录心境。"
    };
  }
  return null;
}

function buildCoachInput(context = {}) {
  const assessment = context.assessment || null;
  const userQuestion = context.question || "";
  const inferred = inferTriggerFromText(userQuestion);
  const personalityType = inferred ? inferred.personality : (assessment ? assessment.primary : "平衡型");
  const plan = getPersonalityStagePlan(personalityType);
  const stageState = buildStageState(context);

  return {
    user_emotion: (context.mind || {}).name || "",
    user_review: context.todayReview || null,
    user_question: userQuestion,
    personality_type: personalityType,
    current_stage: inferred ? inferred.stageName : stageState.currentStage.name,
    heart_thief: inferred ? inferred.heartThief : plan.heartThief,
    today_training: inferred ? inferred.training : plan.training,
    today_commandment: plan.commandment,
    inferred_stage_key: inferred ? inferred.stageKey : stageState.currentStage.key
  };
}

function buildCoachOutput(input = {}) {
  const heartThief = input.heart_thief || "未照见";
  const currentStage = input.current_stage || "立志";
  return {
    trigger_personality: input.personality_type || "平衡型",
    current_heart_thief: heartThief,
    suggestion: `回到${currentStage}，先把动作降到一件可知行合一的小事。`,
    today_only_practice: input.today_training || "完成一次照心、一次事上练、一次省察。",
    commandment_reminder: input.today_commandment || "无计划，不行动。",
    coach_note: `这不是市场之事，先照见“${heartThief}”这一念。`
  };
}

function previewCoach(context = {}) {
  const input = buildCoachInput(context);
  return {
    input,
    output: buildCoachOutput(input),
    model_status: "reserved",
    model_note: "接口结构已预留，暂未接入真实AI模型。"
  };
}

module.exports = {
  COACH_INTERFACE_SCHEMA,
  buildCoachInput,
  buildCoachOutput,
  inferTriggerFromText,
  previewCoach
};
