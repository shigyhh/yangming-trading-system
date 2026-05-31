const DAILY_HEART_PROOF_SCHEMA = {
  version: "v1",
  totalTarget: 365,
  sampleRange: "Day001-Day030",
  principle: "365天心证是每天的精神主题，365天训练库是每天的行为动作，二者必须一一对应。",
  chain: ["人格识别", "主修关卡", "每日训练", "知行指数", "关卡进度"],
  consumers: ["小程序", "网页", "视频号", "AI观心教练"],
  stagePlan: [
    { stage: "立志", range: "Day001-Day060", theme: "建立交易戒律" },
    { stage: "照心", range: "Day061-Day120", theme: "识别真实心境" },
    { stage: "事上磨", range: "Day121-Day180", theme: "让规则进入行动" },
    { stage: "破心贼", range: "Day181-Day240", theme: "克服人格惯性" },
    { stage: "知行合一", range: "Day241-Day300", theme: "计划与执行一致" },
    { stage: "致良知", range: "Day301-Day365", theme: "形成成熟交易人格" }
  ],
  requiredFields: [
    "day",
    "stage",
    "title",
    "heartProof",
    "commandment",
    "trainingAction",
    "reflectionQuestion",
    "targetPersonalities",
    "scoreDimensions"
  ],
  stages: ["立志", "照心", "事上磨", "破心贼", "知行合一", "致良知"],
  personalities: ["冲动型", "扛单型", "赌徒型", "焦虑型", "完美型", "从众型", "偏执型", "拖延型", "平衡型"],
  scoreDimensions: ["纪律执行", "情绪稳定", "系统一致性", "临盘克制", "主修兑现"]
};

const DAILY_HEART_PROOFS = [
  {
    day: "Day001",
    stage: "立志",
    title: "先立其志，再入其事",
    heartProof: "先立其志，再入其事。",
    commandment: "无计划，不开仓。",
    trainingAction: "开盘前写下今日只做什么、不做什么。",
    reflectionQuestion: "今天我有没有在计划未立时就想行动？",
    targetPersonalities: ["拖延型", "冲动型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day002",
    stage: "立志",
    title: "知而不行，只是未知",
    heartProof: "知而不行，只是未知。",
    commandment: "下单前，先复述规则。",
    trainingAction: "下单前必须复述一次入场规则、止损规则、退出规则。",
    reflectionQuestion: "今天我有没有明知规则，却在行动时跳过它？",
    targetPersonalities: ["拖延型", "扛单型", "冲动型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day003",
    stage: "立志",
    title: "心外无物，盘中照心",
    heartProof: "心外无物，盘中照心。",
    commandment: "心动时，先记录，不立刻行动。",
    trainingAction: "记录今天最想冲动下单的一刻，并写下当时的心境。",
    reflectionQuestion: "今天最想冲动下单的那一刻，我真正想满足什么？",
    targetPersonalities: ["冲动型", "赌徒型", "焦虑型"],
    scoreDimensions: ["情绪稳定", "临盘克制", "主修兑现"]
  },
  {
    day: "Day004",
    stage: "立志",
    title: "仓位先于交易",
    heartProof: "仓位先于交易，戒律先于情绪。",
    commandment: "仓位未定，不做决定。",
    trainingAction: "写下今日最大仓位，任何临场冲动都不得超过它。",
    reflectionQuestion: "今天我有没有想用仓位表达信心、焦虑或不甘？",
    targetPersonalities: ["赌徒型", "焦虑型", "从众型"],
    scoreDimensions: ["纪律执行", "系统一致性"]
  },
  {
    day: "Day005",
    stage: "立志",
    title: "止损先写，行动才清",
    heartProof: "没有止损规则的行动，不算交易计划。",
    commandment: "止损未写，不许入场。",
    trainingAction: "每次行动前写下失效点：错到哪里必须离场。",
    reflectionQuestion: "今天我有没有在失效点不清楚时仍想行动？",
    targetPersonalities: ["扛单型", "偏执型", "冲动型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day006",
    stage: "立志",
    title: "今日只练一件事",
    heartProof: "修行不求多，只求一事落地。",
    commandment: "今天只守一条戒律。",
    trainingAction: "从计划、仓位、止损中选一项作为今日唯一训练重点。",
    reflectionQuestion: "今天这一件事，我有没有真正做到？",
    targetPersonalities: ["拖延型", "完美型", "平衡型"],
    scoreDimensions: ["纪律执行", "主修兑现"]
  },
  {
    day: "Day007",
    stage: "立志",
    title: "不做什么，也要写清",
    heartProof: "真正的计划，包含今天不做什么。",
    commandment: "不在禁忌里寻找机会。",
    trainingAction: "写下今日三条不做清单：不追、不扛、不补偿。",
    reflectionQuestion: "今天我有没有把不该做的事包装成机会？",
    targetPersonalities: ["冲动型", "赌徒型", "扛单型"],
    scoreDimensions: ["纪律执行", "临盘克制", "系统一致性"]
  },
  {
    day: "Day008",
    stage: "立志",
    title: "交易前先读计划",
    heartProof: "计划放在下单按钮前面。",
    commandment: "没有读计划，不许下单。",
    trainingAction: "每次行动前读一次今日计划卡，再决定是否执行。",
    reflectionQuestion: "今天我有没有在没读计划时就靠感觉行动？",
    targetPersonalities: ["冲动型", "从众型", "拖延型"],
    scoreDimensions: ["系统一致性", "纪律执行"]
  },
  {
    day: "Day009",
    stage: "立志",
    title: "计划要能被检查",
    heartProof: "不能检查的计划，只是愿望。",
    commandment: "规则必须写成可判断条件。",
    trainingAction: "把今日计划改写成三个可检查条件：若A，则B；若失效，则C。",
    reflectionQuestion: "今天我的计划是条件，还是模糊期待？",
    targetPersonalities: ["完美型", "偏执型", "焦虑型"],
    scoreDimensions: ["系统一致性", "主修兑现"]
  },
  {
    day: "Day010",
    stage: "立志",
    title: "先定停手线",
    heartProof: "知道何时停止，才算真正开始。",
    commandment: "停手线先于开仓。",
    trainingAction: "写下今日停止交易的条件：次数、亏损、情绪或疲劳。",
    reflectionQuestion: "今天我有没有到停手条件还想继续？",
    targetPersonalities: ["赌徒型", "焦虑型", "冲动型"],
    scoreDimensions: ["纪律执行", "临盘克制"]
  },
  {
    day: "Day011",
    stage: "立志",
    title: "机会再好，也要经过规则",
    heartProof: "机会不能越过戒律。",
    commandment: "规则外的机会，默认错过。",
    trainingAction: "遇到看起来很好的机会时，先检查是否满足今日计划条件。",
    reflectionQuestion: "今天我有没有因为机会看起来很好而放宽规则？",
    targetPersonalities: ["冲动型", "从众型", "赌徒型"],
    scoreDimensions: ["纪律执行", "系统一致性", "临盘克制"]
  },
  {
    day: "Day012",
    stage: "立志",
    title: "先小后稳",
    heartProof: "仓位越小，越容易看清自己的反应。",
    commandment: "训练日不放大仓位。",
    trainingAction: "今日所有行动只允许在训练仓位内完成，重点观察反应。",
    reflectionQuestion: "今天仓位变化有没有改变我的心境？",
    targetPersonalities: ["焦虑型", "赌徒型", "扛单型"],
    scoreDimensions: ["情绪稳定", "纪律执行", "系统一致性"]
  },
  {
    day: "Day013",
    stage: "立志",
    title: "不让上一笔决定下一笔",
    heartProof: "上一笔已经结束，下一笔仍须按计划开始。",
    commandment: "不做补偿式行动。",
    trainingAction: "每次新行动前，先写下它是否独立符合今日规则。",
    reflectionQuestion: "今天下一笔行动有没有被上一笔情绪牵动？",
    targetPersonalities: ["赌徒型", "冲动型", "扛单型"],
    scoreDimensions: ["情绪稳定", "系统一致性", "临盘克制"]
  },
  {
    day: "Day014",
    stage: "立志",
    title: "模糊时不行动",
    heartProof: "模糊是情绪接管的入口。",
    commandment: "看不清，就不做。",
    trainingAction: "当理由说不清时，只写观察记录，不进入行动。",
    reflectionQuestion: "今天我有没有用模糊理由说服自己行动？",
    targetPersonalities: ["焦虑型", "偏执型", "冲动型"],
    scoreDimensions: ["临盘克制", "系统一致性"]
  },
  {
    day: "Day015",
    stage: "立志",
    title: "入场、止损、退出一起写",
    heartProof: "只写入场，不算完整计划。",
    commandment: "三项不全，不行动。",
    trainingAction: "每次行动前写完整三项：为什么进、错了哪里走、对了怎么退。",
    reflectionQuestion: "今天我是不是只想着入场，而忽略退出？",
    targetPersonalities: ["拖延型", "冲动型", "扛单型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day016",
    stage: "立志",
    title: "今天不证明自己",
    heartProof: "交易不是证明自己的地方。",
    commandment: "想证明时，先不行动。",
    trainingAction: "当出现想证明自己没错、很强、很准时，先暂停一分钟。",
    reflectionQuestion: "今天我有没有把行动变成证明自己？",
    targetPersonalities: ["偏执型", "赌徒型", "完美型"],
    scoreDimensions: ["情绪稳定", "临盘克制"]
  },
  {
    day: "Day017",
    stage: "立志",
    title: "今日事，今日省",
    heartProof: "不把修正推给明天。",
    commandment: "收盘后三分钟必须记录。",
    trainingAction: "收盘后三分钟写下触发、反应、明日修正。",
    reflectionQuestion: "今天我完成了一个动作，还是只想明白？",
    targetPersonalities: ["拖延型", "平衡型"],
    scoreDimensions: ["纪律执行", "主修兑现"]
  },
  {
    day: "Day018",
    stage: "立志",
    title: "规则先于手感",
    heartProof: "手感会变，规则要先在。",
    commandment: "不因手感好放宽计划。",
    trainingAction: "状态好时也照常执行计划核对，不额外增加动作。",
    reflectionQuestion: "今天我有没有因为状态好而省略规则？",
    targetPersonalities: ["平衡型", "从众型", "赌徒型"],
    scoreDimensions: ["系统一致性", "纪律执行"]
  },
  {
    day: "Day019",
    stage: "立志",
    title: "疲惫时先减量",
    heartProof: "疲惫不是硬扛的理由。",
    commandment: "疲时少动，先保清明。",
    trainingAction: "如果注意力下降，今日只保留观察和记录，减少行动数量。",
    reflectionQuestion: "今天我有没有在疲惫中做复杂判断？",
    targetPersonalities: ["焦虑型", "完美型", "平衡型"],
    scoreDimensions: ["情绪稳定", "临盘克制"]
  },
  {
    day: "Day020",
    stage: "立志",
    title: "把风险写在收益前面",
    heartProof: "先看会错到哪里，再看可能对到哪里。",
    commandment: "风险不清楚，不行动。",
    trainingAction: "每次行动前先写最大可承受风险，再写行动理由。",
    reflectionQuestion: "今天我有没有先想结果，后想风险？",
    targetPersonalities: ["赌徒型", "从众型", "冲动型"],
    scoreDimensions: ["纪律执行", "系统一致性"]
  },
  {
    day: "Day021",
    stage: "立志",
    title: "计划不为情绪改宽",
    heartProof: "情绪上来时，计划更要窄。",
    commandment: "临场不放宽规则。",
    trainingAction: "出现想改宽计划的念头时，先记录原因，收盘后再评估。",
    reflectionQuestion: "今天我有没有因为不甘、害怕或兴奋而改宽规则？",
    targetPersonalities: ["扛单型", "赌徒型", "焦虑型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day022",
    stage: "立志",
    title: "只做写在纸上的交易",
    heartProof: "没有写下来的规则，盘中最容易变形。",
    commandment: "纸上没有，盘中不做。",
    trainingAction: "把今日可做动作写成清单，盘中只从清单里选择。",
    reflectionQuestion: "今天我有没有执行纸上没有的动作？",
    targetPersonalities: ["冲动型", "拖延型", "从众型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  },
  {
    day: "Day023",
    stage: "立志",
    title: "不让别人替我立志",
    heartProof: "别人的确定，不是我的戒律。",
    commandment: "众声入耳，先问本心。",
    trainingAction: "听到外部观点后，先对照自己的计划卡，不直接行动。",
    reflectionQuestion: "今天我有没有让外部声音替代自己的计划？",
    targetPersonalities: ["从众型", "焦虑型"],
    scoreDimensions: ["系统一致性", "临盘克制"]
  },
  {
    day: "Day024",
    stage: "立志",
    title: "一日一戒",
    heartProof: "每天守住一条戒律，胜过空想十条道理。",
    commandment: "今日只守一戒。",
    trainingAction: "从不追、不扛、不补偿、不临盘改计划中选一条作为今日戒律。",
    reflectionQuestion: "今天这条戒律，我在哪个瞬间最难守？",
    targetPersonalities: ["冲动型", "扛单型", "赌徒型", "平衡型"],
    scoreDimensions: ["纪律执行", "主修兑现"]
  },
  {
    day: "Day025",
    stage: "立志",
    title: "先问是否系统内",
    heartProof: "系统外的行动，再漂亮也不是修行。",
    commandment: "系统外，不参与。",
    trainingAction: "每次行动前回答：这是系统内动作，还是情绪动作？",
    reflectionQuestion: "今天哪一次我最想把系统外动作说成机会？",
    targetPersonalities: ["赌徒型", "冲动型", "偏执型"],
    scoreDimensions: ["系统一致性", "纪律执行"]
  },
  {
    day: "Day026",
    stage: "立志",
    title: "先承认看不懂",
    heartProof: "承认看不懂，是保护判断力。",
    commandment: "看不懂时保持观望。",
    trainingAction: "遇到看不懂的盘面，只写观察，不强行归因。",
    reflectionQuestion: "今天我有没有为了显得懂而强行解释？",
    targetPersonalities: ["偏执型", "完美型", "焦虑型"],
    scoreDimensions: ["情绪稳定", "系统一致性"]
  },
  {
    day: "Day027",
    stage: "立志",
    title: "开盘前先写今日规则",
    heartProof: "开盘前没有规则，盘中就会被刺激立规则。",
    commandment: "开盘前完成计划卡。",
    trainingAction: "开盘前写下今日规则，并在盘中只做检查，不做发明。",
    reflectionQuestion: "今天我有没有盘中临时发明规则？",
    targetPersonalities: ["冲动型", "拖延型", "从众型"],
    scoreDimensions: ["纪律执行", "系统一致性", "临盘克制"]
  },
  {
    day: "Day028",
    stage: "立志",
    title: "不以结果倒推规则",
    heartProof: "结果不能替代过程判断。",
    commandment: "只复盘是否执行，不用结果改写规则。",
    trainingAction: "收盘复盘时先判断是否执行计划，再看结果好坏。",
    reflectionQuestion: "今天我有没有因为结果好就原谅过程变形？",
    targetPersonalities: ["完美型", "偏执型", "平衡型"],
    scoreDimensions: ["系统一致性", "主修兑现"]
  },
  {
    day: "Day029",
    stage: "立志",
    title: "今日允许错过",
    heartProof: "错过不是亏损，乱做才是失守。",
    commandment: "宁可错过，不乱做。",
    trainingAction: "今天记录一次主动错过的机会，并写下为什么没有行动。",
    reflectionQuestion: "今天我能不能把错过也视为执行？",
    targetPersonalities: ["冲动型", "从众型", "赌徒型"],
    scoreDimensions: ["临盘克制", "纪律执行", "主修兑现"]
  },
  {
    day: "Day030",
    stage: "立志",
    title: "把自己交给流程",
    heartProof: "流程稳定，心才有可依之处。",
    commandment: "先流程，后判断。",
    trainingAction: "今日每次行动都按固定流程走：照心、读计划、查仓位、确认止损。",
    reflectionQuestion: "今天我在哪一步最容易跳过流程？",
    targetPersonalities: ["拖延型", "焦虑型", "冲动型", "平衡型"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"]
  }
];

module.exports = {
  DAILY_HEART_PROOF_SCHEMA,
  DAILY_HEART_PROOFS
};
