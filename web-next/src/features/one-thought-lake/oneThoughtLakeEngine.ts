import type {
  BrowserStorage,
  OneThoughtMatchResult,
  TodayOneThoughtSourceItem,
} from "../../data/insight-engine/today-one-thought-core"
import { getTodayOneThoughtDateKey } from "../../data/insight-engine/today-one-thought-core"

export const ONE_THOUGHT_LAKE_STORAGE_KEY = "zhaojian:one-thought-lake:v1"
export const ONE_THOUGHT_LAKE_RESONANCE_KEY = "zhaojian:one-thought-lake-resonance:v1"
export const ONE_THOUGHT_LAKE_COMMENT_KEY = "zhaojian:one-thought-lake-comments:v1"

export type OneThoughtLakeEntry = {
  id: string
  date: string
  anonymousText: string
  matchedSceneId: string
  matchedSceneName: string
  thief: string
  mirrorId: string
  mirrorName: string
  sameThoughtCount: number
  regionScope: "CN"
  createdAt: string
  thoughtId: string
  os: string
  tradeMoment: string
  reflection: string
  evidence: string
  practice: string
}

export type OneThoughtLakeScreenResult = {
  allowed: boolean
  cleanedText: string
  reason?: string
}

export const ONE_THOUGHT_LAKE_BLOCKED_INPUT_REASON =
  "心湖只照见交易中的念头，不回应股票代码、收益数字、荐股、喊单、带单和联系方式。"

export const ONE_THOUGHT_LAKE_UNRELATED_INPUT_REASON =
  "心湖只回应交易中的念头。请写下临盘时真实冒出来的一句话。"

export type OneThoughtLakeComment = {
  id: string
  date: string
  thoughtId: string
  entryId: string
  text: string
  createdAt: string
  resonanceCount: number
}

const seedOsOrder = [
  "再等等。",
  "回本我就走。",
  "再补一点。",
  "卖完就涨。",
  "我再拿一下就好了。",
  "又卖飞了。",
  "解套我就走。",
  "再补最后一次。",
  "拉红我就走。",
  "算了，再等等。",
  "机会不会等我。",
  "人家都敢上。",
]

const seedCounts = [42, 38, 35, 32, 29, 26, 23, 21, 19, 17, 15, 13]

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

const mirrorNameByEchoKey: Record<string, string> = {
  anxiety: "焦虑之镜",
  chase: "追涨之镜",
  conscience: "良知之镜",
  delay: "拖延之镜",
  fantasy: "幻想之镜",
  gamble: "赌性之镜",
  herd: "从众之镜",
  hesitate: "犹疑之镜",
  hold: "扛单之镜",
  liangzhi: "良知之镜",
}

const blockedPatterns = [
  /^[\d\s+-]+$/,
  /\b[036]\d{5}\b/,
  /(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d){8}\b/,
  /\b\d{10,}\b/,
  /(目标价|买什么|卖什么|荐股|喊单|带单|跟单|股票代码|推荐买入|推荐卖出|买入价|卖出价|止盈价|止损位)/i,
  /(稳赚|必赚|保赚|收益保证|翻倍|暴富|抄底|逃顶|开户|开户链接)/i,
  /(微信|vx|v信|QQ|qq|电话|手机号|联系方式|加我|私信|进群|群号)/i,
  /[+-]?\d+(?:\.\d+)?\s*(?:%|％|元|万|倍|个点|收益率)/,
]

const tradingThoughtPattern =
  /(买|卖|涨|跌|亏|赚|回本|解套|补仓|补|追|割肉|止损|止盈|仓位|持仓|空仓|满仓|重仓|轻仓|开盘|收盘|临盘|盘中|行情|账户|标题|消息|利好|利空|机会|踏空|卖飞|套|单|交易|下单|冲动|犹豫|焦虑|害怕|后悔|恐惧|贪|急|惧|疑|执|从|烦|慌|悔|怕|忍|等|拿|逃|扛|赌|梭|撤|管住|不甘心|不服|侥幸|上头)/

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

function cleanText(value: string, maxLength = 80) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength)
}

function cleanIdPart(value: string | number | undefined) {
  return String(value || "local")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "local"
}

function normalizeLakeEntry(value: unknown): OneThoughtLakeEntry | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<OneThoughtLakeEntry>
  if (!item.id || !item.date || !item.thoughtId || !item.matchedSceneId) return null

  const mirrorId = String(item.mirrorId || "")

  return {
    id: String(item.id),
    date: String(item.date),
    anonymousText: cleanText(String(item.anonymousText || item.os || "这一念浮上来了。")),
    matchedSceneId: String(item.matchedSceneId),
    matchedSceneName: String(item.matchedSceneName || "未命名场景"),
    thief: String(item.thief || "念"),
    mirrorId,
    mirrorName: String(item.mirrorName || getOneThoughtLakeMirrorName(mirrorId)),
    sameThoughtCount: Math.max(1, Math.trunc(Number(item.sameThoughtCount) || 1)),
    regionScope: "CN",
    createdAt: String(item.createdAt || `${item.date}T00:00:00.000Z`),
    thoughtId: String(item.thoughtId),
    os: cleanText(String(item.os || item.anonymousText || "这一念浮上来了。")),
    tradeMoment: String(item.tradeMoment || ""),
    reflection: String(item.reflection || ""),
    evidence: String(item.evidence || ""),
    practice: String(item.practice || ""),
  }
}

function normalizeLakeComment(value: unknown): OneThoughtLakeComment | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<OneThoughtLakeComment>
  if (!item.id || !item.date || !item.thoughtId || !item.text) return null

  return {
    id: String(item.id),
    date: String(item.date),
    thoughtId: String(item.thoughtId),
    entryId: String(item.entryId || item.thoughtId),
    text: cleanText(String(item.text), 72),
    createdAt: String(item.createdAt || `${item.date}T00:00:00.000Z`),
    resonanceCount: Math.max(0, Math.trunc(Number(item.resonanceCount) || 0)),
  }
}

export function getOneThoughtLakeMirrorName(mirrorId: string) {
  const echoKey = mirrorEchoKeyByInsightMirrorId[mirrorId] ?? mirrorId
  return mirrorNameByEchoKey[echoKey] ?? "心镜显影"
}

export function screenOneThoughtLakeInput(inputText: string): OneThoughtLakeScreenResult {
  const cleanedText = cleanText(inputText, 64)

  if (cleanedText.length < 2) {
    return { allowed: false, cleanedText, reason: "请写下一句真实的一念。" }
  }

  if (blockedPatterns.some((pattern) => pattern.test(cleanedText))) {
    return {
      allowed: false,
      cleanedText,
      reason: ONE_THOUGHT_LAKE_BLOCKED_INPUT_REASON,
    }
  }

  if (!tradingThoughtPattern.test(cleanedText)) {
    return {
      allowed: false,
      cleanedText,
      reason: ONE_THOUGHT_LAKE_UNRELATED_INPUT_REASON,
    }
  }

  return { allowed: true, cleanedText }
}

export function createOneThoughtLakeEntry(
  thought: TodayOneThoughtSourceItem,
  options: {
    anonymousText?: string
    createdAt?: string
    date?: string
    id?: string
    sameThoughtCount?: number
  } = {},
): OneThoughtLakeEntry {
  const createdAt = options.createdAt ?? new Date().toISOString()
  const date = options.date ?? getTodayOneThoughtDateKey(new Date(createdAt))
  const anonymousText = cleanText(options.anonymousText || thought.os)

  return {
    id: options.id ?? `lake_${cleanIdPart(date)}_${cleanIdPart(thought.thoughtId)}_${cleanIdPart(createdAt)}`,
    date,
    anonymousText,
    matchedSceneId: thought.sceneId,
    matchedSceneName: thought.sceneName,
    thief: thought.thief,
    mirrorId: thought.mirrorId,
    mirrorName: getOneThoughtLakeMirrorName(thought.mirrorId),
    sameThoughtCount: Math.max(1, Math.trunc(options.sameThoughtCount ?? 1)),
    regionScope: "CN",
    createdAt,
    thoughtId: thought.thoughtId,
    os: thought.os,
    tradeMoment: thought.tradeMoment,
    reflection: thought.reflection,
    evidence: thought.evidence,
    practice: thought.practice,
  }
}

export function buildMockOneThoughtLakeEntries(
  sourceItems: TodayOneThoughtSourceItem[],
  date = new Date(),
): OneThoughtLakeEntry[] {
  const dateKey = getTodayOneThoughtDateKey(date)
  const selected: TodayOneThoughtSourceItem[] = []

  for (const os of seedOsOrder) {
    const thought = sourceItems.find((item) => item.os === os)
    if (thought && !selected.some((item) => item.thoughtId === thought.thoughtId)) selected.push(thought)
  }

  for (const thought of sourceItems) {
    if (!selected.some((item) => item.thoughtId === thought.thoughtId)) selected.push(thought)
  }

  return selected.map((thought, index) =>
    createOneThoughtLakeEntry(thought, {
      date: dateKey,
      id: `lake_seed_${dateKey}_${index}_${cleanIdPart(thought.thoughtId)}`,
      sameThoughtCount: seedCounts[index] ?? Math.max(3, 28 - (index % 18)),
    }),
  )
}

export function readOneThoughtLakeEntries(
  storage: BrowserStorage | null,
  sourceItems: TodayOneThoughtSourceItem[],
  date = new Date(),
) {
  const dateKey = getTodayOneThoughtDateKey(date)
  const seedEntries = buildMockOneThoughtLakeEntries(sourceItems, date)
  const localEntries = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_LAKE_STORAGE_KEY), [])
    .map(normalizeLakeEntry)
    .filter((entry): entry is OneThoughtLakeEntry => Boolean(entry))
    .filter((entry) => entry.date === dateKey)
  const resonanceById = parseJson<Record<string, number>>(safeGet(storage, ONE_THOUGHT_LAKE_RESONANCE_KEY), {})
  const entries = [...localEntries, ...seedEntries].map((entry) => ({
    ...entry,
    sameThoughtCount: entry.sameThoughtCount + Math.max(0, Math.trunc(resonanceById[entry.id] ?? 0)),
  }))

  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values())
}

export function saveOneThoughtLakeEntry(entry: OneThoughtLakeEntry, storage: BrowserStorage | null) {
  const normalizedEntry = normalizeLakeEntry(entry)
  if (!normalizedEntry) return []

  const currentEntries = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_LAKE_STORAGE_KEY), [])
    .map(normalizeLakeEntry)
    .filter((item): item is OneThoughtLakeEntry => Boolean(item))
  const nextEntries = [normalizedEntry, ...currentEntries.filter((item) => item.id !== normalizedEntry.id)].slice(0, 80)

  safeSet(storage, ONE_THOUGHT_LAKE_STORAGE_KEY, JSON.stringify(nextEntries))
  return nextEntries
}

export function readOneThoughtLakeComments(
  storage: BrowserStorage | null,
  thoughtId?: string,
  date = new Date(),
) {
  const dateKey = getTodayOneThoughtDateKey(date)
  const comments = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_LAKE_COMMENT_KEY), [])
    .map(normalizeLakeComment)
    .filter((item): item is OneThoughtLakeComment => Boolean(item))
    .filter((item) => item.date === dateKey)

  return thoughtId ? comments.filter((item) => item.thoughtId === thoughtId) : comments
}

export function createOneThoughtLakeComment(
  entry: OneThoughtLakeEntry,
  text: string,
  date = new Date(),
): OneThoughtLakeComment {
  const createdAt = date.toISOString()
  const dateKey = getTodayOneThoughtDateKey(date)

  return {
    id: `lake_comment_${cleanIdPart(date.getTime())}_${cleanIdPart(entry.thoughtId)}`,
    date: dateKey,
    thoughtId: entry.thoughtId,
    entryId: entry.id,
    text: cleanText(text, 72),
    createdAt,
    resonanceCount: 0,
  }
}

export function saveOneThoughtLakeComment(comment: OneThoughtLakeComment, storage: BrowserStorage | null) {
  const normalizedComment = normalizeLakeComment(comment)
  if (!normalizedComment) return []

  const currentComments = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_LAKE_COMMENT_KEY), [])
    .map(normalizeLakeComment)
    .filter((item): item is OneThoughtLakeComment => Boolean(item))
  const nextComments = [
    normalizedComment,
    ...currentComments.filter((item) => item.id !== normalizedComment.id),
  ].slice(0, 160)

  safeSet(storage, ONE_THOUGHT_LAKE_COMMENT_KEY, JSON.stringify(nextComments))
  return nextComments
}

export function resonateWithOneThoughtLakeEntry(
  entryId: string,
  entries: OneThoughtLakeEntry[],
  storage: BrowserStorage | null,
) {
  const resonanceById = parseJson<Record<string, number>>(safeGet(storage, ONE_THOUGHT_LAKE_RESONANCE_KEY), {})
  resonanceById[entryId] = Math.max(0, Math.trunc(resonanceById[entryId] ?? 0)) + 1
  safeSet(storage, ONE_THOUGHT_LAKE_RESONANCE_KEY, JSON.stringify(resonanceById))

  return entries.map((entry) =>
    entry.id === entryId ? { ...entry, sameThoughtCount: entry.sameThoughtCount + 1 } : entry,
  )
}

export function findOneThoughtForMatch(
  match: OneThoughtMatchResult,
  sourceItems: TodayOneThoughtSourceItem[],
) {
  return (
    sourceItems.find((item) => item.thoughtId === match.matchedThoughtId) ??
    sourceItems.find((item) => item.sceneId === match.matchedSceneId) ??
    sourceItems[0] ??
    null
  )
}

export function createOneThoughtLakeEntryFromMatch(
  inputText: string,
  match: OneThoughtMatchResult,
  sourceItems: TodayOneThoughtSourceItem[],
  date = new Date(),
) {
  const thought = findOneThoughtForMatch(match, sourceItems)
  if (!thought) return null

  return createOneThoughtLakeEntry(thought, {
    anonymousText: inputText,
    createdAt: date.toISOString(),
    date: getTodayOneThoughtDateKey(date),
    id: `lake_local_${cleanIdPart(date.getTime())}_${cleanIdPart(thought.thoughtId)}`,
    sameThoughtCount: 1,
  })
}

export function getOneThoughtLakeStats(entries: OneThoughtLakeEntry[]) {
  const total = entries.reduce((sum, entry) => sum + entry.sameThoughtCount, 0)
  const topEntry = [...entries].sort((left, right) => right.sameThoughtCount - left.sameThoughtCount)[0] ?? null

  return {
    total,
    topEntry,
  }
}
