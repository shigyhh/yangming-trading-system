import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  TODAY_ONE_THOUGHT_CONFIRM_LIMIT,
  confirmTodayOneThought,
  createOneThoughtRecord,
  drawTodayOneThought,
  getTodayOneThoughtDateKey,
  loadOneThoughtRecords,
  matchUserThought,
  readOrCreateTodayOneThought,
  readStableTodayOneThought,
  saveOneThoughtRecord,
  buildOneThoughtGrowthProfile,
} from "./today-one-thought-core.ts"

const todayOneThoughtUrl = new URL("./today-one-thought.ts", import.meta.url)

function createMemoryStorage(initial = {}) {
  const state = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
  }
}

const sourceItems = [
  {
    thoughtId: "thought-a",
    id: "thought-a",
    sceneId: "scene_01",
    sceneName: "急涨追高",
    mirrorId: "chase",
    thief: "贪 · 急",
    itemId: "thought-a",
    tradeMoment: "看见拉升时",
    os: "又要错过了。",
    reflection: "你照见的是怕慢一步。",
    evidence: "我看见自己不是在追行情。",
    practice: "停十秒。",
    coreStatement: "你追的是那个不想错过的自己。",
    intensity: 4,
  },
  {
    thoughtId: "thought-b",
    id: "thought-b",
    sceneId: "scene_02",
    sceneName: "踏空焦虑",
    mirrorId: "hesitate",
    thief: "疑 · 怯 · 急",
    itemId: "thought-b",
    tradeMoment: "看见连续上涨时",
    os: "机会不会等我。",
    reflection: "你照见的是空仓焦虑。",
    evidence: "我看见自己不是没机会。",
    practice: "写下等待条件。",
    coreStatement: "你怕的是再次被甩在后面。",
    intensity: 3,
  },
  {
    thoughtId: "thought-c",
    id: "thought-c",
    sceneId: "scene_03",
    sceneName: "买少后悔",
    mirrorId: "regret",
    thief: "贪 · 悔",
    itemId: "thought-c",
    tradeMoment: "看见账户盈利时",
    os: "买少了。",
    reflection: "你照见的是赚到还想赚更多。",
    evidence: "我看见自己不是因为赚少了难受。",
    practice: "只复盘是否按计划。",
    coreStatement: "你难受的是没有赚到全部。",
    intensity: 2,
  },
  {
    thoughtId: "thought-d",
    id: "thought-d",
    sceneId: "scene_04",
    sceneName: "卖飞懊恼",
    mirrorId: "regret",
    thief: "贪 · 悔",
    itemId: "thought-d",
    tradeMoment: "刚卖完看到继续上涨时",
    os: "我又卖早了。",
    reflection: "你照见的是不够完美。",
    evidence: "我看见自己在苛责结果。",
    practice: "写下离场规则。",
    coreStatement: "你不是卖早，是想卖得完美。",
    intensity: 3,
  },
  {
    thoughtId: "thought-e",
    id: "thought-e",
    sceneId: "scene_09",
    sceneName: "补仓摊平",
    mirrorId: "average_down",
    thief: "痴 · 执",
    itemId: "thought-e",
    tradeMoment: "亏损后想补仓摊平时",
    os: "它总会回来。",
    reflection: "你照见的是把希望当判断。",
    evidence: "我看见自己不是在降低成本。",
    practice: "写下补仓前的规则。",
    coreStatement: "你补的不是仓，是不愿承认的心。",
    intensity: 5,
  },
]

test("today one thought module exposes the one thought pool from 36 scenes", async () => {
  const source = await readFile(todayOneThoughtUrl, "utf8")

  ;[
    "export const oneThoughtPool",
    "hiddenThought: item.hiddenThought",
    "intensity: item.intensity",
    "todayOneThoughtSourceItems = oneThoughtPool",
    "export function readStableTodayOneThought",
    "export function saveOneThoughtRecord",
    "export function matchUserThought",
    "export function buildOneThoughtGrowthProfile",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `today-one-thought module missing ${token}`)
  })
})

test("stable today one thought keeps the same item for the same local date", () => {
  const storage = createMemoryStorage()
  const date = new Date("2026-06-06T08:30:00+08:00")

  const first = readStableTodayOneThought({ sourceItems, storage, date })
  const second = readStableTodayOneThought({ sourceItems, storage, date })
  const nextDay = readStableTodayOneThought({
    sourceItems,
    storage,
    date: new Date("2026-06-07T08:30:00+08:00"),
  })

  assert.equal(first.thoughtId, second.thoughtId)
  assert.equal(first.id, first.thoughtId)
  assert.equal(first.dateKey, "2026-06-06")
  assert.equal(nextDay.dateKey, "2026-06-07")
  assert.equal(nextDay.confirmationCount, 0)
})

test("one thought records save the sealed thought without exposing hidden thoughts", () => {
  const storage = createMemoryStorage()
  const sealedAt = "2026-06-06T08:30:00.000Z"
  const thought = {
    ...sourceItems[0],
    hiddenThought: "这句只给系统存，不给前台展示。",
  }

  const record = createOneThoughtRecord(thought, {
    date: "2026-06-06",
    sealedAt,
    completed: true,
  })
  const savedRecords = saveOneThoughtRecord(record, storage)
  const loadedRecords = loadOneThoughtRecords(storage)

  assert.equal(record.thoughtId, thought.thoughtId)
  assert.equal(record.sceneId, thought.sceneId)
  assert.equal(record.mirrorId, thought.mirrorId)
  assert.equal(record.thief, thought.thief)
  assert.equal(record.os, thought.os)
  assert.equal(record.reflection, thought.reflection)
  assert.equal(record.evidence, thought.evidence)
  assert.equal(record.practice, thought.practice)
  assert.equal(record.completed, true)
  assert.equal(record.sealedAt, sealedAt)
  assert.equal(Object.hasOwn(record, "hiddenThought"), false)
  assert.equal(savedRecords.length, 1)
  assert.deepEqual(loadedRecords, [record])
})

test("mock user thought matcher maps input to the closest one thought scene", () => {
  const match = matchUserThought("今天又想补仓，觉得总会回来。", sourceItems)

  assert.equal(match.matchedSceneId, "scene_09")
  assert.equal(match.matchedMirrorId, "average_down")
  assert.match(match.matchedThief, /执/)
  assert.equal(match.confidence > 0, true)
  assert.equal(Boolean(match.matchedThoughtId), true)
  assert.equal(Boolean(match.suggestedReflection), true)
  assert.equal(Boolean(match.suggestedPractice), true)
})

test("one thought growth profile summarizes recent records without complex charts", () => {
  const records = [
    createOneThoughtRecord(sourceItems[0], { date: "2026-06-01", sealedAt: "2026-06-01T08:00:00.000Z" }),
    createOneThoughtRecord(sourceItems[0], { date: "2026-06-02", sealedAt: "2026-06-02T08:00:00.000Z" }),
    createOneThoughtRecord(sourceItems[2], { date: "2026-06-03", sealedAt: "2026-06-03T08:00:00.000Z" }),
  ]

  const profile = buildOneThoughtGrowthProfile({
    userId: "local-user",
    period: "7d",
    records,
  })

  assert.equal(profile.userId, "local-user")
  assert.equal(profile.period, "7d")
  assert.equal(profile.topThoughts[0].os, sourceItems[0].os)
  assert.equal(profile.topThoughts[0].count, 2)
  assert.equal(profile.thiefTrend[0].thief, "贪")
  assert.equal(profile.mirrorTrend[0].mirrorId, "chase")
  assert.equal(profile.growthPrompt.includes(sourceItems[0].os), true)
})

test("today one thought can float without consuming confirmations", () => {
  const storage = createMemoryStorage()
  const date = new Date("2026-06-06T08:30:00+08:00")

  const first = readOrCreateTodayOneThought({ sourceItems, storage, date })
  const second = drawTodayOneThought({
    sourceItems,
    storage,
    currentState: first.storedState,
    date,
    excludeThoughtIds: [first.thoughtId],
  })

  assert.equal(first.dateKey, "2026-06-06")
  assert.equal(second.dateKey, first.dateKey)
  assert.notEqual(second.thoughtId, first.thoughtId)
  assert.equal(second.confirmationCount, 0)
  assert.equal(second.remainingConfirmations, TODAY_ONE_THOUGHT_CONFIRM_LIMIT)
})

test("confirmed thought keeps the selected item and its scene lines", () => {
  const storage = createMemoryStorage()
  const date = new Date("2026-06-06T08:30:00+08:00")
  const selectedItem = {
    ...sourceItems[0],
    evidence: "同一 scene 给这条 item 配好的心证。",
    practice: "同一 scene 给这条 item 配好的修行。",
    evidenceLines: ["不应该重新抽到的心证。"],
    practiceLines: ["不应该重新抽到的修行。"],
  }
  const currentState = {
    dateKey: "2026-06-06",
    userSeed: "stable-user",
    thoughtId: selectedItem.thoughtId,
    confirmationCount: 0,
    confirmedThoughtIds: [],
    updatedAt: date.getTime(),
  }

  const confirmed = confirmTodayOneThought({
    sourceItems: [selectedItem, ...sourceItems.slice(1)],
    storage,
    currentState,
    date,
  })

  assert.equal(confirmed.thoughtId, selectedItem.thoughtId)
  assert.equal(confirmed.tradeMoment, selectedItem.tradeMoment)
  assert.equal(confirmed.os, selectedItem.os)
  assert.equal(confirmed.reflection, selectedItem.reflection)
  assert.equal(confirmed.thief, selectedItem.thief)
  assert.equal(confirmed.evidence, selectedItem.evidence)
  assert.equal(confirmed.practice, selectedItem.practice)
  assert.equal(confirmed.confirmationCount, 1)
})

test("today one thought can be confirmed at most three times", () => {
  const storage = createMemoryStorage()
  const date = new Date("2026-06-06T08:30:00+08:00")

  const first = readOrCreateTodayOneThought({ sourceItems, storage, date })
  const firstConfirmed = confirmTodayOneThought({ sourceItems, storage, currentState: first.storedState, date })
  const second = drawTodayOneThought({
    sourceItems,
    storage,
    currentState: firstConfirmed.storedState,
    date,
    excludeThoughtIds: firstConfirmed.storedState.confirmedThoughtIds,
  })
  const secondConfirmed = confirmTodayOneThought({ sourceItems, storage, currentState: second.storedState, date })
  const third = drawTodayOneThought({
    sourceItems,
    storage,
    currentState: secondConfirmed.storedState,
    date,
    excludeThoughtIds: secondConfirmed.storedState.confirmedThoughtIds,
  })
  const thirdConfirmed = confirmTodayOneThought({ sourceItems, storage, currentState: third.storedState, date })
  const blocked = confirmTodayOneThought({ sourceItems, storage, currentState: thirdConfirmed.storedState, date })

  assert.equal(thirdConfirmed.confirmationCount, TODAY_ONE_THOUGHT_CONFIRM_LIMIT)
  assert.equal(thirdConfirmed.remainingConfirmations, 0)
  assert.equal(blocked.thoughtId, thirdConfirmed.thoughtId)
  assert.equal(blocked.confirmationCount, TODAY_ONE_THOUGHT_CONFIRM_LIMIT)
  assert.equal(new Set(thirdConfirmed.storedState.confirmedThoughtIds).size, TODAY_ONE_THOUGHT_CONFIRM_LIMIT)
})

test("today one thought confirmations reset on the next local day", () => {
  const storage = createMemoryStorage()
  const firstDay = new Date("2026-06-06T08:30:00+08:00")
  const nextDay = new Date("2026-06-07T08:30:00+08:00")

  const first = readOrCreateTodayOneThought({ sourceItems, storage, date: firstDay })
  const confirmed = confirmTodayOneThought({ sourceItems, storage, currentState: first.storedState, date: firstDay })
  const reset = readOrCreateTodayOneThought({ sourceItems, storage, date: nextDay })

  assert.equal(getTodayOneThoughtDateKey(nextDay), "2026-06-07")
  assert.equal(confirmed.confirmationCount, 1)
  assert.equal(reset.dateKey, "2026-06-07")
  assert.equal(reset.confirmationCount, 0)
  assert.equal(reset.remainingConfirmations, TODAY_ONE_THOUGHT_CONFIRM_LIMIT)
  assert.deepEqual(reset.storedState.confirmedThoughtIds, [])
})
