import type { OneThoughtEvent } from "./types"
import type { ReviewArchiveItem, ReviewRiskSignal } from "./reviewArchiveService"

export type CycleMirrorSeverity = "medium" | "high"
export type CycleSignalLevel = "low" | "medium" | "high"

export type CycleMirrorOneThoughtEvent = Partial<OneThoughtEvent> & { id: string }
export type CycleMirrorReviewArchiveItem = Partial<ReviewArchiveItem> & {
  tradeReviewId: string
  id?: string
}

export type RecurringThought = {
  key: string
  sceneId?: string
  itemId?: string
  os?: string
  count: number
  lastSeenAt?: string
  heartThieves: string[]
  reactions: string[]
  actualActions: string[]
  linkedReviewIds: string[]
  linkedOneThoughtEventIds: string[]
  severity: CycleMirrorSeverity
  text: string
}

export type RecurringScene = {
  sceneId: string
  count: number
  itemIds: string[]
  heartThieves: string[]
  lastSeenAt?: string
  severity: CycleMirrorSeverity
  text: string
}

export type RecurringHeartThief = {
  heartThief: string
  count: number
  relatedOneThoughtEventIds: string[]
  relatedReviewIds: string[]
  severity: CycleMirrorSeverity
  text: string
}

export type RecurringBehaviorType =
  | "still_moving_then_traded"
  | "broke_rule"
  | "added_position"
  | "moved_stop_loss"
  | "changed_plan_intraday"

export type RecurringBehavior = {
  type: RecurringBehaviorType
  count: number
  relatedReviewIds: string[]
  severity: CycleMirrorSeverity
  text: string
}

export type RecurringCapitalPatternType =
  | "money_moving_heart_chaotic"
  | "double_unstable"
  | "money_stable_heart_moving"
  | "capital_insufficient_data"

export type RecurringCapitalPattern = {
  type: RecurringCapitalPatternType
  count: number
  relatedReviewIds: string[]
  severity: CycleMirrorSeverity
  text: string
}

export type CycleSignalType =
  | "same_thought_repeated"
  | "same_scene_repeated"
  | "same_behavior_repeated"
  | "same_capital_damage_repeated"
  | "heart_thief_cycle"

export type CycleSignal = {
  type: CycleSignalType
  level: CycleSignalLevel
  count: number
  text: string
  relatedIds: string[]
}

export type CycleSummary = {
  strongestCycleText?: string
  strongestHeartThief?: string
  strongestBehavior?: RecurringBehaviorType
  strongestCapitalPattern?: RecurringCapitalPatternType
  conclusionText: string
}

export type BuildCycleMirrorInput = {
  oneThoughtEvents: CycleMirrorOneThoughtEvent[]
  reviewArchiveItems: CycleMirrorReviewArchiveItem[]
  reviewRiskSignals: ReviewRiskSignal[]
  recentDays?: number
  now?: Date | string
}

export type CycleMirrorResult = {
  recurringThoughts: RecurringThought[]
  recurringScenes: RecurringScene[]
  recurringHeartThieves: RecurringHeartThief[]
  recurringBehaviors: RecurringBehavior[]
  recurringCapitalPatterns: RecurringCapitalPattern[]
  cycleSignals: CycleSignal[]
  cycleSummary: CycleSummary
}

const DEFAULT_RECENT_DAYS = 30
const DEFAULT_CONCLUSION_TEXT = "你以为这是新行情，其实是旧心贼换了张脸。"

const behaviorTexts: Record<RecurringBehaviorType, string> = {
  still_moving_then_traded: "最近多次出现心还在动后仍交易。看见这类循环，下一笔才有可能停住。",
  broke_rule: "最近多次出现破戒复盘。问题不只在结果，而在规则边界反复被越过。",
  added_position: "最近多次出现临盘扩大仓位。先看见心动，再回到原计划。",
  moved_stop_loss: "最近多次出现移动止损。先记录规则为何被挪动，再看下一次如何守住。",
  changed_plan_intraday: "最近多次出现临盘改计划。真正要照见的是临场那一念。",
}

const capitalTexts: Record<RecurringCapitalPatternType, string> = {
  money_moving_heart_chaotic: "资金开始反复被心贼牵动。仓位、风险或规则已经多次偏移。",
  double_unstable: "资金和心一起失守已经反复出现。先看清循环，再谈下一笔。",
  money_stable_heart_moving: "钱暂时没坏，但心动反复出现。坏习惯正在被奖励。",
  capital_insufficient_data: "资金证多次数据不足。补齐账户权益、仓位和计划风险，循环才看得清。",
}

function getTime(value: Date | string | undefined) {
  if (!value) return null
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function getEventTime(event: CycleMirrorOneThoughtEvent) {
  return getTime(event.updatedAt) ?? getTime(event.createdAt)
}

function getReviewTime(item: CycleMirrorReviewArchiveItem) {
  return getTime(item.createdAt)
}

function isInRecentWindow(time: number | null, recentDays: number, now: Date | string | undefined) {
  if (!time) return true
  const nowTime = getTime(now) ?? Date.now()
  return time >= nowTime - recentDays * 24 * 60 * 60 * 1000
}

function normalizeText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") || ""
}

function addUnique<T>(items: T[], value: T | undefined) {
  if (value === undefined || value === null || value === "") return
  if (!items.includes(value)) items.push(value)
}

function severityForCount(count: number, highThreshold: number): CycleMirrorSeverity {
  return count >= highThreshold ? "high" : "medium"
}

function levelForSeverity(severity: CycleMirrorSeverity): CycleSignalLevel {
  return severity
}

function createReviewIdsByEventId(reviewArchiveItems: CycleMirrorReviewArchiveItem[]) {
  const byEventId = new Map<string, string[]>()

  for (const item of reviewArchiveItems) {
    if (!item.linkedOneThoughtEventId) continue
    const ids = byEventId.get(item.linkedOneThoughtEventId) ?? []
    addUnique(ids, item.tradeReviewId)
    byEventId.set(item.linkedOneThoughtEventId, ids)
  }

  return byEventId
}

function getLinkedReviewIds(eventIds: string[], reviewIdsByEventId: Map<string, string[]>) {
  const reviewIds: string[] = []

  for (const eventId of eventIds) {
    for (const reviewId of reviewIdsByEventId.get(eventId) ?? []) {
      addUnique(reviewIds, reviewId)
    }
  }

  return reviewIds
}

function sortBySeverityAndCount<T extends { severity: CycleMirrorSeverity; count: number }>(items: T[]) {
  return [...items].sort((left, right) => {
    const severityDiff = (right.severity === "high" ? 2 : 1) - (left.severity === "high" ? 2 : 1)
    if (severityDiff !== 0) return severityDiff
    return right.count - left.count
  })
}

function sortCycleSignals(items: CycleSignal[]) {
  const levelRank: Record<CycleSignalLevel, number> = { high: 3, medium: 2, low: 1 }
  return [...items].sort((left, right) => {
    const levelDiff = levelRank[right.level] - levelRank[left.level]
    if (levelDiff !== 0) return levelDiff
    return right.count - left.count
  })
}

export function getCycleSeverityRank(value: CycleMirrorSeverity | CycleSignalLevel | undefined) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}

export function getTopCycleItems<T extends {
  severity?: CycleMirrorSeverity
  level?: CycleSignalLevel
  count?: number
  lastSeenAt?: string
}>(items: T[] = [], limit = 1) {
  return [...items]
    .sort((left, right) => {
      const severityDiff =
        getCycleSeverityRank(right.severity ?? right.level) -
        getCycleSeverityRank(left.severity ?? left.level)
      if (severityDiff !== 0) return severityDiff

      const countDiff = (right.count ?? 0) - (left.count ?? 0)
      if (countDiff !== 0) return countDiff

      return (getTime(right.lastSeenAt) ?? 0) - (getTime(left.lastSeenAt) ?? 0)
    })
    .slice(0, Math.max(0, limit))
}

function buildRecurringThoughts(
  events: CycleMirrorOneThoughtEvent[],
  reviewIdsByEventId: Map<string, string[]>,
): RecurringThought[] {
  type Group = {
    key: string
    sceneId?: string
    itemId?: string
    os?: string
    count: number
    lastSeenAt?: string
    lastSeenTime: number
    heartThieves: string[]
    reactions: string[]
    actualActions: string[]
    linkedOneThoughtEventIds: string[]
  }
  const groups = new Map<string, Group>()

  for (const event of events) {
    const sceneId = normalizeText(event.sceneId)
    const itemId = normalizeText(event.itemId)
    const os = normalizeText(event.os)
    const key = sceneId && itemId ? `${sceneId}:${itemId}` : os
    if (!key) continue

    const eventTime = getEventTime(event) ?? 0
    const group = groups.get(key) ?? {
      key,
      sceneId: sceneId || undefined,
      itemId: itemId || undefined,
      os: os || undefined,
      count: 0,
      lastSeenAt: event.updatedAt || event.createdAt,
      lastSeenTime: eventTime,
      heartThieves: [],
      reactions: [],
      actualActions: [],
      linkedOneThoughtEventIds: [],
    }

    group.count += 1
    if (eventTime >= group.lastSeenTime) {
      group.lastSeenAt = event.updatedAt || event.createdAt || group.lastSeenAt
      group.lastSeenTime = eventTime
    }
    addUnique(group.heartThieves, event.heartThief)
    addUnique(group.reactions, event.userReaction)
    addUnique(group.actualActions, event.actualAction)
    addUnique(group.linkedOneThoughtEventIds, event.id)
    groups.set(key, group)
  }

  return sortBySeverityAndCount(
    [...groups.values()]
      .filter((group) => group.count >= 3)
      .map((group) => ({
        key: group.key,
        sceneId: group.sceneId,
        itemId: group.itemId,
        os: group.os,
        count: group.count,
        lastSeenAt: group.lastSeenAt,
        heartThieves: group.heartThieves,
        reactions: group.reactions,
        actualActions: group.actualActions,
        linkedReviewIds: getLinkedReviewIds(group.linkedOneThoughtEventIds, reviewIdsByEventId),
        linkedOneThoughtEventIds: group.linkedOneThoughtEventIds,
        severity: severityForCount(group.count, 5),
        text: `这个念头不是第一次出现。最近已出现 ${group.count} 次。`,
      })),
  )
}

function buildRecurringScenes(events: CycleMirrorOneThoughtEvent[]): RecurringScene[] {
  type Group = {
    sceneId: string
    count: number
    itemIds: string[]
    heartThieves: string[]
    lastSeenAt?: string
    lastSeenTime: number
  }
  const groups = new Map<string, Group>()

  for (const event of events) {
    const sceneId = normalizeText(event.sceneId)
    if (!sceneId) continue

    const eventTime = getEventTime(event) ?? 0
    const group = groups.get(sceneId) ?? {
      sceneId,
      count: 0,
      itemIds: [],
      heartThieves: [],
      lastSeenAt: event.updatedAt || event.createdAt,
      lastSeenTime: eventTime,
    }

    group.count += 1
    addUnique(group.itemIds, normalizeText(event.itemId))
    addUnique(group.heartThieves, event.heartThief)
    if (eventTime >= group.lastSeenTime) {
      group.lastSeenAt = event.updatedAt || event.createdAt || group.lastSeenAt
      group.lastSeenTime = eventTime
    }
    groups.set(sceneId, group)
  }

  return sortBySeverityAndCount(
    [...groups.values()]
      .filter((group) => group.count >= 3)
      .map((group) => ({
        sceneId: group.sceneId,
        count: group.count,
        itemIds: group.itemIds,
        heartThieves: group.heartThieves,
        lastSeenAt: group.lastSeenAt,
        severity: severityForCount(group.count, 5),
        text: `你不是偶尔失守，而是反复死在同一个场景里。这个场景最近出现 ${group.count} 次。`,
      })),
  )
}

function buildRecurringHeartThieves(
  events: CycleMirrorOneThoughtEvent[],
  reviewArchiveItems: CycleMirrorReviewArchiveItem[],
  reviewIdsByEventId: Map<string, string[]>,
): RecurringHeartThief[] {
  type Group = {
    heartThief: string
    relatedOneThoughtEventIds: string[]
    relatedReviewIds: string[]
  }
  const groups = new Map<string, Group>()

  for (const event of events) {
    const heartThief = normalizeText(event.heartThief)
    if (!heartThief) continue

    const group = groups.get(heartThief) ?? {
      heartThief,
      relatedOneThoughtEventIds: [],
      relatedReviewIds: [],
    }
    addUnique(group.relatedOneThoughtEventIds, event.id)
    for (const reviewId of reviewIdsByEventId.get(event.id) ?? []) {
      addUnique(group.relatedReviewIds, reviewId)
    }
    groups.set(heartThief, group)
  }

  for (const item of reviewArchiveItems) {
    const heartThief = normalizeText(item.heartThief)
    if (!heartThief) continue

    const group = groups.get(heartThief)
    if (group) addUnique(group.relatedReviewIds, item.tradeReviewId)
  }

  return sortBySeverityAndCount(
    [...groups.values()]
      .filter((group) => group.relatedOneThoughtEventIds.length >= 5)
      .map((group) => ({
        heartThief: group.heartThief,
        count: group.relatedOneThoughtEventIds.length,
        relatedOneThoughtEventIds: group.relatedOneThoughtEventIds,
        relatedReviewIds: group.relatedReviewIds,
        severity: severityForCount(group.relatedOneThoughtEventIds.length, 8),
        text: `同一个心贼最近出现 ${group.relatedOneThoughtEventIds.length} 次。它不是偶然，是循环。`,
      })),
  )
}

function buildRecurringBehaviors(reviewArchiveItems: CycleMirrorReviewArchiveItem[]): RecurringBehavior[] {
  const predicates: Record<RecurringBehaviorType, (item: CycleMirrorReviewArchiveItem) => boolean> = {
    still_moving_then_traded: (item) => item.userReaction === "still_moving" && item.actualAction === "traded",
    broke_rule: (item) => item.brokeRule === true,
    added_position: (item) => item.addedPosition === true,
    moved_stop_loss: (item) => item.movedStopLoss === true,
    changed_plan_intraday: (item) => item.changedPlanIntraday === true,
  }

  return sortBySeverityAndCount(
    (Object.keys(predicates) as RecurringBehaviorType[])
      .map((type) => {
        const relatedReviewIds = reviewArchiveItems.filter(predicates[type]).map((item) => item.tradeReviewId)

        return {
          type,
          count: relatedReviewIds.length,
          relatedReviewIds,
          severity: severityForCount(relatedReviewIds.length, 3),
          text: behaviorTexts[type],
        }
      })
      .filter((item) => item.count >= 2),
  )
}

function getCapitalPatternType(item: CycleMirrorReviewArchiveItem): RecurringCapitalPatternType | null {
  if (item.capitalStabilityLevel === "double_unstable") return "double_unstable"
  if (item.capitalStabilityLevel === "money_moving_heart_chaotic") return "money_moving_heart_chaotic"
  if (item.capitalStabilityLevel === "money_stable_heart_moving") return "money_stable_heart_moving"
  if (item.capitalStabilityLevel === "insufficient_data") return "capital_insufficient_data"
  return null
}

function capitalPatternThreshold(type: RecurringCapitalPatternType) {
  if (type === "double_unstable") return 2
  if (type === "money_moving_heart_chaotic") return 2
  if (type === "money_stable_heart_moving") return 3
  return 3
}

function capitalPatternSeverity(type: RecurringCapitalPatternType, count: number): CycleMirrorSeverity {
  if (type === "double_unstable" && count >= 2) return "high"
  if (count >= 5) return "high"
  return "medium"
}

function buildRecurringCapitalPatterns(reviewArchiveItems: CycleMirrorReviewArchiveItem[]): RecurringCapitalPattern[] {
  const groups = new Map<RecurringCapitalPatternType, string[]>()

  for (const item of reviewArchiveItems) {
    const type = getCapitalPatternType(item)
    if (!type) continue
    const relatedReviewIds = groups.get(type) ?? []
    addUnique(relatedReviewIds, item.tradeReviewId)
    groups.set(type, relatedReviewIds)
  }

  return sortBySeverityAndCount(
    [...groups.entries()]
      .filter(([type, relatedReviewIds]) => relatedReviewIds.length >= capitalPatternThreshold(type))
      .map(([type, relatedReviewIds]) => ({
        type,
        count: relatedReviewIds.length,
        relatedReviewIds,
        severity: capitalPatternSeverity(type, relatedReviewIds.length),
        text: capitalTexts[type],
      })),
  )
}

function signalFromReviewRiskSignal(signal: ReviewRiskSignal): CycleSignal | null {
  if (
    signal.type === "capital_double_unstable" ||
    signal.type === "money_moving_heart_chaotic"
  ) {
    return {
      type: "same_capital_damage_repeated",
      level: signal.level,
      count: signal.count,
      text: signal.text,
      relatedIds: signal.relatedReviewIds,
    }
  }

  if (
    signal.type === "repeated_broke_rule" ||
    signal.type === "repeated_zei_sheng" ||
    signal.type === "repeated_shuang_shu" ||
    signal.type === "still_moving_then_traded" ||
    signal.type === "added_position_when_heart_moving" ||
    signal.type === "moved_stop_loss"
  ) {
    return {
      type: "same_behavior_repeated",
      level: signal.level,
      count: signal.count,
      text: signal.text,
      relatedIds: signal.relatedReviewIds,
    }
  }

  return null
}

function buildHeartThiefCycleSignal(reviewArchiveItems: CycleMirrorReviewArchiveItem[]): CycleSignal | null {
  const matched = reviewArchiveItems.filter(
    (item) =>
      item.userReaction === "still_moving" &&
      item.actualAction === "traded" &&
      (item.heartJudgement === "zei_sheng" || item.heartJudgement === "shuang_shu"),
  )

  if (matched.length < 2) return null

  return {
    type: "heart_thief_cycle",
    level: matched.length >= 3 ? "high" : "medium",
    count: matched.length,
    text: "这条循环已经出现多次：心还在动 → 还是交易 → 复盘失守。",
    relatedIds: matched.map((item) => item.tradeReviewId),
  }
}

function buildCycleSignals(input: {
  recurringThoughts: RecurringThought[]
  recurringScenes: RecurringScene[]
  recurringBehaviors: RecurringBehavior[]
  recurringCapitalPatterns: RecurringCapitalPattern[]
  reviewArchiveItems: CycleMirrorReviewArchiveItem[]
  reviewRiskSignals: ReviewRiskSignal[]
}) {
  const signals: CycleSignal[] = [
    ...input.recurringThoughts.map((item) => ({
      type: "same_thought_repeated" as const,
      level: levelForSeverity(item.severity),
      count: item.count,
      text: item.text,
      relatedIds: item.linkedOneThoughtEventIds,
    })),
    ...input.recurringScenes.map((item) => ({
      type: "same_scene_repeated" as const,
      level: levelForSeverity(item.severity),
      count: item.count,
      text: item.text,
      relatedIds: [item.sceneId],
    })),
    ...input.recurringBehaviors.map((item) => ({
      type: "same_behavior_repeated" as const,
      level: levelForSeverity(item.severity),
      count: item.count,
      text: item.text,
      relatedIds: item.relatedReviewIds,
    })),
    ...input.recurringCapitalPatterns.map((item) => ({
      type: "same_capital_damage_repeated" as const,
      level: levelForSeverity(item.severity),
      count: item.count,
      text: item.text,
      relatedIds: item.relatedReviewIds,
    })),
    ...input.reviewRiskSignals
      .map(signalFromReviewRiskSignal)
      .filter((signal): signal is CycleSignal => Boolean(signal)),
  ]

  const heartThiefCycleSignal = buildHeartThiefCycleSignal(input.reviewArchiveItems)
  if (heartThiefCycleSignal) signals.push(heartThiefCycleSignal)

  return sortCycleSignals(signals)
}

function buildCycleSummary(input: {
  recurringHeartThieves: RecurringHeartThief[]
  recurringBehaviors: RecurringBehavior[]
  recurringCapitalPatterns: RecurringCapitalPattern[]
  cycleSignals: CycleSignal[]
}): CycleSummary {
  return {
    strongestCycleText: input.cycleSignals[0]?.text,
    strongestHeartThief: input.recurringHeartThieves[0]?.heartThief,
    strongestBehavior: input.recurringBehaviors[0]?.type,
    strongestCapitalPattern: input.recurringCapitalPatterns[0]?.type,
    conclusionText: DEFAULT_CONCLUSION_TEXT,
  }
}

export function buildCycleMirror({
  oneThoughtEvents,
  reviewArchiveItems,
  reviewRiskSignals,
  recentDays = DEFAULT_RECENT_DAYS,
  now,
}: BuildCycleMirrorInput): CycleMirrorResult {
  const safeRecentDays = Number.isFinite(recentDays) && recentDays > 0 ? recentDays : DEFAULT_RECENT_DAYS
  const recentEvents = oneThoughtEvents.filter((event) => isInRecentWindow(getEventTime(event), safeRecentDays, now))
  const recentReviewItems = reviewArchiveItems.filter((item) => isInRecentWindow(getReviewTime(item), safeRecentDays, now))
  const reviewIdsByEventId = createReviewIdsByEventId(recentReviewItems)

  const recurringThoughts = buildRecurringThoughts(recentEvents, reviewIdsByEventId)
  const recurringScenes = buildRecurringScenes(recentEvents)
  const recurringHeartThieves = buildRecurringHeartThieves(recentEvents, recentReviewItems, reviewIdsByEventId)
  const recurringBehaviors = buildRecurringBehaviors(recentReviewItems)
  const recurringCapitalPatterns = buildRecurringCapitalPatterns(recentReviewItems)
  const cycleSignals = buildCycleSignals({
    recurringThoughts,
    recurringScenes,
    recurringBehaviors,
    recurringCapitalPatterns,
    reviewArchiveItems: recentReviewItems,
    reviewRiskSignals,
  })

  return {
    recurringThoughts,
    recurringScenes,
    recurringHeartThieves,
    recurringBehaviors,
    recurringCapitalPatterns,
    cycleSignals,
    cycleSummary: buildCycleSummary({
      recurringHeartThieves,
      recurringBehaviors,
      recurringCapitalPatterns,
      cycleSignals,
    }),
  }
}
