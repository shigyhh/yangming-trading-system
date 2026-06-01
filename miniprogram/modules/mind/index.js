const MIND_STATES = [
  {
    key: "ji",
    glyph: "急",
    name: "急",
    subtitle: "想马上行动",
    discipline: "先停三息，再看计划。",
    taboo: "不因开盘波动临时改规则。",
    practice: "今天只练：任何行动前写下理由、边界、复盘依据。",
    position: "今日行为边界：先确认可承受范围，不因急躁放大动作。",
    reminder: "急不是机会，是心被盘面牵走的提醒。"
  },
  {
    key: "tan",
    glyph: "贪",
    name: "贪",
    subtitle: "想多拿一点",
    discipline: "见利先问：这是计划，还是贪念。",
    taboo: "不因为想扩大结果而加重动作。",
    practice: "今天只练：达到预设条件后，按计划处理，不临场加码。",
    position: "今日行为边界：动作不因兴奋上调，只按盘前规则。",
    reminder: "贪念最会伪装成信心。"
  },
  {
    key: "ju",
    glyph: "惧",
    name: "惧",
    subtitle: "怕错、怕亏、怕动",
    discipline: "恐惧出现时，只回到系统，不回到想象。",
    taboo: "不因恐惧提前否定原计划。",
    practice: "今天只练：把担心写成条件，不把担心当结论。",
    position: "今日行为边界：只做规则允许的最小动作，保持可承受。",
    reminder: "惧不是错，它提醒你要把边界写清。"
  },
  {
    key: "jing",
    glyph: "静",
    name: "静",
    subtitle: "心稳、能等",
    discipline: "静中守一，按计划行。",
    taboo: "不因状态好就放松记录。",
    practice: "今天只练：保持记录，不省略基础动作。",
    position: "今日行为边界：稳定不等于放大，仍按原计划。",
    reminder: "真正的静，是动时也不失其则。"
  },
  {
    key: "nu",
    glyph: "怒",
    name: "怒",
    subtitle: "不服、想证明",
    discipline: "怒起先离屏，不带情绪入事。",
    taboo: "不把证明自己当作系统知行。",
    practice: "今天只练：情绪升高时离开屏幕一分钟。",
    position: "今日行为边界：怒时不加动作，先降频观察。",
    reminder: "怒气最容易把省察变成复仇。"
  },
  {
    key: "pi",
    glyph: "疲",
    name: "疲",
    subtitle: "注意力下降",
    discipline: "疲时少动，先保清明。",
    taboo: "不在疲惫中做复杂评判。",
    practice: "今天只练：只看固定观察点，其余时间休息。",
    position: "今日行为边界：疲惫日降低动作密度，避免被波动牵动。",
    reminder: "疲惫时最该守简。"
  },
  {
    key: "du",
    glyph: "赌",
    name: "赌",
    subtitle: "想搏一下",
    discipline: "赌念一起，当日先降一档。",
    taboo: "不把侥幸解释成盘感。",
    practice: "今天只练：任何想搏一下的念头，都写成省察。",
    position: "今日行为边界：不临场放大，不做补偿式动作。",
    reminder: "赌念不是勇，是不愿面对边界。"
  },
  {
    key: "kong",
    glyph: "空",
    name: "空",
    subtitle: "没方向、没感觉",
    discipline: "无明不动，先观后行。",
    taboo: "不为了找存在感而行动。",
    practice: "今天只练：没有清晰预案时，允许自己不做。",
    position: "今日行为边界：空心日以观察为主，不为填补空白而动作。",
    reminder: "空不是坏事，它给你一次不被市场驱赶的机会。"
  }
];

function getMindState(key) {
  return MIND_STATES.find((item) => item.key === key) || MIND_STATES[3];
}

function buildMindRitual(key) {
  const state = getMindState(key);
  const oneThing = state.practice.replace(/^今天只练：/, "");
  return {
    key: state.key,
    glyph: state.glyph,
    name: state.name,
    subtitle: state.subtitle,
    discipline: state.discipline,
    taboo: state.taboo,
    practice: state.practice,
    oneThing,
    position: state.position,
    reminder: state.reminder,
    indexFocus: buildIndexFocus(state.key),
    zhixingHint: `今日只问：${state.discipline}`,
    createdAt: Date.now()
  };
}

function buildIndexFocus(key) {
  const map = {
    ji: "临盘克制",
    tan: "纪律知行",
    ju: "系统一致性",
    jing: "稳定守一",
    nu: "情绪稳定",
    pi: "动作减法",
    du: "破心贼",
    kong: "知止不动"
  };
  return map[key] || "观心";
}

module.exports = {
  MIND_STATES,
  getMindState,
  buildMindRitual
};
