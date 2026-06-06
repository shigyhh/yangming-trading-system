import assert from "node:assert/strict"
import test from "node:test"

import {
  TODAY_ONE_THOUGHT_CONFIRM_LIMIT,
  confirmTodayOneThought,
  drawTodayOneThought,
  getTodayOneThoughtDateKey,
  readOrCreateTodayOneThought,
} from "./today-one-thought-core.ts"

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
  },
  {
    thoughtId: "thought-b",
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
  },
  {
    thoughtId: "thought-c",
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
  },
  {
    thoughtId: "thought-d",
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
  },
]

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
