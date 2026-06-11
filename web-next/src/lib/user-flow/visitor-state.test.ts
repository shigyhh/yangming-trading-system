import assert from "node:assert/strict"
import test from "node:test"

import {
  STORAGE_KEYS,
  clearVisitorStateForDevOnly,
  resetZhaojianDevState,
  getTodayInsightRecord,
  getVisitorState,
  markHomeIntroSeen,
  markReflectEntered,
  saveInsightRecord,
} from "./visitor-state.ts"

function createMemoryStorage(initial: Record<string, string> = {}) {
  const state = new Map(Object.entries(initial))

  return {
    getItem(key: string) {
      return state.has(key) ? state.get(key)! : null
    },
    setItem(key: string, value: string) {
      state.set(key, value)
    },
    removeItem(key: string) {
      state.delete(key)
    },
  }
}

const baseRecord = {
  id: "record-a",
  recordId: "record-a",
  date: "2026-06-09",
  dayIndex: 1,
  inputText: "又要错过了。",
  source: "user_input" as const,
  thoughtId: "thought-a",
  sceneId: "scene_01",
  sceneName: "急涨追高",
  mirrorId: "chase",
  mirrorName: "追涨之镜",
  tradeMoment: "盘中拉升时",
  thief: "贪 · 急",
  os: "又要错过了。",
  reflection: "你照见的是怕慢一步。",
  evidence: "我看见自己不是在追行情。",
  practice: "停十秒。",
}

test("visitor state treats a clean browser as a new user", () => {
  const storage = createMemoryStorage()
  const state = getVisitorState(storage, new Date("2026-06-09T09:30:00+08:00"))

  assert.equal(state.isNewUser, true)
  assert.equal(state.isReturningUser, false)
  assert.equal(state.hasSeenHomeIntro, false)
  assert.equal(state.hasAnyCompletedInsight, false)
  assert.equal(state.todayStatus, "not_started")
})

test("visitor state marks home intro and reflect entry without creating content records", () => {
  const storage = createMemoryStorage()

  markHomeIntroSeen(storage)
  markReflectEntered(storage)

  assert.equal(storage.getItem(STORAGE_KEYS.homeIntroSeen), "true")
  assert.equal(storage.getItem(STORAGE_KEYS.firstReflectEntered), "true")
  assert.equal(getVisitorState(storage, new Date("2026-06-09T09:30:00+08:00")).isReturningUser, true)
})

test("visitor state detects today's draft and completed records", () => {
  const draftStorage = createMemoryStorage()
  saveInsightRecord({ ...baseRecord, completed: false }, draftStorage)

  const draftState = getVisitorState(draftStorage, new Date("2026-06-09T09:30:00+08:00"))
  assert.equal(draftState.todayStatus, "draft")
  assert.equal(draftState.draftRecordId, "record-a")
  assert.equal(getTodayInsightRecord(draftStorage, new Date("2026-06-09T09:30:00+08:00"))?.recordId, "record-a")

  const completedStorage = createMemoryStorage()
  saveInsightRecord({ ...baseRecord, completed: true, sealedAt: "2026-06-09T01:30:00.000Z" }, completedStorage)

  const completedState = getVisitorState(completedStorage, new Date("2026-06-09T09:30:00+08:00"))
  assert.equal(completedState.todayStatus, "completed")
  assert.equal(completedState.todayRecordId, "record-a")
  assert.equal(completedState.hasAnyCompletedInsight, true)
  assert.equal(completedState.isReturningUser, true)
})

test("visitor state can clear only its routing keys for development", () => {
  const storage = createMemoryStorage()
  markHomeIntroSeen(storage)
  markReflectEntered(storage)
  saveInsightRecord({ ...baseRecord, completed: false }, storage)

  clearVisitorStateForDevOnly(storage)

  assert.equal(storage.getItem(STORAGE_KEYS.homeIntroSeen), null)
  assert.equal(storage.getItem(STORAGE_KEYS.firstReflectEntered), null)
  assert.equal(storage.getItem(STORAGE_KEYS.draftInsightRecord), null)
})

test("dev reset clears today's insight records without deleting sealed history", () => {
  const storage = createMemoryStorage()
  markHomeIntroSeen(storage)
  markReflectEntered(storage)
  saveInsightRecord({ ...baseRecord, completed: true, sealedAt: "2026-06-09T01:30:00.000Z" }, storage)
  saveInsightRecord({
    ...baseRecord,
    id: "record-old",
    recordId: "record-old",
    date: "2026-06-08",
    completed: true,
    sealedAt: "2026-06-08T01:30:00.000Z",
  }, storage)

  resetZhaojianDevState(storage, new Date("2026-06-09T09:30:00+08:00"))

  assert.equal(storage.getItem(STORAGE_KEYS.homeIntroSeen), null)
  assert.equal(storage.getItem(STORAGE_KEYS.firstReflectEntered), null)
  assert.equal(storage.getItem(STORAGE_KEYS.draftInsightRecord), null)
  assert.equal(getTodayInsightRecord(storage, new Date("2026-06-09T09:30:00+08:00")), null)
  assert.match(storage.getItem(STORAGE_KEYS.insightRecords) ?? "", /record-old/)
  assert.doesNotMatch(storage.getItem(STORAGE_KEYS.insightRecords) ?? "", /record-a/)
})
