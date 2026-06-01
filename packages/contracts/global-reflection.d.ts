export type GlobalReflectionChoice = {
  key: string
  label: string
  note: string
}

export type GlobalReflectionVotePayload = {
  anonymousId?: string
  thoughtKey: string
  primaryType?: string
  sourceChannel?: "web-next" | "miniprogram" | "admin" | string
  dateKey?: string
}

export type GlobalReflectionChoiceStats = GlobalReflectionChoice & {
  count: number
  percentage: number
}

export type GlobalReflectionMirrorStats = {
  primaryType: string
  count: number
  percentage: number
}

export type GlobalReflectionScrollItem = {
  id: string
  thoughtKey: string
  thoughtLabel: string
  primaryType: string
  line: string
  createdAt: string
}

export type GlobalReflectionSummary = {
  dateKey: string
  totalVotes: number
  choices: GlobalReflectionChoiceStats[]
  leadingThought: GlobalReflectionChoiceStats | null
  mirrors: GlobalReflectionMirrorStats[]
  scroll: GlobalReflectionScrollItem[]
  compliance: string
}

export type GlobalReflectionVoteResponse = {
  vote: GlobalReflectionScrollItem
  summary: GlobalReflectionSummary
}
