import type { PracticeCheckInStatus, PracticeMetric } from "../practice-change"

export type CheckinType = "ready" | "observe" | "traded"

export type ThoughtType =
  | "fomo"
  | "chase"
  | "wait_pullback"
  | "ask_others"
  | "abandon_plan"

export interface BaselineScores {
  emptyPositionAnxiety: number
  chaseImpulse: number
  stopLossExecution: number
  planChange: number
  knowingDoing: number
}

export interface DailyTrainingState {
  trainingDay: number
  checkinType: CheckinType | null
  thoughtType: ThoughtType | null
  reflectionText: string
  holdProgress: number
  isCompleted: boolean
  completedAt: string | null
  completedDays: number
  klineMindCount: number
  reflectionCount: number
  baselineScores: BaselineScores
}

export interface EvidenceResult {
  evidenceItems: string[]
  dailySealText: string
  nextActionText: string
  affectedDimensions: string[]
}

export interface PracticeTrailItem {
  id: string
  time: string
  label: string
  value: string
}

export interface DailyTrainingDraftState {
  trainingDay: number
  checkinType: CheckinType | null
  thoughtType: ThoughtType | null
  reflectionText: string
  holdProgress: number
}

export const checkinOptions: Array<{ type: CheckinType; label: string; description: string }> = [
  { type: "ready", label: "准备交易", description: "今天可能会执行计划内动作。" },
  { type: "observe", label: "只观察", description: "今天先看念头，不急着行动。" },
  { type: "traded", label: "已经交易过", description: "回看刚才是谁在替我行动。" },
]

export const thoughtOptions: Array<{
  type: ThoughtType
  label: string
  reaction: string
  action: string
  feedback: string
}> = [
  {
    type: "fomo",
    label: "怕错过",
    reaction: "怕错过，想立刻跟上",
    action: "先停十秒，写出是否在原计划内。",
    feedback: "你今天照见的是：怕错过。今天不需要消灭它，只需要在它出现时停十秒。",
  },
  {
    type: "chase",
    label: "想追进去",
    reaction: "想追进去，用动作压住焦虑",
    action: "把手从按钮上拿开，复核一条入场条件。",
    feedback: "你今天照见的是：想追进去。真正的训练不是忍住所有机会，而是先回到原计划。",
  },
  {
    type: "wait_pullback",
    label: "想等回撤",
    reaction: "想等回撤，但心里仍被波动牵住",
    action: "写下等待的条件，条件未到只观察。",
    feedback: "你今天照见的是：想等回撤。等待不是犹豫，等待必须有条件。",
  },
  {
    type: "ask_others",
    label: "想问别人",
    reaction: "想把判断交给外部声音",
    action: "先写自己的判断，再看外部信息。",
    feedback: "你今天照见的是：想问别人。外部信息可以参考，但不能替你做决定。",
  },
  {
    type: "abandon_plan",
    label: "想放弃计划",
    reaction: "想临时放弃原计划",
    action: "只比较计划条件，不给情绪补故事。",
    feedback: "你今天照见的是：想放弃计划。计划不是束缚，是你在情绪来临前留下的锚。",
  },
]

export const defaultBaselineScores: BaselineScores = {
  emptyPositionAnxiety: 40,
  chaseImpulse: 80,
  stopLossExecution: 100,
  planChange: 0,
  knowingDoing: 42,
}

const checkinTypeToPracticeStatus: Record<CheckinType, PracticeCheckInStatus> = {
  ready: "preparing_trade",
  observe: "observe_only",
  traded: "already_traded",
}

const practiceStatusToCheckinType: Record<PracticeCheckInStatus, CheckinType> = {
  preparing_trade: "ready",
  observe_only: "observe",
  already_traded: "traded",
}

const thoughtTypeToReactionKey: Record<ThoughtType, string> = {
  fomo: "fear_missing",
  chase: "want_chase",
  wait_pullback: "wait_pullback",
  ask_others: "ask_others",
  abandon_plan: "abandon_plan",
}

const reactionKeyToThoughtType: Record<string, ThoughtType> = {
  fear_missing: "fomo",
  want_chase: "chase",
  fomo: "fomo",
  chase: "chase",
  wait_pullback: "wait_pullback",
  ask_others: "ask_others",
  abandon_plan: "abandon_plan",
}

export function toPracticeCheckInStatus(value: CheckinType): PracticeCheckInStatus {
  return checkinTypeToPracticeStatus[value]
}

export function toCheckinType(value?: PracticeCheckInStatus | CheckinType | null): CheckinType | null {
  if (!value) return null
  if (value === "ready" || value === "observe" || value === "traded") return value
  return practiceStatusToCheckinType[value] ?? null
}

export function toKlineReactionKey(value: ThoughtType) {
  return thoughtTypeToReactionKey[value]
}

export function toThoughtType(value?: string | null): ThoughtType | null {
  if (!value) return null
  return reactionKeyToThoughtType[value] ?? null
}

export function getCheckinLabel(value?: PracticeCheckInStatus | CheckinType | null) {
  const checkinType = toCheckinType(value)
  return checkinOptions.find((option) => option.type === checkinType)?.label ?? "已签到"
}

export function getThoughtOption(value?: ThoughtType | string | null) {
  const thoughtType = value === "fomo" || value === "chase" || value === "wait_pullback" || value === "ask_others" || value === "abandon_plan"
    ? value
    : toThoughtType(value)

  return thoughtOptions.find((option) => option.type === thoughtType) ?? null
}

export function getThoughtLabel(value?: ThoughtType | string | null) {
  return getThoughtOption(value)?.label ?? "今日一念"
}

export function getBaselineScoresFromMetrics(metrics: PracticeMetric[] | undefined): BaselineScores {
  if (!metrics?.length) return defaultBaselineScores

  const scoreOf = (key: PracticeMetric["key"], fallback: number) => (
    metrics.find((metric) => metric.key === key)?.before ?? fallback
  )

  return {
    emptyPositionAnxiety: scoreOf("emptyAnxiety", defaultBaselineScores.emptyPositionAnxiety),
    chaseImpulse: scoreOf("chaseImpulse", defaultBaselineScores.chaseImpulse),
    stopLossExecution: scoreOf("stopLossExecution", defaultBaselineScores.stopLossExecution),
    planChange: scoreOf("planChange", defaultBaselineScores.planChange),
    knowingDoing: scoreOf("zhixing", defaultBaselineScores.knowingDoing),
  }
}
