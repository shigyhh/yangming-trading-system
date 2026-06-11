import { createReflectionKey } from "@/lib/reflections/reflectionService"

import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  ONE_THOUGHT_EVENT_STORAGE_KEY,
  ONE_THOUGHT_RITUAL_NAME,
  ONE_THOUGHT_RITUAL_VERSION,
  PRIVATE_REFLECTION_VERSION,
  type ActualAction,
  type BrowserStorageLike,
  type OneThoughtEvent,
  type OneThoughtEventSource,
  type ReviewStatus,
  type RitualStatus,
} from "./types"

export type CreateOneThoughtEventInput = Omit<OneThoughtEvent, "id" | "createdAt" | "updatedAt"> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

function getBrowserStorage(): BrowserStorageLike | null {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function safeGet(storage: BrowserStorageLike | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(storage: BrowserStorageLike | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value)
  } catch {
    // localStorage may be unavailable in private or embedded contexts.
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function createId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function normalizePainLevel(value: unknown): OneThoughtEvent["painLevel"] {
  const numberValue = Number(value)
  if (numberValue === 1 || numberValue === 2 || numberValue === 3 || numberValue === 4 || numberValue === 5) {
    return numberValue
  }
  return 3
}

function normalizeSource(value: unknown): OneThoughtEventSource {
  if (value === "lake_seed") return "saved_from_public_lake"
  if (
    value === "saved_from_public_lake" ||
    value === "manual" ||
    value === "today_reflection" ||
    value === "one_thought_ritual"
  ) {
    return value
  }
  if (value === "zhaojian_yinian_ritual") return "one_thought_ritual"
  return "one_thought_ritual"
}

function normalizeRitualStatus(value: unknown): RitualStatus | undefined {
  if (value === "draft" || value === "revealed" || value === "sealed" || value === "abandoned") {
    return value
  }
  return undefined
}

function normalizeReviewStatus(value: unknown, event: Partial<OneThoughtEvent>): ReviewStatus | undefined {
  if (value === "none" || value === "pending" || value === "completed") return value
  if (event.tradeReviewId) return "completed"
  if (event.actualAction === "traded") return "pending"
  return undefined
}

function normalizeEvent(value: unknown): OneThoughtEvent | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<OneThoughtEvent>
  if (!item.id || !item.sceneId || !item.itemId || !item.os || !item.reflectionFinal) return null

  const key = item.key || createReflectionKey(String(item.sceneId), String(item.itemId))
  const createdAt = String(item.createdAt || item.reflectionShownAt || new Date().toISOString())
  const source = normalizeSource((item as { source?: unknown }).source)
  const ritualStatus = normalizeRitualStatus((item as { ritualStatus?: unknown }).ritualStatus)
  const ritualVersionValue = String((item as { ritualVersion?: unknown }).ritualVersion || "")
  const reviewStatus = normalizeReviewStatus((item as { reviewStatus?: unknown }).reviewStatus, item)
  const sealStage =
    item.sealStage && typeof item.sealStage === "object"
      ? { ...(item.sealStage as OneThoughtEvent["sealStage"]) }
      : undefined

  return {
    id: String(item.id),
    userId: String(item.userId || DEFAULT_MIND_ARCHIVE_USER_ID),
    sceneId: String(item.sceneId),
    itemId: String(item.itemId),
    key,
    tradeMoment: String(item.tradeMoment || ""),
    os: String(item.os),
    reflectionFinal: String(item.reflectionFinal),
    finalSource: String(item.finalSource || "reflection_final_shenji_zeyou_v1"),
    painLevel: normalizePainLevel(item.painLevel),
    painPoint: item.painPoint ? String(item.painPoint) : undefined,
    heartThief: item.heartThief ? String(item.heartThief) : undefined,
    heartEvidence: item.heartEvidence ? String(item.heartEvidence) : undefined,
    practiceText: item.practiceText ? String(item.practiceText) : undefined,
    reflectionVersion: PRIVATE_REFLECTION_VERSION,
    ritualName:
      item.ritualName === ONE_THOUGHT_RITUAL_NAME || ritualVersionValue === "zhaojian_yinian_zhaoxin_ritual_v1"
        ? ONE_THOUGHT_RITUAL_NAME
        : undefined,
    ritualVersion:
      ritualVersionValue === ONE_THOUGHT_RITUAL_VERSION || ritualVersionValue === "zhaojian_yinian_zhaoxin_ritual_v1"
        ? ONE_THOUGHT_RITUAL_VERSION
        : undefined,
    ritualStatus,
    sealStage,
    reflectionShownAt: String(item.reflectionShownAt || createdAt),
    reflectionSeen: Boolean(item.reflectionSeen),
    reflectionSeenAt: item.reflectionSeenAt ? String(item.reflectionSeenAt) : undefined,
    userReaction: item.userReaction,
    userReactionAt: item.userReactionAt ? String(item.userReactionAt) : undefined,
    intendedAction: item.intendedAction,
    actualAction: item.actualAction,
    actualActionAt: item.actualActionAt ? String(item.actualActionAt) : undefined,
    tradeId: item.tradeId ? String(item.tradeId) : undefined,
    tradeReviewId: item.tradeReviewId ? String(item.tradeReviewId) : undefined,
    reviewStatus,
    source,
    createdAt,
    updatedAt: String(item.updatedAt || createdAt),
  }
}

function getEventTime(event: Pick<OneThoughtEvent, "createdAt" | "updatedAt">) {
  const time = new Date(event.updatedAt || event.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function writeEvents(events: OneThoughtEvent[], storage: BrowserStorageLike | null | undefined) {
  safeSet(storage, ONE_THOUGHT_EVENT_STORAGE_KEY, JSON.stringify(events))
}

export function listOneThoughtEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_EVENT_STORAGE_KEY), [])
    .map(normalizeEvent)
    .filter((event): event is OneThoughtEvent => Boolean(event))
    .filter((event) => event.userId === userId)
    .sort((left, right) => getEventTime(right) - getEventTime(left))
}

export function listRecentOneThoughtEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  limit = 10,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return listOneThoughtEvents(userId, storage).slice(0, Math.max(0, Math.trunc(limit)))
}

export function isSealedOneThoughtEvent(event: OneThoughtEvent) {
  return event.ritualStatus === "sealed"
}

export function listSealedOneThoughtEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return listOneThoughtEvents(userId, storage).filter(isSealedOneThoughtEvent)
}

function reviewStatusForActualAction(actualAction: ActualAction): ReviewStatus {
  if (actualAction === "traded") return "pending"
  return "none"
}

export function updateOneThoughtEventFinalAction(
  id: string,
  actualAction: ActualAction,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  const now = new Date().toISOString()
  return updateOneThoughtEvent(id, {
    actualAction,
    actualActionAt: now,
    reviewStatus: reviewStatusForActualAction(actualAction),
  }, storage)
}

export function getOneThoughtEvent(
  id: string,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_EVENT_STORAGE_KEY), [])
    .map(normalizeEvent)
    .find((event) => event?.id === id) ?? null
}

export function createOneThoughtEvent(
  input: CreateOneThoughtEventInput,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  const now = new Date().toISOString()
  const event = normalizeEvent({
    ...input,
    id: input.id || createId("one_thought_event"),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    reflectionVersion: PRIVATE_REFLECTION_VERSION,
  })

  if (!event) throw new Error("OneThoughtEvent 缺少必要字段。")

  const currentEvents = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_EVENT_STORAGE_KEY), [])
    .map(normalizeEvent)
    .filter((item): item is OneThoughtEvent => Boolean(item))
  const nextEvents = [event, ...currentEvents.filter((item) => item.id !== event.id)]
    .sort((left, right) => getEventTime(right) - getEventTime(left))

  writeEvents(nextEvents, storage)
  return event
}

export function updateOneThoughtEvent(
  id: string,
  patch: Partial<OneThoughtEvent>,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  const currentEvents = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_EVENT_STORAGE_KEY), [])
    .map(normalizeEvent)
    .filter((item): item is OneThoughtEvent => Boolean(item))
  const current = currentEvents.find((event) => event.id === id)
  if (!current) return null

  const updated = normalizeEvent({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  })
  if (!updated) return null

  writeEvents(
    [updated, ...currentEvents.filter((event) => event.id !== id)].sort(
      (left, right) => getEventTime(right) - getEventTime(left),
    ),
    storage,
  )

  return updated
}

export function linkTradeReviewToOneThoughtEvent(
  eventId: string,
  tradeReviewId: string,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return updateOneThoughtEvent(eventId, { tradeReviewId, reviewStatus: "completed" }, storage)
}

export function clearOneThoughtEventsForDevOnly(storage: BrowserStorageLike | null = getBrowserStorage()) {
  writeEvents([], storage)
}
