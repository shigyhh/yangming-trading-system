import {
  buildDailyVerdict,
  getMirrorDefinition,
  getSealDefinition,
  type ZhixingMirrorId,
  type ZhixingMode,
  type ZhixingNodeId,
  type ZhixingSealId,
  zhixingScrollNodes,
} from "./zhixingScrollDefinitions"

export const zhixingScrollStorageKey = "ym_zhixing_daily_scroll_v1"

export type BrowserStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type DailyScroll = {
  id: string
  date: string
  mode: ZhixingMode
  currentThought: string
  heartThief: string
  primaryMirror: ZhixingMirrorId
  secondaryMirrors: ZhixingMirrorId[]
  behaviorRisks: string[]
  dailyEvidence: string
  dailyPractice: string
  seal: {
    id: ZhixingSealId
    name: string
    sealedAt?: string
  }
  verdict: string
  completedNodes: ZhixingNodeId[]
  zhixingScore: number
  systemTradeRate: number
  emotionalTradeCount: number
  reviewCompleteness: number
  createdAt: string
  updatedAt: string
}

export type ZhixingNodeStatus = "completed" | "current" | "locked"

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

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function getZhixingDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function createDefaultDailyScroll(date = new Date()): DailyScroll {
  const dateKey = getZhixingDateKey(date)
  const createdAt = date.toISOString()
  const mirror = getMirrorDefinition("urgent")
  const seal = getSealDefinition(mirror.sealId)
  const dailyPractice = seal.practiceAction
  const behaviorRisks = mirror.behaviorRisks.slice(0, 2)

  return {
    id: `zhixing_${dateKey}`,
    date: dateKey,
    mode: "daily",
    currentThought: mirror.typicalThoughts[0] ?? "再不上就来不及了。",
    heartThief: "急",
    primaryMirror: mirror.id,
    secondaryMirrors: ["doubt", "regret"],
    behaviorRisks,
    dailyEvidence: "我看见自己把错过当成亏，把速度当成纪律。",
    dailyPractice,
    seal: {
      id: seal.id,
      name: seal.name,
    },
    verdict: buildDailyVerdict({
      primaryMirrorId: mirror.id,
      dailyPractice,
      behaviorRisks,
    }),
    completedNodes: [],
    zhixingScore: 0,
    systemTradeRate: 0,
    emotionalTradeCount: 0,
    reviewCompleteness: 0,
    createdAt,
    updatedAt: createdAt,
  }
}

function normalizeDailyScroll(value: DailyScroll, fallback: DailyScroll): DailyScroll {
  if (!value || typeof value !== "object") return fallback
  if (value.date !== fallback.date) return fallback

  const completedNodes = Array.from(new Set((value.completedNodes || [])
    .filter((nodeId): nodeId is ZhixingNodeId => zhixingScrollNodes.some((node) => node.id === nodeId))))
  const primaryMirror = getMirrorDefinition(value.primaryMirror || fallback.primaryMirror)
  const seal = getSealDefinition(value.seal?.id || primaryMirror.sealId)

  return {
    ...fallback,
    ...value,
    primaryMirror: primaryMirror.id,
    seal: {
      id: seal.id,
      name: value.seal?.name || seal.name,
      sealedAt: value.seal?.sealedAt,
    },
    completedNodes,
    verdict: value.verdict || fallback.verdict,
    updatedAt: value.updatedAt || fallback.updatedAt,
  }
}

export function loadDailyScroll(storage: BrowserStorage | null | undefined, date = new Date()) {
  const fallback = createDefaultDailyScroll(date)
  const raw = safeGet(storage, zhixingScrollStorageKey)
  const parsed = parseJson<DailyScroll>(raw, fallback)

  return normalizeDailyScroll(parsed, fallback)
}

export function saveDailyScroll(scroll: DailyScroll, storage: BrowserStorage | null | undefined) {
  safeSet(storage, zhixingScrollStorageKey, JSON.stringify(scroll))
  return scroll
}

export function getCurrentZhixingNodeIndex(scroll: DailyScroll) {
  const currentIndex = zhixingScrollNodes.findIndex((node) => !scroll.completedNodes.includes(node.id))
  return currentIndex === -1 ? zhixingScrollNodes.length - 1 : currentIndex
}

export function getZhixingNodeStatus(nodeId: ZhixingNodeId, scroll: DailyScroll): ZhixingNodeStatus {
  if (scroll.completedNodes.includes(nodeId)) return "completed"

  const nodeIndex = zhixingScrollNodes.findIndex((node) => node.id === nodeId)
  return nodeIndex === getCurrentZhixingNodeIndex(scroll) ? "current" : "locked"
}

export function completeZhixingNode(scroll: DailyScroll, nodeId: ZhixingNodeId, now = new Date()): DailyScroll {
  const completedNodes = Array.from(new Set([...scroll.completedNodes, nodeId]))
  const mirror = getMirrorDefinition(scroll.primaryMirror)
  const seal = getSealDefinition(scroll.seal.id || mirror.sealId)
  const isSealed = nodeId === "liangzhi-seal" || Boolean(scroll.seal.sealedAt)
  const updatedAt = now.toISOString()
  const nextScore = Math.round((completedNodes.length / zhixingScrollNodes.length) * 100)
  const verdict = nodeId === "daily-verdict" || nodeId === "liangzhi-seal"
    ? buildDailyVerdict({
      primaryMirrorId: mirror.id,
      dailyPractice: scroll.dailyPractice || seal.practiceAction,
      behaviorRisks: scroll.behaviorRisks,
    })
    : scroll.verdict

  return {
    ...scroll,
    completedNodes,
    seal: {
      id: seal.id,
      name: seal.name,
      sealedAt: isSealed ? scroll.seal.sealedAt ?? updatedAt : undefined,
    },
    verdict,
    zhixingScore: nextScore,
    systemTradeRate: Math.max(scroll.systemTradeRate, nodeId === "daily-practice" ? 62 : scroll.systemTradeRate),
    emotionalTradeCount: nodeId === "heart-thief" ? Math.max(1, scroll.emotionalTradeCount) : scroll.emotionalTradeCount,
    reviewCompleteness: Math.max(scroll.reviewCompleteness, nodeId === "heart-archive" ? 80 : scroll.reviewCompleteness),
    updatedAt,
  }
}

export function resetDailyScroll(storage: BrowserStorage | null | undefined, date = new Date()) {
  return saveDailyScroll(createDefaultDailyScroll(date), storage)
}

export function getZhixingProgressLabel(scroll: DailyScroll) {
  const completed = scroll.completedNodes.length
  return `今日已照 ${completed}/${zhixingScrollNodes.length}`
}
