export type TrainingThoughtType =
  | "fomo"
  | "chase"
  | "fear_missing"
  | "want_chase"
  | "wait_pullback"
  | "ask_others"
  | "abandon_plan"

export type EvidenceThoughtType =
  | "fomo"
  | "chase"
  | "wait_pullback"
  | "ask_others"
  | "abandon_plan"

export type TrainingCheckinType =
  | "ready"
  | "observe"
  | "traded"
  | "preparing_trade"
  | "observe_only"
  | "already_traded"

export type EvidenceBaselineScores = {
  emptyPositionAnxiety?: number
  chaseImpulse?: number
  stopLossExecution?: number
  planChange?: number
  knowingDoing?: number
}

export type EvidenceEngineInput = {
  trainingDay?: number
  completedDays?: number
  checkinType?: TrainingCheckinType | string
  thoughtType?: TrainingThoughtType | string
  thoughtLabel?: string
  reflectionText?: string
  completedAt?: string
  baselineScores?: EvidenceBaselineScores
  userId?: string
}

export type EvidenceResult = {
  evidenceItems: string[]
  dailySealText: string
  nextActionText: string
  affectedDimensions: string[]
}

export type AssistantSummaryPreview = {
  userId: string
  trainingDay: number
  completedDays: number
  checkinType: string
  thoughtType: string
  thoughtLabel: string
  reflectionText: string
  affectedDimensions: string[]
  dailySealText: string
  nextActionText: string
  riskBoundary: string
  suggestedAssistantOpening: string
}

const checkinLabels: Record<TrainingCheckinType, string> = {
  ready: "准备交易",
  observe: "只观察",
  traded: "已经交易过",
  preparing_trade: "准备交易",
  observe_only: "只观察",
  already_traded: "已经交易过",
}

const evidenceProfiles: Record<
  EvidenceThoughtType,
  {
    dailySealText: string
    nextActionText: string
    affectedDimensions: string[]
    suggestedAssistantOpening: string
  }
> = {
  fomo: {
    affectedDimensions: ["追涨冲动", "临盘改计划"],
    dailySealText: "今天你照见的是怕错过。训练不是消灭机会，而是在机会面前先回到计划。",
    nextActionText: "下一次看到计划外拉升，先停十秒，再写入场条件。",
    suggestedAssistantOpening: "我看你今天照见的是怕错过。今天不用急着证明自己改变，只先练一个动作：计划外拉升前停十秒。",
  },
  chase: {
    affectedDimensions: ["追涨冲动", "知行合一"],
    dailySealText: "今天你照见的是想追进去。真正的知行合一，是手比念头慢半拍。",
    nextActionText: "下一次手想按下去时，先复核一条原计划条件。",
    suggestedAssistantOpening: "你今天记录的是想追进去。下一次先别管机会真假，先看它是否在原计划里。",
  },
  wait_pullback: {
    affectedDimensions: ["空仓焦虑", "临盘改计划"],
    dailySealText: "今天你照见的是想等回撤。等待不是逃避，等待必须有条件。",
    nextActionText: "下一次等待前，写下具体触发条件。",
    suggestedAssistantOpening: "你今天记录的是想等回撤。下一次等待前，先把条件写清楚，再观察自己的念头。",
  },
  ask_others: {
    affectedDimensions: ["独立判断", "知行合一"],
    dailySealText: "今天你照见的是想问别人。外部声音不能替你完成判断。",
    nextActionText: "下一次问别人前，先写下自己的方向和理由。",
    suggestedAssistantOpening: "你今天记录的是想问别人。外部信息可以参考，但先把自己的判断写下来。",
  },
  abandon_plan: {
    affectedDimensions: ["知行合一", "临盘改计划"],
    dailySealText: "今天你照见的是想放弃计划。计划是情绪来临前的锚。",
    nextActionText: "下一次想改计划时，先写下是条件变化还是情绪变化。",
    suggestedAssistantOpening: "你今天记录的是想放弃计划。下一次想改计划时，先分清是条件变化，还是情绪变化。",
  },
}

export function buildTrainingEvidence(input: EvidenceEngineInput): EvidenceResult {
  const thoughtType = normalizeThoughtType(input.thoughtType)
  const profile = evidenceProfiles[thoughtType]
  const thoughtLabel = cleanText(input.thoughtLabel || "今日一念", 40)
  const checkinLabel = formatCheckin(input.checkinType)
  const reflectionText = cleanText(input.reflectionText || "已完成今日省察。", 120)
  const trainingDay = input.trainingDay ?? input.completedDays ?? 1
  const baselineText = formatBaselineEvidence(input.baselineScores)
  const completedAtText = formatCompletedAt(input.completedAt)
  const evidenceItems = [
    `签到：${checkinLabel}`,
    `今日一念：${thoughtLabel}`,
    `每日一省：${reflectionText}`,
    completedAtText ? `完成时间：${completedAtText}` : "",
    baselineText,
    `训练证据：已完成 Day ${trainingDay}`,
  ].filter(Boolean)

  return {
    evidenceItems,
    dailySealText: profile.dailySealText,
    nextActionText: profile.nextActionText,
    affectedDimensions: profile.affectedDimensions,
  }
}

export function buildAssistantSummaryPreview(input: EvidenceEngineInput): AssistantSummaryPreview {
  const thoughtType = normalizeThoughtType(input.thoughtType)
  const evidence = buildTrainingEvidence(input)
  const thoughtLabel = cleanText(input.thoughtLabel || "今日一念", 40)
  const reflectionText = cleanText(input.reflectionText || "", 120)
  const trainingDay = input.trainingDay ?? input.completedDays ?? 1
  const completedDays = input.completedDays ?? trainingDay

  return {
    userId: cleanText(input.userId || "", 80),
    trainingDay,
    completedDays,
    checkinType: cleanText(input.checkinType || "", 40),
    thoughtType,
    thoughtLabel,
    reflectionText,
    affectedDimensions: evidence.affectedDimensions,
    dailySealText: evidence.dailySealText,
    nextActionText: evidence.nextActionText,
    riskBoundary: "仅交易心理训练，不提供买卖建议",
    suggestedAssistantOpening: evidenceProfiles[thoughtType].suggestedAssistantOpening,
  }
}

export function buildTodayProofText(input: EvidenceEngineInput) {
  const evidence = buildTrainingEvidence(input)
  const thoughtLabel = cleanText(input.thoughtLabel || "今日一念", 40)
  const reflectionText = cleanText(input.reflectionText || "已完成今日省察。", 120)
  const date = input.completedAt ? input.completedAt.slice(0, 10) : ""

  return [
    "今日心证",
    date ? `日期：${date}` : "",
    `今日一念：${thoughtLabel}`,
    `今日动作：${evidence.nextActionText}`,
    `今日省察：${reflectionText}`,
    `心证句：${evidence.dailySealText}`,
    "仅用于交易行为训练记录，不构成任何投资建议。",
  ].filter(Boolean).join("\n")
}

function normalizeThoughtType(value?: string): EvidenceThoughtType {
  if (value === "fear_missing") return "fomo"
  if (value === "want_chase") return "chase"
  if (value && value in evidenceProfiles) return value as EvidenceThoughtType
  return "fomo"
}

function formatCheckin(value?: string) {
  if (
    value === "ready" ||
    value === "observe" ||
    value === "traded" ||
    value === "preparing_trade" ||
    value === "observe_only" ||
    value === "already_traded"
  ) {
    return checkinLabels[value]
  }

  return "已签到"
}

function formatBaselineEvidence(baselineScores?: EvidenceBaselineScores) {
  if (typeof baselineScores?.knowingDoing !== "number") return ""
  return `首测基线：知行合一 ${Math.round(baselineScores.knowingDoing)}`
}

function formatCompletedAt(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function cleanText(value: string, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength)
}
