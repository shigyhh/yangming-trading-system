const PERSONALITY_FIELDS = [
  "人格画像",
  "惯性动作",
  "典型失控",
  "情绪根源",
  "心学解释",
  "每日事上练",
  "对应戒律",
  "适合修炼方式"
];

const PERSONALITY_TYPES = ["扛单型", "焦虑型", "赌徒型", "完美型", "偏执型", "冲动型", "从众型", "拖延型", "平衡型"];

const PERSONALITY_ARCHIVES = {
  "冲动型": {
    portrait: "看见盘面变化，心先动，手后跟。最需要修的是行动前的十秒空隙。",
    habit: "先行动，再补理由；先被外物牵动，再回头省察。",
    scene: "开盘波动、快速拉升、他人催促时，最容易偏离原计划。",
    root: "怕错过，怕慢一步，内在其实是对机会流失的焦虑。",
    xinxue: "此心被外物牵走，良知尚未开口，动作已经先行。",
    dailyAction: "今日只练：行动前写下理由、边界、离场条件。",
    discipline: "无计划，不开仓。",
    practiceWay: "适合修“停手”和“延迟”，先练慢一拍。"
  },
  "扛单型": {
    portrait: "明知边界已到，仍想再等一等。最需要修的是认错和离场的清明。",
    habit: "把不甘解释成耐心，把拖延包装成信念。",
    scene: "计划失效、亏损扩大、心里开始找理由时，最容易破戒。",
    root: "怕承认评判偏离，怕面对损失后的自我否定。",
    xinxue: "良知已经提醒，私欲却让自己继续解释。",
    dailyAction: "今日只练：触发边界后，十秒内按预案知行合一。",
    discipline: "触发止损，不移动。",
    practiceWay: "适合修“知止”和“省察”，把边界写在行动之前。"
  },
  "完美型": {
    portrait: "想把每一步都做对，因此容易把省察变成责备。",
    habit: "过度检查、过度自责，行动反而变慢。",
    scene: "一次处理不理想后，容易陷入反复推演。",
    root: "害怕犯错背后的失控感，想用完美换安全。",
    xinxue: "省察不是惩罚自己，而是看见下一步可改之处。",
    dailyAction: "今日只练：每次省察只写一个可克治动作。",
    discipline: "一错一改，不责其心。",
    practiceWay: "适合修“减法省察”，把复杂心念收束成一件事。"
  },
  "赌徒型": {
    portrait: "情绪一急，就想用更大的动作找回节奏。",
    habit: "越乱越想动，越不甘越想证明。",
    scene: "连续不顺、想翻回状态、心里出现侥幸时最危险。",
    root: "真正驱动的不是机会，而是不愿停下来的不甘。",
    xinxue: "心贼一起，若不照见，就会把冲动说成勇气。",
    dailyAction: "今日只练：出现想搏一下的念头，立刻记录，不追加动作。",
    discipline: "赌念一起，先降一档。",
    practiceWay: "适合修“破心贼”，先练识别不甘，再练停手。"
  },
  "从众型": {
    portrait: "外部声音越大，自己的计划越容易变小。",
    habit: "用他人的确定感覆盖自己的证据。",
    scene: "社群热闹、朋友观点一致、情绪被带动时容易偏离。",
    root: "怕孤独评判，怕自己承担决定。",
    xinxue: "致良知，是回到自己的证据和规则。",
    dailyAction: "今日只练：盘中不看无关讨论，只看自己的计划卡。",
    discipline: "众声入耳，先问本心。",
    practiceWay: "适合修“独立观心”，减少外部噪声。"
  },
  "偏执型": {
    portrait: "一旦形成评判，就容易只看支持自己的部分。",
    habit: "忽略反向证据，用解释保护原立场。",
    scene: "已有观点、投入时间、被事实反驳时最容易固执。",
    root: "怕承认偏离，怕自己的评判不再成立。",
    xinxue: "格物不是证明自己对，而是让事实照见心。",
    dailyAction: "今日只练：行动前必须写一条反向证据。",
    discipline: "先格物，再立言。",
    practiceWay: "适合修“反证事上练”，用事实磨心。"
  },
  "拖延型": {
    portrait: "知道要省察、要记录、要克治，但总想明天再做。",
    habit: "懂得很多，落地很少；想得很满，行动很轻。",
    scene: "收盘后疲惫、记录麻烦、面对偏差时最容易拖延。",
    root: "害怕面对真实记录后的压力。",
    xinxue: "知而不行，只是未知。知行合一，从一个小动作开始。",
    dailyAction: "今日只练：三分钟写下触发、反应、明日修正。",
    discipline: "今日事，今日省。",
    practiceWay: "适合修“小闭环”，先让动作发生。"
  },
  "焦虑型": {
    portrait: "心随波动起伏，越想确认，越难安定。",
    habit: "频繁查看、反复改念头，用关注换安全感。",
    scene: "开盘前后、浮动变大、消息扰动时最容易乱。",
    root: "想用确定感抵消不确定。",
    xinxue: "静不是不看市场，而是不被每一次波动牵走。",
    dailyAction: "今日只练：固定观察窗口，窗口外只记录心境。",
    discipline: "心乱时，动作要更少。",
    practiceWay: "适合修“定时观心”，把频率降下来。"
  },
  "平衡型": {
    portrait: "能守计划，也能省察，但稳定时最容易放松基本功。",
    habit: "顺的时候容易省略记录，觉得自己已经知道。",
    scene: "连续稳定、状态不错、想简化流程时容易松戒。",
    root: "对稳定的轻忽，会慢慢消耗系统。",
    xinxue: "良知不是一次清醒，而是每日不间断的存养省察。",
    dailyAction: "今日只练：保留每日一省，不因顺手省略基础动作。",
    discipline: "稳定时，更要守一。",
    practiceWay: "适合修“守中”，把稳定变成系统。"
  }
};

function getPersonalityArchive(type) {
  return PERSONALITY_ARCHIVES[type] || PERSONALITY_ARCHIVES["平衡型"];
}

function buildArchiveBlocks(type) {
  const archive = getPersonalityArchive(type);
  return [
    { title: "人格画像", content: archive.portrait },
    { title: "惯性动作", content: archive.habit },
    { title: "典型失控", content: archive.scene },
    { title: "情绪根源", content: archive.root },
    { title: "心学解释", content: archive.xinxue },
    { title: "每日事上练", content: archive.dailyAction },
    { title: "对应戒律", content: archive.discipline },
    { title: "适合修炼方式", content: archive.practiceWay }
  ];
}

module.exports = {
  PERSONALITY_FIELDS,
  PERSONALITY_TYPES,
  PERSONALITY_ARCHIVES,
  getPersonalityArchive,
  buildArchiveBlocks
};
