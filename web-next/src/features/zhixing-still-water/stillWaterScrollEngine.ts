import mirrors from "@/data/insight-engine/mirrors.json"
import {
  oneThoughtPool,
  saveOneThoughtRecord,
  type BrowserStorage,
  type OneThoughtRecord,
  type TodayOneThoughtSnapshot,
} from "@/data/insight-engine/today-one-thought"

export type StillWaterRecord = OneThoughtRecord & {
  dayIndex: number
  thoughtLabel: string
  tradeMoment: string
  mirrorName: string
  sceneName: string
  repeatCount: number
  thiefStreak: number
  waterTone: "clear" | "deep" | "darker"
  lightening: boolean
}

export type StillWaterSummary = {
  count: number
  topThought: string
  completedStreak: number
  hasSevenSealLine: boolean
  hasLighteningThought: boolean
}

export type StillWaterScrollData = {
  today: StillWaterRecord
  records: StillWaterRecord[]
  summary: StillWaterSummary
}

export type TodayInsightRecordInput = {
  id?: string
  date: string
  dayIndex?: number
  inputText?: string
  source?: OneThoughtRecord["source"]
  tradeMoment: string
  os: string
  reflection: string
  reflection_v2?: string
  reflectionFinal?: string
  thief: string
  mirrorId: string
  mirrorName?: string
  evidence: string
  practice: string
  completed: boolean
  sealedAt?: string
  sceneId: string
  sceneName: string
  thoughtId?: string
}

const mirrorNameById = new Map(mirrors.map((mirror) => [mirror.mirrorId, mirror.mirrorName]))
const thoughtById = new Map(oneThoughtPool.map((thought) => [thought.thoughtId, thought]))
const chineseNumbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]

const mirrorEchoKeyByInsightMirrorId: Record<string, string> = {
  account_checking: "anxiety",
  after_close_regret: "delay",
  average_down: "hold",
  all_in: "gamble",
  avoid_review: "delay",
  bottom_fishing: "gamble",
  breakeven_obsession: "hold",
  change_plan: "hesitate",
  close_impulse: "chase",
  empty_position: "anxiety",
  fear_holding: "anxiety",
  fear_of_being_wrong: "hold",
  follow_call: "herd",
  heavy_position: "gamble",
  high_buy: "chase",
  hot_theme: "herd",
  instant_regret: "anxiety",
  news_trading: "herd",
  news_trigger: "herd",
  open_impulse: "chase",
  overconfidence: "gamble",
  profit_regret: "fantasy",
  regret: "fantasy",
  revenge_trade: "gamble",
  see_right_no_buy: "hesitate",
  stop_loss_regret: "hesitate",
  stock_hopping: "anxiety",
  unlock_obsession: "hold",
}

export const stillWaterApiEndpoints = {
  listRecords: "/api/v1/mirror-scroll/records",
  sealRecord: "/api/v1/mirror-scroll/seal",
  createOneThoughtRecord: "/api/v1/one-thought/record",
} as const

function getRecordTime(record: OneThoughtRecord) {
  return new Date(record.sealedAt || record.date).getTime()
}

function formatThoughtLabel(dayIndex: number) {
  if (dayIndex <= 10) return `第${chineseNumbers[dayIndex]}念`
  return `第${dayIndex}念`
}

function getMirrorEchoId(mirrorId: string) {
  return mirrorEchoKeyByInsightMirrorId[mirrorId] || mirrorId
}

export function getMirrorName(mirrorId: string) {
  const echoId = getMirrorEchoId(mirrorId)
  return mirrorNameById.get(echoId) || mirrorNameById.get(mirrorId) || mirrorId || "心镜待显影"
}

export function getPrimaryThief(thief: string) {
  return thief.split(/[·、,\s/]+/).find(Boolean) || "一念"
}

function createRecordFromToday(today: TodayOneThoughtSnapshot): OneThoughtRecord {
  return {
    id: `one_thought_preview_${today.dateKey}_${today.thoughtId}`,
    recordId: `one_thought_preview_${today.dateKey}_${today.thoughtId}`,
    date: today.dateKey,
    dayIndex: 0,
    inputText: today.os,
    source: "today_one_thought",
    thoughtId: today.thoughtId,
    sceneId: today.sceneId,
    sceneName: today.sceneName,
    mirrorId: today.mirrorId,
    mirrorName: getMirrorName(today.mirrorId),
    tradeMoment: today.tradeMoment,
    thief: today.thief,
    os: today.os,
    reflection: today.reflectionFinal || today.reflection,
    reflection_v2: today.reflection_v2,
    reflectionFinal: today.reflectionFinal || today.reflection,
    evidence: today.evidence,
    practice: today.practice,
    completed: false,
    sealedAt: undefined,
  }
}

export function createTodayInsightRecord(input: TodayInsightRecordInput): OneThoughtRecord {
  const recordId = input.id ?? `one_thought_${input.date}_${input.thoughtId ?? input.sceneId}`

  return {
    id: recordId,
    recordId,
    date: input.date,
    dayIndex: input.dayIndex ?? 0,
    inputText: input.inputText ?? input.os,
    source: input.source ?? "user_input",
    thoughtId: input.thoughtId ?? recordId,
    sceneId: input.sceneId,
    sceneName: input.sceneName,
    mirrorId: input.mirrorId,
    mirrorName: input.mirrorName ?? getMirrorName(input.mirrorId),
    tradeMoment: input.tradeMoment,
    thief: input.thief,
    os: input.os,
    reflection: input.reflectionFinal ?? input.reflection,
    reflection_v2: input.reflection_v2 ?? input.reflection,
    reflectionFinal: input.reflectionFinal ?? input.reflection,
    evidence: input.evidence,
    practice: input.practice,
    completed: input.completed,
    sealedAt: input.sealedAt,
  }
}

export function saveToArchive(record: OneThoughtRecord, storage?: BrowserStorage | null) {
  return saveOneThoughtRecord(record, storage)
}

export function appendToMirrorScroll(record: OneThoughtRecord, storage?: BrowserStorage | null) {
  return saveOneThoughtRecord(record, storage)
}

function countBy<T extends string>(items: T[]) {
  return items.reduce((counter, item) => {
    counter.set(item, (counter.get(item) || 0) + 1)
    return counter
  }, new Map<T, number>())
}

function getTopValue(values: string[]) {
  const counts = countBy(values.filter(Boolean))
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || ""
}

export function groupRepeatedThoughts(records: OneThoughtRecord[]) {
  return Array.from(countBy(records.map((record) => record.os).filter(Boolean)).entries()).map(([thought, count]) => ({
    thought,
    count,
  }))
}

export function getTopThought(records: OneThoughtRecord[]) {
  return getTopValue(records.map((record) => record.os))
}

function buildLighteningThieves(records: OneThoughtRecord[]) {
  const chronological = [...records].sort((left, right) => getRecordTime(left) - getRecordTime(right))
  const midpoint = Math.floor(chronological.length / 2)
  if (midpoint < 2) return new Set<string>()

  const early = countBy(chronological.slice(0, midpoint).map((record) => record.thief).filter(Boolean))
  const late = countBy(chronological.slice(midpoint).map((record) => record.thief).filter(Boolean))

  return new Set(
    Array.from(early.entries())
      .filter(([thief, count]) => count > (late.get(thief) || 0))
      .map(([thief]) => thief),
  )
}

export function getThiefTrend(records: OneThoughtRecord[]) {
  const lighteningThieves = buildLighteningThieves(records)
  return {
    lighteningThieves,
    isLightening: (thief: string) => lighteningThieves.has(getPrimaryThief(thief)) || lighteningThieves.has(thief),
  }
}

export function createLongScrollNodes(savedRecords: OneThoughtRecord[], todayThought: TodayOneThoughtSnapshot) {
  return buildStillWaterScrollData(savedRecords, todayThought).records
}

function getCompletedStreak(records: OneThoughtRecord[]) {
  const completedDates = new Set(records.filter((record) => record.completed).map((record) => record.date))
  let streak = 0
  const cursor = new Date()

  while (completedDates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function buildStillWaterScrollData(
  savedRecords: OneThoughtRecord[],
  todayThought: TodayOneThoughtSnapshot,
): StillWaterScrollData {
  const uniqueRecords = Array.from(new Map(savedRecords.map((record) => [record.recordId, record])).values())
  const latestTodayRecord = uniqueRecords.find((record) => record.date === todayThought.dateKey && record.thoughtId === todayThought.thoughtId)
  const todayBase = latestTodayRecord ?? createRecordFromToday(todayThought)
  const recordsForStats = latestTodayRecord ? uniqueRecords : [todayBase, ...uniqueRecords]
  const chronological = [...recordsForStats].sort((left, right) => getRecordTime(left) - getRecordTime(right))
  const repeatCounts = countBy(chronological.map((record) => record.os).filter(Boolean))
  const lighteningThieves = buildLighteningThieves(uniqueRecords)

  let lastThief = ""
  let currentStreak = 0
  const enrichedChronological = chronological.map((record, index) => {
    const thought = thoughtById.get(record.thoughtId)
    const thief = record.thief || thought?.thief || "一念"

    if (thief === lastThief) {
      currentStreak += 1
    } else {
      lastThief = thief
      currentStreak = 1
    }

    return {
      ...record,
      thief,
      dayIndex: record.dayIndex || index + 1,
      thoughtLabel: formatThoughtLabel(index + 1),
      tradeMoment: record.tradeMoment || thought?.tradeMoment || "交易现场待照见",
      mirrorName: record.mirrorName || getMirrorName(record.mirrorId),
      sceneName: record.sceneName || thought?.sceneName || record.sceneId || "今日场景",
      repeatCount: repeatCounts.get(record.os) || 1,
      thiefStreak: currentStreak,
      waterTone: currentStreak >= 3 ? "darker" : currentStreak >= 2 ? "deep" : "clear",
      lightening: lighteningThieves.has(thief),
    } satisfies StillWaterRecord
  })

  const records = enrichedChronological
    .filter((record) => record.completed)
    .sort((left, right) => getRecordTime(right) - getRecordTime(left))
  const today = enrichedChronological.find((record) => record.recordId === todayBase.recordId) ?? enrichedChronological.at(-1)!
  const completedStreak = getCompletedStreak(uniqueRecords)

  return {
    today,
    records,
    summary: {
      count: records.length,
      topThought: getTopValue(records.map((record) => record.os)),
      completedStreak,
      hasSevenSealLine: completedStreak >= 7,
      hasLighteningThought: records.some((record) => record.lightening),
    },
  }
}

export function filterStillWaterRecords(
  records: StillWaterRecord[],
  filters: { thief: string; mirror: string },
) {
  return records.filter((record) => {
    const matchesThief =
      filters.thief === "all" ||
      record.thief.includes(filters.thief) ||
      (filters.thief === "从" && (getMirrorEchoId(record.mirrorId) === "herd" || record.mirrorName.includes("从")))
    const matchesMirror = filters.mirror === "all" || getMirrorEchoId(record.mirrorId) === filters.mirror

    return matchesThief && matchesMirror
  })
}

export function getStillWaterMirrorOptions(records: StillWaterRecord[]) {
  const knownIds = new Set(records.map((record) => getMirrorEchoId(record.mirrorId)))
  return mirrors
    .filter((mirror) => knownIds.has(mirror.mirrorId))
    .map((mirror) => ({
      id: mirror.mirrorId,
      name: mirror.mirrorName,
    }))
}
