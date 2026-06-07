export type ZhixingMode = "emergency" | "daily" | "review"

export type ZhixingRealm = "未发之中" | "已发之念" | "知行之印"

export type ZhixingNodeId =
  | "daily-scroll"
  | "today-thought"
  | "heart-thief"
  | "nine-mirror"
  | "daily-evidence"
  | "daily-practice"
  | "liangzhi-seal"
  | "daily-verdict"
  | "heart-archive"
  | "hundred-day-scroll"
  | "course-live"

export type ZhixingMirrorId =
  | "greed"
  | "fear"
  | "urgent"
  | "regret"
  | "gamble"
  | "hold"
  | "chaos"
  | "doubt"
  | "slow"

export type ZhixingSealId =
  | "no-chase"
  | "no-hold"
  | "light-position"
  | "wait"
  | "stop-loss"
  | "review"
  | "rest"
  | "admit-wrong"
  | "reduce-frequency"
  | "keep-rule"
  | "observe"
  | "zhixing"

export type ZhixingScrollNode = {
  id: ZhixingNodeId
  title: string
  realm: ZhixingRealm
  copy: string
  buttonLabel: string
  href: string
}

export type MirrorDefinition = {
  id: ZhixingMirrorId
  name: string
  description: string
  typicalThoughts: string[]
  behaviorRisks: string[]
  correctionPractice: string
  sealId: ZhixingSealId
  courseChapterId: string
  courseTitle: string
  courseCopy: string
  verdictTemplates: string[]
}

export type SealDefinition = {
  id: ZhixingSealId
  name: string
  description: string
  practiceAction: string
  unlockCondition: string
}

export const zhixingScrollNodes: ZhixingScrollNode[] = [
  {
    id: "daily-scroll",
    title: "入照心",
    realm: "未发之中",
    copy: "今日入卷，先照此心。市场未动，心已先动。一念不照，万法皆乱。",
    buttonLabel: "开始照心",
    href: "/assessment-entry",
  },
  {
    id: "today-thought",
    title: "今日一念",
    realm: "已发之念",
    copy: "今日临盘之前，先问自己：此刻最强的一念是什么？",
    buttonLabel: "照见今日一念",
    href: "/assessment",
  },
  {
    id: "heart-thief",
    title: "心贼显影",
    realm: "已发之念",
    copy: "交易中真正伤人的，不是行情，而是藏在心里的心贼。",
    buttonLabel: "识别今日心贼",
    href: "/assessment",
  },
  {
    id: "nine-mirror",
    title: "九镜显影",
    realm: "已发之念",
    copy: "人看市场，常以为自己清醒。镜照回来，才知道自己被哪一念牵走。",
    buttonLabel: "生成今日心镜",
    href: "/assessment-result",
  },
  {
    id: "daily-evidence",
    title: "今日心证",
    realm: "知行之印",
    copy: "心证不是预测行情。心证是你在交易前，对自己立下的一条规则。",
    buttonLabel: "立下今日心证",
    href: "/assessment-result",
  },
  {
    id: "daily-practice",
    title: "今日修行",
    realm: "知行之印",
    copy: "修行不在山中，在临盘一念之间。今日只修一件事。",
    buttonLabel: "确认今日修行",
    href: "/practice-change?preview=1",
  },
  {
    id: "liangzhi-seal",
    title: "良知落印",
    realm: "知行之印",
    copy: "规则不是写给市场看的，是写给自己看的。今日能否知行合一，以此为印。",
    buttonLabel: "落下今日良知印",
    href: "/practice-change?preview=1",
  },
  {
    id: "daily-verdict",
    title: "今日判词",
    realm: "知行之印",
    copy: "今日所修，不在胜负，而在是否照见。照见一念，便少一分被念头牵走。",
    buttonLabel: "生成今日判词",
    href: "/zhixing-scroll#verdict",
  },
  {
    id: "heart-archive",
    title: "心镜归档",
    realm: "知行之印",
    copy: "每一次照见，都是交易心性的痕迹。久而久之，你会看见，真正变化的不是市场，是自己。",
    buttonLabel: "查看心镜档案",
    href: "/mirror-archive",
  },
  {
    id: "hundred-day-scroll",
    title: "连续长卷",
    realm: "知行之印",
    copy: "每一日一镜，每一念一痕。久看长卷，方知自己从何处来，往何处去。",
    buttonLabel: "查看连续长卷",
    href: "/mirror-scroll",
  },
  {
    id: "course-live",
    title: "镜课训练",
    realm: "知行之印",
    copy: "课程不在首页硬卖。它只在你照见今日主镜之后，承接这一镜的训练。",
    buttonLabel: "进入今日镜课",
    href: "#mirror-course",
  },
]

export const sealDefinitions: SealDefinition[] = [
  {
    id: "no-chase",
    name: "不追印",
    description: "念头催你追时，先让规则说话。",
    practiceAction: "今日只守一件事：未到规则，不追。",
    unlockCondition: "识别急镜、悔镜或贪镜后解锁。",
  },
  {
    id: "no-hold",
    name: "不扛印",
    description: "规则已破，不把祈祷当纪律。",
    practiceAction: "今日只守一件事：规则破，先认错。",
    unlockCondition: "识别扛镜后解锁。",
  },
  {
    id: "light-position",
    name: "轻仓印",
    description: "仓位先轻，心才有余地看见。",
    practiceAction: "今日只守一件事：先轻，不以重仓求快。",
    unlockCondition: "识别赌镜或贪镜后解锁。",
  },
  {
    id: "wait",
    name: "等待印",
    description: "错过不是亏，乱动才是亏心。",
    practiceAction: "今日只守一件事：等信号清楚再行动。",
    unlockCondition: "识别急镜、疑镜或慢镜后解锁。",
  },
  {
    id: "stop-loss",
    name: "止损印",
    description: "认错不是失败，是让心回到规则。",
    practiceAction: "今日只守一件事：先按规则处理错误。",
    unlockCondition: "识别扛镜或赌镜后解锁。",
  },
  {
    id: "review",
    name: "复盘印",
    description: "不复盘行情对错，只复盘当时是谁在下单。",
    practiceAction: "今日只守一件事：收盘后写下当时一念。",
    unlockCondition: "完成一次今日心证后解锁。",
  },
  {
    id: "rest",
    name: "休市印",
    description: "心乱时先休，不把疲惫交给市场。",
    practiceAction: "今日只守一件事：心乱则止。",
    unlockCondition: "识别乱镜后解锁。",
  },
  {
    id: "admit-wrong",
    name: "认错印",
    description: "看见错，不再急着证明自己没错。",
    practiceAction: "今日只守一件事：先认错，再复盘。",
    unlockCondition: "识别悔镜、扛镜或疑镜后解锁。",
  },
  {
    id: "reduce-frequency",
    name: "减频印",
    description: "动作少一点，照见就深一点。",
    practiceAction: "今日只守一件事：减少无规则动作。",
    unlockCondition: "识别乱镜或赌镜后解锁。",
  },
  {
    id: "keep-rule",
    name: "守规印",
    description: "规则不是束缚，是帮你从念头里出来。",
    practiceAction: "今日只守一件事：先守既定规则。",
    unlockCondition: "完成九镜显影后解锁。",
  },
  {
    id: "observe",
    name: "静观印",
    description: "先看见心动，再决定是否行动。",
    practiceAction: "今日只守一件事：念起时，停三息。",
    unlockCondition: "完成今日一念后解锁。",
  },
  {
    id: "zhixing",
    name: "知行印",
    description: "知而能行，才算真正照见。",
    practiceAction: "今日只守一件事：把心证落到行动里。",
    unlockCondition: "完成良知落印后解锁。",
  },
]

export const mirrorDefinitions: MirrorDefinition[] = [
  {
    id: "greed",
    name: "贪镜",
    description: "盈利后不愿走，想吃尽所有行情。",
    typicalThoughts: ["再多一点。", "这波不能少赚。"],
    behaviorRisks: ["放大欲望", "忽略原计划", "把已经看见的规则让给贪念"],
    correctionPractice: "先写下离场理由，再评价结果。",
    sealId: "light-position",
    courseChapterId: "course_mirror_greed_01",
    courseTitle: "贪镜：从想多赚回到轻仓规则",
    courseCopy: "如果你经常盈利后不愿离场，想把一段行情吃尽，可以学习《贪镜：从想多赚回到轻仓规则》。",
    verdictTemplates: ["贪念已起，心欲尽取。今日宜守轻仓之印，不以多得为明。"],
  },
  {
    id: "fear",
    name: "惧镜",
    description: "刚有利润就怕失去，过早离场。",
    typicalThoughts: ["先落袋吧。", "万一又没了。"],
    behaviorRisks: ["把恐惧当保护", "用结果否定过程", "离开系统内规则"],
    correctionPractice: "先确认规则是否失效，再决定是否动作。",
    sealId: "observe",
    courseChapterId: "course_mirror_fear_01",
    courseTitle: "惧镜：从害怕失去回到静观规则",
    courseCopy: "如果你经常刚有利润就害怕失去，可以学习《惧镜：从害怕失去回到静观规则》。",
    verdictTemplates: ["惧念生于得失。今日宜观波动，不因小利而乱出。"],
  },
  {
    id: "urgent",
    name: "急镜",
    description: "没等信号就进场，怕错过机会。",
    typicalThoughts: ["再不上就来不及了。", "这次不能错过。"],
    behaviorRisks: ["未等规则清楚就行动", "把错过当亏", "用速度压过纪律"],
    correctionPractice: "临盘先停三息，只守等待印。",
    sealId: "wait",
    courseChapterId: "course_mirror_urgent_01",
    courseTitle: "急镜：从冲动交易回到等待规则",
    courseCopy: "如果你经常因为怕错过而提前进场，可以学习《急镜：从冲动交易回到等待规则》。",
    verdictTemplates: ["急念已起，心欲逐影。今日宜守等待之印，不以错过为亏。"],
  },
  {
    id: "regret",
    name: "悔镜",
    description: "错过后追，亏损后反复自责。",
    typicalThoughts: ["早知道就好了。", "我怎么又这样。"],
    behaviorRisks: ["被过去牵走", "用补偿动作覆盖复盘", "把懊悔变成下一次冲动"],
    correctionPractice: "只写事实，不写责备。",
    sealId: "admit-wrong",
    courseChapterId: "course_mirror_regret_01",
    courseTitle: "悔镜：从懊悔补偿回到认错复盘",
    courseCopy: "如果你经常被错过和自责牵走，可以学习《悔镜：从懊悔补偿回到认错复盘》。",
    verdictTemplates: ["悔念绕心，旧影未散。今日宜守认错之印，不以自责遮住复盘。"],
  },
  {
    id: "gamble",
    name: "赌镜",
    description: "想一把扳回，越亏越重仓。",
    typicalThoughts: ["这把回来了。", "再来一次就能扳回。"],
    behaviorRisks: ["用胜负心替代纪律", "放大情绪交易", "把修正变成押注"],
    correctionPractice: "今日只做系统内动作，动作少于念头。",
    sealId: "reduce-frequency",
    courseChapterId: "course_mirror_gamble_01",
    courseTitle: "赌镜：从胜负心回到减频规则",
    courseCopy: "如果你经常想一把扳回，可以学习《赌镜：从胜负心回到减频规则》。",
    verdictTemplates: ["赌念已动，心欲翻局。今日宜守减频之印，不以一念求翻身。"],
  },
  {
    id: "hold",
    name: "扛镜",
    description: "跌破规则还幻想，止损变成祈祷。",
    typicalThoughts: ["再等等会回来的。", "现在认错太难受。"],
    behaviorRisks: ["把希望当系统", "延迟认错", "让小错拖成长痛"],
    correctionPractice: "先承认规则是否已破，再写下一步。",
    sealId: "no-hold",
    courseChapterId: "course_mirror_hold_01",
    courseTitle: "扛镜：从幻想回本回到不扛规则",
    courseCopy: "如果你经常跌破规则还舍不得认错，可以学习《扛镜：从幻想回本回到不扛规则》。",
    verdictTemplates: ["不甘为贼，幻想为绳。今日所修，不在胜负，在能否及时认错。"],
  },
  {
    id: "chaos",
    name: "乱镜",
    description: "频繁换周期、换逻辑、换理由。",
    typicalThoughts: ["再看另一个周期。", "换个理由也能说通。"],
    behaviorRisks: ["逻辑漂移", "纪律失焦", "让每个念头都有借口"],
    correctionPractice: "只记录一个规则来源，不临盘换逻辑。",
    sealId: "rest",
    courseChapterId: "course_mirror_chaos_01",
    courseTitle: "乱镜：从逻辑漂移回到休市复盘",
    courseCopy: "如果你经常临盘换周期、换逻辑、换理由，可以学习《乱镜：从逻辑漂移回到休市复盘》。",
    verdictTemplates: ["乱念纷起，心无所主。今日宜守休市之印，不让理由替规则开门。"],
  },
  {
    id: "doubt",
    name: "疑镜",
    description: "有规则却不信规则，临盘不断摇摆。",
    typicalThoughts: ["会不会我又看错了。", "再确认一下。"],
    behaviorRisks: ["反复确认", "延误执行", "让规则输给犹疑"],
    correctionPractice: "先写规则，再写怀疑，不让怀疑改规则。",
    sealId: "keep-rule",
    courseChapterId: "course_mirror_doubt_01",
    courseTitle: "疑镜：从反复确认回到守规执行",
    courseCopy: "如果你经常有规则却不敢相信规则，可以学习《疑镜：从反复确认回到守规执行》。",
    verdictTemplates: ["疑念未息，心多回头。今日宜守守规之印，不以摇摆换清明。"],
  },
  {
    id: "slow",
    name: "慢镜",
    description: "该行动时迟疑，该认错时拖延。",
    typicalThoughts: ["再等等也许更稳。", "等一下再处理。"],
    behaviorRisks: ["拖延执行", "错过修正窗口", "把谨慎变成逃避"],
    correctionPractice: "行动前只问一件事：规则是否已经给出答案。",
    sealId: "wait",
    courseChapterId: "course_mirror_slow_01",
    courseTitle: "慢镜：从拖延逃避回到规则回应",
    courseCopy: "如果你经常该行动时迟疑、该认错时拖延，可以学习《慢镜：从拖延逃避回到规则回应》。",
    verdictTemplates: ["慢念成雾，心避其明。今日宜守等待之印，等规则，不等逃避。"],
  },
]

const dailyVerdictByMirrorSeal: Record<ZhixingMirrorId, Partial<Record<ZhixingSealId, string>> & { default: string }> = {
  greed: {
    default: "贪念已起，心欲尽取。今日宜守轻仓之印，不以多得为明。",
    "light-position": "贪念已起，心欲尽取。今日宜守轻仓之印，不以多得为明。",
  },
  fear: {
    default: "惧念生于得失。今日宜观波动，不因小利而乱出。",
    observe: "惧念生于得失。今日宜观波动，不因小利而乱出。",
  },
  urgent: {
    default: "急念已起，心欲逐影。今日宜守等待之印，不以错过为亏。",
    "no-chase": "急念已起，心欲逐影。今日宜守等待之印，不以错过为亏。",
    wait: "急念已起，心欲逐影。今日宜守等待之印，不以错过为亏。",
  },
  regret: {
    default: "悔念绕心，旧影未散。今日宜守认错之印，不以自责遮住复盘。",
    "admit-wrong": "悔念绕心，旧影未散。今日宜守认错之印，不以自责遮住复盘。",
    review: "悔念绕心，旧影未散。今日宜守复盘之印，不以自责遮住事实。",
  },
  gamble: {
    default: "赌念已动，心欲翻局。今日宜守减频之印，不以一念求翻身。",
    "reduce-frequency": "赌念已动，心欲翻局。今日宜守减频之印，不以一念求翻身。",
    "light-position": "赌念已动，心欲翻局。今日宜守轻仓之印，不以重仓求快。",
  },
  hold: {
    default: "不甘为贼，幻想为绳。今日所修，不在胜负，在能否及时认错。",
    "no-hold": "不甘为贼，幻想为绳。今日所修，不在胜负，在能否及时认错。",
    "stop-loss": "不甘为贼，幻想为绳。今日所修，不在胜负，在能否及时认错。",
  },
  chaos: {
    default: "乱念纷起，心无所主。今日宜守休市之印，不让理由替规则开门。",
    rest: "乱念纷起，心无所主。今日宜守休市之印，不让理由替规则开门。",
    "reduce-frequency": "乱念纷起，心无所主。今日宜守减频之印，不让动作追着情绪走。",
  },
  doubt: {
    default: "疑念未息，心多回头。今日宜守守规之印，不以摇摆换清明。",
    "keep-rule": "疑念未息，心多回头。今日宜守守规之印，不以摇摆换清明。",
    observe: "疑念未息，心多回头。今日宜守静观之印，先看见摇摆，再回到规则。",
  },
  slow: {
    default: "慢念成雾，心避其明。今日宜守等待之印，等规则，不等逃避。",
    wait: "慢念成雾，心避其明。今日宜守等待之印，等规则，不等逃避。",
    "admit-wrong": "慢念成雾，心避其明。今日宜守认错之印，不以拖延遮住答案。",
  },
}

export function getMirrorDefinition(id: ZhixingMirrorId) {
  return mirrorDefinitions.find((mirror) => mirror.id === id) ?? mirrorDefinitions[2]
}

export function getSealDefinition(id: ZhixingSealId) {
  return sealDefinitions.find((seal) => seal.id === id) ?? sealDefinitions[3]
}

export function buildMirrorCourseRecommendation(mirrorId: ZhixingMirrorId) {
  const mirror = getMirrorDefinition(mirrorId)
  const seal = getSealDefinition(mirror.sealId)

  return {
    title: mirror.courseTitle,
    copy: mirror.courseCopy,
    buttonLabel: `学习${mirror.name}训练课`,
    href: `/risk-education#${mirror.courseChapterId}`,
    sealName: seal.name,
  }
}

export function buildDailyVerdict(input: {
  primaryMirrorId?: ZhixingMirrorId
  sealId?: ZhixingSealId
  dailyPractice?: string
  behaviorRisks?: string[]
}) {
  const mirror = getMirrorDefinition(input.primaryMirrorId ?? "urgent")
  const seal = getSealDefinition(input.sealId ?? mirror.sealId)
  const verdicts = dailyVerdictByMirrorSeal[mirror.id]

  return verdicts[seal.id] ?? verdicts.default ?? mirror.verdictTemplates[0]
}
