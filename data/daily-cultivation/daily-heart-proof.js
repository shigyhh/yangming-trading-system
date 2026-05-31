const STAGE_RANGES = [
  { stage: "立志", start: 1, end: 60 },
  { stage: "照心", start: 61, end: 120 },
  { stage: "事上磨", start: 121, end: 180 },
  { stage: "破心贼", start: 181, end: 240 },
  { stage: "知行合一", start: 241, end: 300 },
  { stage: "致良知", start: 301, end: 365 }
];

const REQUIRED_FIELDS = [
  "day",
  "stage",
  "personality",
  "heartProof",
  "commandment",
  "trainingAction",
  "reflectionQuestion",
  "zhixingDimension",
  "shortVideoTitle",
  "directorPrompt",
  "cardCopy"
];

const STAGE_CONTENT = {
  "立志": {
    core: "交易戒律建立",
    personalities: ["拖延型", "冲动型", "焦虑型", "赌徒型", "从众型", "平衡型"],
    dimensions: ["纪律执行", "系统一致性", "主修兑现"],
    heartProofs: [
      "先立其志，再入其事。",
      "无边界之动，最易被心念牵走。",
      "仓位先于交易，戒律先于情绪。",
      "计划不是束缚，是给心一条可走之路。",
      "不做什么，常常比做什么更见功夫。",
      "止损先写，行动才清。",
      "今日只守一戒，胜过空想十理。",
      "心未定，手先停。",
      "规则写在盘前，心才不被盘中改写。",
      "知道何时停止，才算真正开始。"
    ],
    commandments: [
      "无计划，不开仓。",
      "仓位未定，不做决定。",
      "止损未写，不许入场。",
      "纸上没有，盘中不做。",
      "停手线先于开仓。",
      "三项不全，不行动。",
      "今日只守一戒。",
      "看不清，就不做。",
      "规则外的机会，默认错过。",
      "计划不为情绪改宽。"
    ],
    trainingActions: [
      "开盘前写下今日只做什么、不做什么。",
      "写下今日最大仓位，盘中任何念头不得超过它。",
      "每次行动前写下失效点：错到哪里必须离场。",
      "把今日可做动作写成清单，盘中只从清单里选择。",
      "写下今日停止交易的条件：次数、回撤、情绪或疲劳。",
      "行动前写完整三项：为什么进、错了哪里走、对了怎么退。",
      "从计划、仓位、止损中选一项作为今日唯一训练重点。",
      "理由说不清时，只写观察记录，不进入行动。",
      "遇到看起来很好的机会时，先核对是否满足今日计划条件。",
      "出现想改宽计划的念头时，先记录原因，收盘后再评估。"
    ],
    reflectionQuestions: [
      "今天我有没有在计划未立时就想行动？",
      "今天我有没有想用仓位表达信心、焦虑或不甘？",
      "今天我有没有在失效点不清楚时仍想行动？",
      "今天我有没有执行纸上没有的动作？",
      "今天我有没有到停手条件还想继续？",
      "今天我是不是只想着入场，而忽略退出？",
      "今天这一条戒律，我在哪个瞬间最难守？",
      "今天我有没有用模糊理由说服自己行动？",
      "今天我有没有因为机会看起来很好而放宽规则？",
      "今天我有没有因为不甘、害怕或兴奋而改宽规则？"
    ],
    videoAngles: [
      "为什么交易第一课不是看盘，而是立戒？",
      "开盘前这三句话，决定你今天会不会乱动。",
      "仓位先于交易：修行从边界开始。",
      "今天不做什么，才是真正的计划。",
      "止损先写，不是悲观，是清明。",
      "盘前没有规则，盘中就会被情绪立规则。"
    ]
  },
  "照心": {
    core: "识别真实心境",
    personalities: ["冲动型", "焦虑型", "从众型", "赌徒型", "完美型", "平衡型"],
    dimensions: ["情绪稳定", "临盘克制", "主修兑现"],
    heartProofs: [
      "先照此心，再看盘面。",
      "心急时，机会也会变形。",
      "贪念一起，先问自己想得到什么。",
      "惧念一起，先问自己想逃开什么。",
      "怒念一起，先停一息。",
      "疲念一起，少动就是修行。",
      "赌念一起，先降一档。",
      "空念一起，不以无聊求动作。",
      "心外无物，盘中照心。",
      "看见贪惧急怒疲，才有不被牵走的余地。"
    ],
    commandments: [
      "心乱时，动作要更少。",
      "急念出现，先不行动。",
      "贪念出现，不加动作。",
      "惧念出现，不缩短计划。",
      "怒念出现，先离开屏幕一分钟。",
      "疲时少动，先保清明。",
      "赌念一起，先降一档。",
      "无聊时不找动作。",
      "心动时，先记录，不立刻行动。",
      "情绪未命名，不做决定。"
    ],
    trainingActions: [
      "开盘前从贪、惧、急、怒、疲、赌、空、静中选一个真实心境。",
      "出现想马上行动的一刻，先等待10秒并写下急念来源。",
      "出现想多做一点的念头时，只写下它，不增加动作。",
      "担心出现时，把担心改写成一个可检查条件。",
      "出现怒气或不服时，离开屏幕一分钟再回来记录。",
      "如果注意力下降，今日只保留观察和记录，减少行动数量。",
      "出现补偿念头时，暂停30秒，只记录，不追加动作。",
      "无聊时只做盘面观察，不为了找刺激而进入行动。",
      "记录今天最想冲动下单的一刻，并写下当时的心境。",
      "每次行动前先写下：此刻是情绪动作，还是规则动作？"
    ],
    reflectionQuestions: [
      "今天哪一种情绪最先牵动了我？",
      "今天我最急的那一刻，真正怕错过什么？",
      "今天我有没有把贪念说成机会？",
      "今天我有没有用频繁确认换安全感？",
      "今天哪一刻我最想证明自己？",
      "今天我有没有在疲惫中做复杂判断？",
      "今天我有没有用下一笔修复上一笔情绪？",
      "今天我有没有因为无聊而寻找动作？",
      "今天最想冲动下单的那一刻，我真正想满足什么？",
      "今天哪一次行动最像情绪在替我做决定？"
    ],
    videoAngles: [
      "开盘前先照心：今天是谁在替你做决定？",
      "急念不是机会，急念只是心动。",
      "贪、惧、急、怒、疲：盘前五种心境识别。",
      "心乱时动作要更少，这是交易修行的基本功。",
      "为什么无聊也会让交易变形？",
      "开盘照心不是仪式，是盘中少犯错的第一步。"
    ]
  },
  "事上磨": {
    core: "盘中执行",
    personalities: ["冲动型", "扛单型", "赌徒型", "焦虑型", "偏执型", "平衡型"],
    dimensions: ["纪律执行", "临盘克制", "主修兑现"],
    heartProofs: [
      "事上磨练，不在空想里练。",
      "触发来时，才见功夫。",
      "止损执行，是把规则交还给行动。",
      "不追涨，是守住急念的第一关。",
      "不扛单，是承认事实的第一步。",
      "边界到了，不再辩解。",
      "能停手，也是一种执行。",
      "把手慢下来，心才有余地。",
      "规则不是懂的，是做出来的。",
      "今日只练触发时的一次新动作。"
    ],
    commandments: [
      "触发边界，不再辩解。",
      "不追涨。",
      "不扛单。",
      "止损触发，只执行原计划。",
      "连续不顺，先暂停一轮。",
      "行动前先复述规则。",
      "计划外触发，只观察不行动。",
      "不因盘中刺激临时加动作。",
      "手快时，先离开屏幕。",
      "今天只练一个触发点。"
    ],
    trainingActions: [
      "当预设边界触发时，只执行原计划，不再寻找新理由。",
      "看到快速拉升时，先等待10秒，并核对是否在计划内。",
      "出现想扛一下的念头时，写下事实与解释的区别。",
      "触发止损后，30分钟内不做新的补偿动作。",
      "连续两次不顺后，暂停一轮并完成一次呼吸记录。",
      "每次行动前复述一次入场、失效、退出规则。",
      "遇到计划外盘面，只写观察，不进入行动。",
      "盘中想临时增加动作时，先写下是否符合盘前计划。",
      "手想快时，把手离开屏幕15秒。",
      "今天只选择一个触发点训练，并在收盘后复盘它。"
    ],
    reflectionQuestions: [
      "今天触发边界时，我有没有照原计划做？",
      "今天哪一次我最想追着盘面走？",
      "今天我有没有把拖延说成耐心？",
      "今天止损后，我有没有想立刻修复情绪？",
      "今天连续不顺时，我有没有主动暂停？",
      "今天我说过的规则，哪一条真的执行了？",
      "今天哪一次观望本身就是执行？",
      "今天我有没有因为盘中刺激临时加动作？",
      "今天手快之前，我有没有看见心快？",
      "今天这个触发点，我的新动作是什么？"
    ],
    videoAngles: [
      "事上磨：真正的修行发生在触发那一刻。",
      "止损执行，不是认输，是守住规则。",
      "不追涨：先把手慢下来。",
      "不扛单：承认事实，比解释自己更重要。",
      "连续不顺后，真正该练的是停手。",
      "盘中执行力，来自盘前边界。"
    ]
  },
  "破心贼": {
    core: "克服惯性人格",
    personalities: ["赌徒型", "冲动型", "扛单型", "偏执型", "完美型", "从众型"],
    dimensions: ["情绪稳定", "系统一致性", "主修兑现"],
    heartProofs: [
      "破山中贼易，破心中贼难。",
      "心贼不破，规则只是文字。",
      "急念一起，先照见它。",
      "不甘一起，先承认事实。",
      "赌念一起，先降一档。",
      "执念一起，先看反证。",
      "苛责一起，先修一个动作。",
      "随众一起，先问本心。",
      "看见主人格，才有克己之处。",
      "旧反应被看见，新动作才开始。"
    ],
    commandments: [
      "心贼命名前，不做决定。",
      "急念出现，先慢下来。",
      "不甘出现，不移动边界。",
      "赌念出现，先暂停。",
      "执念出现，先写反向证据。",
      "苛责出现，只修一个动作。",
      "众声入耳，先问本心。",
      "旧反应出现，先写下来。",
      "人格触发时，先回到主修关卡。",
      "今天只破一个心贼。"
    ],
    trainingActions: [
      "行动前先命名当前心贼：急、不甘、赌、惧、苛责、随众或执己。",
      "出现急念时等待10秒，并写下旧反应是什么。",
      "出现不甘时，不移动边界，只记录事实。",
      "出现赌念时，暂停30秒，只做心境记录。",
      "行动前写下一条反向证据，再决定是否仍符合计划。",
      "复盘只写一个可修正动作，不做长篇自责。",
      "听到外部观点后，先对照自己的计划卡。",
      "把今天最强的旧反应写成一句话，再改成新动作。",
      "根据当前人格，把今日训练归回一条主修关卡。",
      "今天只选择一个心贼训练，并在收盘后给它命名。"
    ],
    reflectionQuestions: [
      "今天是哪一个心贼在替我做决定？",
      "今天急念出现时，我有没有让手慢下来？",
      "今天我有没有把不甘包装成理由？",
      "今天我有没有用下一笔修复上一笔情绪？",
      "今天我有没有忽略反向证据？",
      "今天复盘是在修动作，还是在责备自己？",
      "今天我有没有让外部声音替代自己的计划？",
      "今天最强的旧反应是什么？",
      "今天我的主人格把我带回哪一种惯性？",
      "今天这个心贼被我看见了吗？"
    ],
    videoAngles: [
      "破心贼：交易里最难破的不是盘面，是自己。",
      "急、不甘、赌：三种最常见的盘中心贼。",
      "扛单背后，其实是不愿认错。",
      "冲动背后，其实是怕错过。",
      "从众背后，是把自己的计划交给别人。",
      "复盘不是责备自己，而是破一个旧反应。"
    ]
  },
  "知行合一": {
    core: "系统执行一致性",
    personalities: ["扛单型", "从众型", "偏执型", "冲动型", "焦虑型", "平衡型"],
    dimensions: ["纪律执行", "系统一致性", "临盘克制", "主修兑现"],
    heartProofs: [
      "真知必能行，未行仍需再知。",
      "说过的计划，要成为盘中的动作。",
      "知行差一寸，盘中差千里。",
      "不临盘改计划，是对自己说过的话负责。",
      "计划与行动对得上，心才慢慢稳定。",
      "执行不是热血，是一致。",
      "今日只问：我有没有照做。",
      "系统内行动，才有可复盘之处。",
      "知行合一，从一次对照开始。",
      "把判断交给规则，把修正交给复盘。"
    ],
    commandments: [
      "不临盘改计划。",
      "说过的边界，不在盘中移动。",
      "计划外动作，不计入执行。",
      "盘中只执行，盘后再修正。",
      "外部声音不替代计划。",
      "结果不改写过程。",
      "今日只检查是否照做。",
      "系统外动作，必须如实记录。",
      "知与行不一致，先不解释。",
      "连续执行，胜过临场聪明。"
    ],
    trainingActions: [
      "盘前写下一个动作标准，盘后只检查是否照做。",
      "今天任何边界都不在盘中移动，只在收盘后评估。",
      "每次行动后标记：系统内或系统外。",
      "盘中出现想修正规则的念头时，先记录，收盘后再处理。",
      "听到外部观点后，先问是否改变原计划条件。",
      "收盘复盘时先看是否执行计划，再看结果好坏。",
      "今天只检查一条规则是否被完整执行。",
      "如果出现系统外动作，立刻写下触发心境。",
      "知行不一致时，只记录事实，不找理由。",
      "连续三次行动都按同一个流程核对后再执行。"
    ],
    reflectionQuestions: [
      "今天我说过的计划，哪一条真正落地了？",
      "今天我有没有在盘中移动边界？",
      "今天哪些动作属于系统内？哪些属于系统外？",
      "今天我有没有把盘中修正规则说成灵活？",
      "今天外部声音有没有改变我的原计划？",
      "今天我有没有因为结果好就原谅过程变形？",
      "今天这一条规则，我是否完整执行？",
      "今天系统外动作由什么心境触发？",
      "今天知与行不一致的地方在哪里？",
      "今天连续执行时，我在哪一步最想省略？"
    ],
    videoAngles: [
      "知行合一：不是懂很多，而是照做一次。",
      "为什么盘中不要临时改计划？",
      "说过的边界，盘中不要移动。",
      "交易复盘先看执行，不先看结果。",
      "系统内和系统外，是知行指数的分水岭。",
      "连续执行，才是交易者真正的稳定感。"
    ]
  },
  "致良知": {
    core: "稳定成熟交易者",
    personalities: ["平衡型", "完美型", "偏执型", "焦虑型", "扛单型", "从众型"],
    dimensions: ["情绪稳定", "系统一致性", "主修兑现"],
    heartProofs: [
      "稳定不是状态，是每日存养。",
      "良知不是一句话，是每次回到清明。",
      "成熟，是不靠情绪也能守住系统。",
      "无人提醒时仍能自省，才见功夫。",
      "修行到后来，是更早看见自己。",
      "不求一次完美，只求每日不失其心。",
      "清明不是没有波动，而是不被波动带走。",
      "守一，是在平静时也不省略基础功。",
      "长期稳定，来自每天一个小修正。",
      "致良知，是把省察变成自己的本能。"
    ],
    commandments: [
      "稳定时，更要守一。",
      "无人提醒，也要复盘。",
      "只修正一个最关键动作。",
      "不以一时状态代替流程。",
      "情绪更早被看见，动作更少被带走。",
      "复盘不求长，只求真。",
      "成熟不省略基础功。",
      "每日保留一条省察。",
      "长期看趋势，不被单日牵走。",
      "今日仍从一个小动作开始。"
    ],
    trainingActions: [
      "完成一次自主复盘，只写一个明日修正动作。",
      "收盘后不等提醒，主动记录今天最早看见自己的瞬间。",
      "从今天所有动作中选一个最关键修正，并写成明日戒律。",
      "状态好时也完整走一遍计划、仓位、止损核对。",
      "记录今天情绪出现到被看见之间隔了多久。",
      "复盘只写事实、触发、新动作，不写长篇评价。",
      "今天按基础流程完成一次完整训练，不因熟悉而省略。",
      "写下一条今日省察，并把它转成明日训练动作。",
      "查看近7天知行指数趋势，只记录一个最需要稳定的维度。",
      "选择一个小动作重复执行，完成后给自己一次真实记录。"
    ],
    reflectionQuestions: [
      "今天我有没有更早看见自己？",
      "今天没有提醒时，我有没有主动复盘？",
      "今天最关键的一个修正动作是什么？",
      "今天状态好时，我有没有省略基础流程？",
      "今天情绪出现后，我多久才看见它？",
      "今天复盘有没有回到事实和动作？",
      "今天我有没有因为熟悉而松掉基础功？",
      "今天这条省察，明天能变成什么动作？",
      "近7天最需要稳定的是哪个知行维度？",
      "今天这个小动作，我有没有真实完成？"
    ],
    videoAngles: [
      "致良知：成熟不是冷静一次，而是每天自省一次。",
      "稳定以后，最容易丢掉基础功。",
      "无人提醒时仍能复盘，才是真正的修行。",
      "长期稳定来自每天一个小修正。",
      "清明不是没有情绪，而是不被情绪带走。",
      "交易修行的后半段，是更早看见自己。"
    ]
  }
};

const DAILY_CULTIVATION_SCHEMA = {
  version: "v1",
  totalDays: 365,
  principle: "365天心证库不是励志金句库，而是心证、戒律、训练、省察、视频号、卡片共用的每日修行数据源。",
  stageRanges: STAGE_RANGES,
  requiredFields: REQUIRED_FIELDS,
  reusableIn: ["小程序", "网页", "视频号", "AI观心教练", "训练卡片"],
  compliance: [
    "不提供具体标的方向。",
    "不输出行情判断。",
    "不承诺结果。",
    "不展示具体代码。",
    "所有内容只服务交易认知、行为训练与风险教育。"
  ]
};

function padDay(dayNumber) {
  return String(dayNumber).padStart(3, "0");
}

function normalizeDayNumber(day) {
  if (typeof day === "number") return day;
  if (typeof day !== "string") return 1;
  const match = day.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function getStageRange(day) {
  const dayNumber = normalizeDayNumber(day);
  return STAGE_RANGES.find((item) => dayNumber >= item.start && dayNumber <= item.end) || STAGE_RANGES[0];
}

function getStageOffset(dayNumber, stageRange) {
  return dayNumber - stageRange.start;
}

function pick(list, index) {
  return list[index % list.length];
}

function buildCardCopy(item) {
  return [
    `${item.day}｜${item.stage}`,
    `心证：${item.heartProof}`,
    `戒律：${item.commandment}`,
    `今日训练：${item.trainingAction}`,
    `省察：${item.reflectionQuestion}`
  ].join("\n");
}

function buildDirectorPrompt(stage, personality, videoTitle, trainingAction, reflectionQuestion) {
  return [
    `以“${stage}”为主修关卡，面向${personality}交易者。`,
    `开头用一个盘前或盘中触发瞬间引入：${videoTitle}`,
    `中段点出心念如何带动旧反应，再落到今日训练：${trainingAction}`,
    `结尾不要给操作方向，只留下省察问题：${reflectionQuestion}`
  ].join("");
}

function buildDailyCultivationItem(dayNumber) {
  const safeDay = Math.max(1, Math.min(365, normalizeDayNumber(dayNumber)));
  const stageRange = getStageRange(safeDay);
  const stage = stageRange.stage;
  const stageContent = STAGE_CONTENT[stage];
  const offset = getStageOffset(safeDay, stageRange);
  const videoAngle = pick(stageContent.videoAngles, offset);
  const personality = pick(stageContent.personalities, offset);

  const item = {
    day: `Day${padDay(safeDay)}`,
    stage,
    personality,
    heartProof: pick(stageContent.heartProofs, offset),
    commandment: pick(stageContent.commandments, offset),
    trainingAction: pick(stageContent.trainingActions, offset),
    reflectionQuestion: pick(stageContent.reflectionQuestions, offset),
    zhixingDimension: pick(stageContent.dimensions, offset),
    shortVideoTitle: `${stage}篇｜${videoAngle}`,
    directorPrompt: "",
    cardCopy: ""
  };

  item.directorPrompt = buildDirectorPrompt(
    item.stage,
    item.personality,
    item.shortVideoTitle,
    item.trainingAction,
    item.reflectionQuestion
  );
  item.cardCopy = buildCardCopy(item);

  return item;
}

function validateDailyCultivationItem(item) {
  if (!item || typeof item !== "object") return false;
  return REQUIRED_FIELDS.every((field) => {
    const value = item[field];
    return value !== undefined && value !== null && value !== "";
  });
}

function getDailyCultivationByDay(day) {
  return buildDailyCultivationItem(normalizeDayNumber(day));
}

const DAILY_HEART_PROOFS = Array.from({ length: 365 }, (_, index) => {
  return buildDailyCultivationItem(index + 1);
});

module.exports = {
  DAILY_CULTIVATION_SCHEMA,
  STAGE_RANGES,
  STAGE_CONTENT,
  DAILY_HEART_PROOFS,
  buildDailyCultivationItem,
  getDailyCultivationByDay,
  validateDailyCultivationItem
};
