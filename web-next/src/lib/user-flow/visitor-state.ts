import {
  getTodayOneThoughtDateKey,
  LEGACY_ONE_THOUGHT_RECORDS_STORAGE_KEY,
  loadOneThoughtRecords,
  ONE_THOUGHT_RECORDS_STORAGE_KEY,
  saveOneThoughtRecord,
  type BrowserStorage,
  type OneThoughtInsightRecord,
} from "../../data/insight-engine/today-one-thought-core.ts"

export const STORAGE_KEYS = {
  homeIntroSeen: "zhaojian:home_intro_seen",
  firstReflectEntered: "zhaojian:first_reflect_entered",
  insightRecords: ONE_THOUGHT_RECORDS_STORAGE_KEY,
  legacyInsightRecords: LEGACY_ONE_THOUGHT_RECORDS_STORAGE_KEY,
  draftInsightRecord: "zhaojian:draft_insight_record",
} as const

export type TodayInsightStatus = "not_started" | "draft" | "completed"

export type VisitorState = {
  isNewUser: boolean
  isReturningUser: boolean
  hasSeenHomeIntro: boolean
  hasEnteredReflect: boolean
  hasAnyCompletedInsight: boolean
  todayStatus: TodayInsightStatus
  todayRecordId?: string
  draftRecordId?: string
}

function getBrowserStorage(): BrowserStorage | null {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function safeGet(storage: BrowserStorage | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(storage: BrowserStorage | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value)
  } catch {
    // localStorage can be unavailable in private or embedded browser contexts.
  }
}

function safeRemove(storage: BrowserStorage | null | undefined, key: string) {
  try {
    storage?.removeItem?.(key)
  } catch {
    // localStorage can be unavailable in private or embedded browser contexts.
  }
}

function parseRecord(value: string | null) {
  if (!value) return null

  try {
    return JSON.parse(value) as OneThoughtInsightRecord
  } catch {
    return null
  }
}

export function markHomeIntroSeen(storage: BrowserStorage | null = getBrowserStorage()) {
  safeSet(storage, STORAGE_KEYS.homeIntroSeen, "true")
}

export function markReflectEntered(storage: BrowserStorage | null = getBrowserStorage()) {
  safeSet(storage, STORAGE_KEYS.firstReflectEntered, "true")
}

export function getTodayInsightRecord(
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
): OneThoughtInsightRecord | null {
  const todayKey = getTodayOneThoughtDateKey(date)
  const records = loadOneThoughtRecords(storage).filter((record) => record.date === todayKey)
  const completedRecord = records.find((record) => record.completed)
  if (completedRecord) return completedRecord

  const draftRecord = records.find((record) => !record.completed) ?? parseRecord(safeGet(storage, STORAGE_KEYS.draftInsightRecord))
  return draftRecord?.date === todayKey ? draftRecord : null
}

export function saveInsightRecord(
  record: OneThoughtInsightRecord,
  storage: BrowserStorage | null = getBrowserStorage(),
) {
  const records = saveOneThoughtRecord(record, storage)

  if (record.completed) {
    const draft = parseRecord(safeGet(storage, STORAGE_KEYS.draftInsightRecord))
    if (draft?.recordId === record.recordId) safeRemove(storage, STORAGE_KEYS.draftInsightRecord)
  } else {
    safeSet(storage, STORAGE_KEYS.draftInsightRecord, JSON.stringify(record))
  }

  return records
}

export function getVisitorState(
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
): VisitorState {
  const introFlag = safeGet(storage, STORAGE_KEYS.homeIntroSeen)
  const reflectFlag = safeGet(storage, STORAGE_KEYS.firstReflectEntered)
  const hasSeenHomeIntro = introFlag === "true" || introFlag === "1"
  const hasEnteredReflect = reflectFlag === "true" || reflectFlag === "1"
  const records = loadOneThoughtRecords(storage)
  const hasAnyCompletedInsight = records.some((record) => record.completed)
  const todayRecord = getTodayInsightRecord(storage, date)
  const todayStatus: TodayInsightStatus = todayRecord
    ? todayRecord.completed
      ? "completed"
      : "draft"
    : "not_started"

  const isReturningUser = hasSeenHomeIntro || hasEnteredReflect || hasAnyCompletedInsight

  return {
    isNewUser: !isReturningUser,
    isReturningUser,
    hasSeenHomeIntro,
    hasEnteredReflect,
    hasAnyCompletedInsight,
    todayStatus,
    todayRecordId: todayRecord?.recordId,
    draftRecordId: todayRecord && !todayRecord.completed ? todayRecord.recordId : undefined,
  }
}

export function clearVisitorStateForDevOnly(storage: BrowserStorage | null = getBrowserStorage()) {
  safeRemove(storage, STORAGE_KEYS.homeIntroSeen)
  safeRemove(storage, STORAGE_KEYS.firstReflectEntered)
  safeRemove(storage, STORAGE_KEYS.insightRecords)
  safeRemove(storage, STORAGE_KEYS.legacyInsightRecords)
  safeRemove(storage, STORAGE_KEYS.draftInsightRecord)
}

export function resetZhaojianDevState(
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
) {
  const todayKey = getTodayOneThoughtDateKey(date)
  const records = loadOneThoughtRecords(storage).filter((record) => record.date !== todayKey)

  safeRemove(storage, STORAGE_KEYS.homeIntroSeen)
  safeRemove(storage, STORAGE_KEYS.firstReflectEntered)
  safeRemove(storage, STORAGE_KEYS.draftInsightRecord)
  safeSet(storage, STORAGE_KEYS.insightRecords, JSON.stringify(records))
}
