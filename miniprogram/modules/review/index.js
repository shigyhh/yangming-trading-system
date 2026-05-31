const HEART_REVIEW_FIELDS = [
  "今天最大的情绪",
  "今天最想冲动的瞬间",
  "今天有没有破戒",
  "今天哪一笔不是系统内",
  "今天最大的私欲",
  "明日只克治一件事"
];

function getHeartThief(form) {
  if (form.revenge) return "不甘";
  if (form.chased) return "贪急";
  if (form.held) return "不舍";
  if (form.changedPlan) return "摇摆";
  if (!form.inSystem) return "离轨";
  if (form.emotion === "焦虑" || form.emotion === "恐惧") return "惧念";
  if (form.emotion === "贪念") return "贪念";
  return "未明";
}

function getPractice(form) {
  if (form.revenge) return "明日出现想立刻修复状态的念头时，只记录，不追加动作。";
  if (form.chased) return "明日只练行动前十秒停手，先写理由、边界、离场条件。";
  if (form.held) return "明日把边界写在行动前，触发后只按预案知行合一，不再临场辩论。";
  if (form.changedPlan) return "明日所有临时念头先写入待省察，不在盘中改计划。";
  if (!form.inSystem) return "明日只做系统内动作，系统外机会统一记入观察区。";
  if (form.emotion === "焦虑" || form.emotion === "恐惧") return "明日设置固定观察窗口，窗口外只记录心境，不做临时动作。";
  return "明日保留每日一省，把今天最强的一念写下来。";
}

function buildAiReflection(form, context) {
  const safeForm = form || {};
  const mind = context && context.mind ? context.mind : null;
  const assessment = context && context.assessment ? context.assessment : null;
  const heartThief = getHeartThief(safeForm);
  const broken = safeForm.chased || safeForm.held || safeForm.changedPlan || safeForm.revenge || !safeForm.inSystem;
  const mindName = mind ? mind.name : safeForm.emotion || "未照心";
  const type = assessment ? assessment.primary : "未建档";
  const state = Number(safeForm.score || 0) >= 82 ? "守得住" : broken ? "需省察" : "可继续磨";
  const root = broken
    ? `今日的关键不是外物变化，而是“${heartThief}”牵动了行动。`
    : "今日没有明显破戒，重点是继续保持记录，不因稳定而省略基本功。";
  const question = broken
    ? "当你准备偏离原计划时，心里最想保护的是什么？"
    : "今天哪一个小动作，让你更接近知行合一？";

  return {
    state,
    heartThief,
    mindName,
    type,
    root,
    question,
    practice: safeForm.correction ? `明日按你写下的动作克治：${safeForm.correction}` : getPractice(safeForm),
    tags: [
      `心境：${mindName}`,
      `档案：${type}`,
      `知行：${safeForm.score || 0}`
    ]
  };
}

function buildEvidence(form) {
  const safeForm = form || {};
  return [
    { label: "系统边界", value: safeForm.inSystem ? "守住" : "偏离", weak: !safeForm.inSystem },
    { label: "边界知行", value: safeForm.executedStop ? "守住" : "待补", weak: !safeForm.executedStop },
    { label: "临盘变动", value: safeForm.changedPlan ? "有变动" : "未变动", weak: !!safeForm.changedPlan },
    { label: "情绪牵引", value: safeForm.revenge ? "不甘牵动" : safeForm.chased ? "贪急牵动" : safeForm.held ? "不舍牵动" : "较轻", weak: !!(safeForm.revenge || safeForm.chased || safeForm.held) }
  ];
}

function buildAiReplay(form, context) {
  const safeForm = form || {};
  const safeContext = context || {};
  const reflection = safeContext.reflection || buildAiReflection(safeForm, safeContext);
  const training = safeContext.training || {};
  const stepCount = Object.keys(training.steps || {}).filter((key) => training.steps[key]).length;
  const score = Number(safeForm.score || 0);
  const broken = safeForm.chased || safeForm.held || safeForm.changedPlan || safeForm.revenge || !safeForm.inSystem;
  const title = broken ? "知行有缝，先补一处" : "今日基本同频，继续守一";
  const deviation = broken
    ? `你今日最需要省察的不是结果，而是“知道该守”到“真正守住”之间的缝隙。心贼表现为：${reflection.heartThief}。`
    : "今日知与行基本同频，真正要守的是不要因稳定而省略记录。";
  const action = safeForm.correction || reflection.practice;
  const indexImpact = score >= 82
    ? "知行指数会主要受连续稳定影响。"
    : broken
      ? "知行指数会被系统一致性与临盘克制拉低。"
      : "知行指数会随事上练完成度继续上升。";

  return {
    title,
    scoreLabel: score >= 82 ? "稳" : score >= 68 ? "磨" : "省",
    deviation,
    evidence: buildEvidence(safeForm),
    trainingState: training.completed ? "今日修行已闭环" : `今日修行完成 ${stepCount}/3`,
    indexImpact,
    prescription: action,
    closing: broken ? "明日不求多，只修这一处。" : "明日继续每日一省，让稳定可复现。"
  };
}

module.exports = {
  HEART_REVIEW_FIELDS,
  buildAiReflection,
  buildAiReplay
};
