export type BrowserStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const TODAY_ONE_THOUGHT_STORAGE_KEY = "zhaojian:today-one-thought:v1"
export const TODAY_ONE_THOUGHT_USER_SEED_KEY = "zhaojian:today-one-thought:user-seed:v1"
export const TODAY_ONE_THOUGHT_CONFIRM_LIMIT = 3
export const TODAY_ONE_THOUGHT_CHANGE_LIMIT = TODAY_ONE_THOUGHT_CONFIRM_LIMIT
export const ONE_THOUGHT_RECORDS_STORAGE_KEY = "zhaojian:one-thought-records:v1"

export type OneThought = {
  id: string
  sceneId: string
  sceneName: string
  mirrorId: string
  tradeMoment: string
  os: string
  reflection: string
  hiddenThought?: string
  thief: string
  evidence: string
  practice: string
  intensity: number
  date?: string
}

export type TodayOneThoughtSourceItem = OneThought & {
  thoughtId: string
  itemId: string
  coreStatement: string
  evidenceLines?: string[]
  practiceLines?: string[]
}

export type OneThoughtRecord = {
  id: string
  recordId: string
  date: string
  dayIndex: number
  thoughtId: string
  sceneId: string
  sceneName: string
  mirrorId: string
  mirrorName: string
  tradeMoment: string
  thief: string
  os: string
  reflection: string
  evidence: string
  practice: string
  completed: boolean
  sealedAt?: string
}

export type OneThoughtMatchResult = {
  matchedSceneId: string
  matchedThoughtId: string
  confidence: number
  matchedThief: string
  matchedMirrorId: string
  suggestedReflection: string
  suggestedPractice: string
}

export type OneThoughtGrowthPeriod = "7d" | "21d" | "30d" | "365d"

export type OneThoughtGrowthProfile = {
  userId: string
  period: OneThoughtGrowthPeriod
  topThoughts: Array<{
    os: string
    sceneId: string
    count: number
  }>
  thiefTrend: Array<{
    thief: string
    count: number
  }>
  mirrorTrend: Array<{
    mirrorId: string
    count: number
  }>
  growthPrompt: string
}

export type TodayOneThoughtStoredState = {
  dateKey: string
  userSeed: string
  thoughtId: string
  confirmationCount: number
  confirmedThoughtIds: string[]
  updatedAt: number
}

export type TodayOneThoughtSnapshot = TodayOneThoughtSourceItem & {
  dateKey: string
  confirmationCount: number
  remainingConfirmations: number
  changeCount: number
  remainingChanges: number
  storedState: TodayOneThoughtStoredState
}

type TodayOneThoughtInput = {
  sourceItems: TodayOneThoughtSourceItem[]
  storage?: BrowserStorage | null
  date?: Date
  excludeThoughtIds?: string[]
}

type CurrentTodayOneThoughtInput = TodayOneThoughtInput & {
  currentState?: TodayOneThoughtStoredState
}

type CreateTodayOneThoughtInput = {
  sourceItems: TodayOneThoughtSourceItem[]
  date?: Date
  userSeed?: string
}

const fallbackSourceItem: TodayOneThoughtSourceItem = {
  thoughtId: "fallback-thought",
  id: "fallback-thought",
  sceneId: "fallback-scene",
  sceneName: "今日一念",
  mirrorId: "fallback",
  thief: "一念",
  itemId: "fallback-thought",
  tradeMoment: "照见此刻",
  os: "先照见这一念。",
  reflection: "你照见的是当下的反应。",
  evidence: "我看见自己正在起念。",
  practice: "停十秒。",
  coreStatement: "念头起处，便是练处。",
  intensity: 1,
}

function hashText(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
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

function cleanIdPart(value: string | number | undefined) {
  return String(value || "local")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "local"
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeOneThoughtRecord(value: unknown): OneThoughtRecord | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<OneThoughtRecord>
  if (!item.recordId || !item.date || !item.thoughtId || !item.sceneId || !item.mirrorId) return null

  const recordId = String(item.recordId)
  const dayIndex = Number(item.dayIndex)

  return {
    id: item.id ? String(item.id) : recordId,
    recordId,
    date: String(item.date),
    dayIndex: Number.isFinite(dayIndex) && dayIndex > 0 ? Math.trunc(dayIndex) : 0,
    thoughtId: String(item.thoughtId),
    sceneId: String(item.sceneId),
    sceneName: item.sceneName ? String(item.sceneName) : String(item.sceneId),
    mirrorId: String(item.mirrorId),
    mirrorName: item.mirrorName ? String(item.mirrorName) : String(item.mirrorId),
    tradeMoment: item.tradeMoment ? String(item.tradeMoment) : "",
    thief: String(item.thief || ""),
    os: String(item.os || ""),
    reflection: String(item.reflection || ""),
    evidence: String(item.evidence || ""),
    practice: String(item.practice || ""),
    completed: Boolean(item.completed),
    sealedAt: item.sealedAt ? String(item.sealedAt) : undefined,
  }
}

function clampConfirmationCount(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(TODAY_ONE_THOUGHT_CONFIRM_LIMIT, Math.max(0, Math.trunc(value)))
}

function createUserSeed() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID()
  return `zhaojian-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function getOrCreateUserSeed(storage: BrowserStorage | null | undefined) {
  const storedSeed = safeGet(storage, TODAY_ONE_THOUGHT_USER_SEED_KEY)
  if (storedSeed) return storedSeed

  const seed = storage ? createUserSeed() : "zhaojian-default-user"
  safeSet(storage, TODAY_ONE_THOUGHT_USER_SEED_KEY, seed)
  return seed
}

function normalizeConfirmedThoughtIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function readStoredState(storage: BrowserStorage | null | undefined): TodayOneThoughtStoredState | null {
  const rawState = safeGet(storage, TODAY_ONE_THOUGHT_STORAGE_KEY)
  if (!rawState) return null

  try {
    const parsed = JSON.parse(rawState) as Partial<TodayOneThoughtStoredState> & { changeCount?: number }
    if (!parsed.dateKey || !parsed.userSeed || !parsed.thoughtId) return null

    return {
      dateKey: parsed.dateKey,
      userSeed: parsed.userSeed,
      thoughtId: parsed.thoughtId,
      confirmationCount: clampConfirmationCount(parsed.confirmationCount ?? parsed.changeCount ?? 0),
      confirmedThoughtIds: normalizeConfirmedThoughtIds(parsed.confirmedThoughtIds),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return null
  }
}

function writeStoredState(storage: BrowserStorage | null | undefined, state: TodayOneThoughtStoredState) {
  safeSet(storage, TODAY_ONE_THOUGHT_STORAGE_KEY, JSON.stringify(state))
}

function getSourceItems(sourceItems: TodayOneThoughtSourceItem[]) {
  return sourceItems.length ? sourceItems : [fallbackSourceItem]
}

function sourceItemForThoughtId(sourceItems: TodayOneThoughtSourceItem[], thoughtId: string) {
  const items = getSourceItems(sourceItems)
  return items.find((item) => item.thoughtId === thoughtId) ?? items[0] ?? fallbackSourceItem
}

function hasSourceItem(sourceItems: TodayOneThoughtSourceItem[], thoughtId: string) {
  return getSourceItems(sourceItems).some((item) => item.thoughtId === thoughtId)
}

function selectStableThoughtId(sourceItems: TodayOneThoughtSourceItem[], userSeed: string, dateKey: string) {
  const items = getSourceItems(sourceItems)
  return items[hashText(`${userSeed}:${dateKey}:initial`) % items.length]?.thoughtId ?? fallbackSourceItem.thoughtId
}

function selectFloatingThoughtId(
  sourceItems: TodayOneThoughtSourceItem[],
  previousThoughtId?: string,
  excludedThoughtIds: string[] = [],
) {
  const items = getSourceItems(sourceItems)
  if (items.length <= 1) return items[0]?.thoughtId ?? fallbackSourceItem.thoughtId

  const excluded = new Set(excludedThoughtIds)
  const availableItems = items.filter((item) => item.thoughtId !== previousThoughtId && !excluded.has(item.thoughtId))
  const fallbackItems = items.filter((item) => item.thoughtId !== previousThoughtId)
  const drawItems = availableItems.length ? availableItems : fallbackItems.length ? fallbackItems : items

  return drawItems[Math.floor(Math.random() * drawItems.length)]?.thoughtId ?? items[0]?.thoughtId ?? fallbackSourceItem.thoughtId
}

function snapshotFromState(
  sourceItems: TodayOneThoughtSourceItem[],
  state: TodayOneThoughtStoredState,
): TodayOneThoughtSnapshot {
  const item = sourceItemForThoughtId(sourceItems, state.thoughtId)
  const confirmationCount = clampConfirmationCount(state.confirmationCount)
  const remainingConfirmations = Math.max(0, TODAY_ONE_THOUGHT_CONFIRM_LIMIT - confirmationCount)

  return {
    ...item,
    date: state.dateKey,
    dateKey: state.dateKey,
    confirmationCount,
    remainingConfirmations,
    changeCount: confirmationCount,
    remainingChanges: remainingConfirmations,
    storedState: {
      ...state,
      confirmationCount,
    },
  }
}

function createFloatingState({
  sourceItems,
  date,
  userSeed,
  confirmationCount,
  confirmedThoughtIds,
  previousThoughtId,
  excludeThoughtIds,
}: {
  sourceItems: TodayOneThoughtSourceItem[]
  date: Date
  userSeed: string
  confirmationCount: number
  confirmedThoughtIds: string[]
  previousThoughtId?: string
  excludeThoughtIds?: string[]
}): TodayOneThoughtStoredState {
  const dateKey = getTodayOneThoughtDateKey(date)

  return {
    dateKey,
    userSeed,
    thoughtId: selectFloatingThoughtId(
      sourceItems,
      previousThoughtId,
      [...confirmedThoughtIds, ...(excludeThoughtIds ?? [])],
    ),
    confirmationCount,
    confirmedThoughtIds,
    updatedAt: date.getTime(),
  }
}

export function getTodayOneThoughtDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function createTodayOneThoughtSnapshot({
  sourceItems,
  date = new Date(),
  userSeed = "zhaojian-default-user",
}: CreateTodayOneThoughtInput): TodayOneThoughtSnapshot {
  const dateKey = getTodayOneThoughtDateKey(date)
  const state = {
    dateKey,
    userSeed,
    thoughtId: selectStableThoughtId(sourceItems, userSeed, dateKey),
    confirmationCount: 0,
    confirmedThoughtIds: [],
    updatedAt: date.getTime(),
  }

  return snapshotFromState(sourceItems, state)
}

export function readStableTodayOneThought({
  sourceItems,
  storage = null,
  date = new Date(),
}: TodayOneThoughtInput): TodayOneThoughtSnapshot {
  const dateKey = getTodayOneThoughtDateKey(date)
  const userSeed = getOrCreateUserSeed(storage)
  const storedState = readStoredState(storage)

  if (storedState?.dateKey === dateKey && hasSourceItem(sourceItems, storedState.thoughtId)) {
    return snapshotFromState(sourceItems, {
      ...storedState,
      confirmationCount: clampConfirmationCount(storedState.confirmationCount),
      confirmedThoughtIds: storedState.confirmedThoughtIds.filter((thoughtId) => hasSourceItem(sourceItems, thoughtId)),
    })
  }

  const nextState = {
    dateKey,
    userSeed,
    thoughtId: selectStableThoughtId(sourceItems, userSeed, dateKey),
    confirmationCount: 0,
    confirmedThoughtIds: [],
    updatedAt: date.getTime(),
  }

  writeStoredState(storage, nextState)
  return snapshotFromState(sourceItems, nextState)
}

export function readOrCreateTodayOneThought({
  sourceItems,
  storage = null,
  date = new Date(),
  excludeThoughtIds = [],
}: TodayOneThoughtInput): TodayOneThoughtSnapshot {
  const dateKey = getTodayOneThoughtDateKey(date)
  const userSeed = getOrCreateUserSeed(storage)
  const storedState = readStoredState(storage)

  if (storedState?.dateKey === dateKey) {
    const confirmedThoughtIds = storedState.confirmedThoughtIds.filter((thoughtId) => hasSourceItem(sourceItems, thoughtId))
    const nextState = createFloatingState({
      sourceItems,
      date,
      userSeed,
      confirmationCount: clampConfirmationCount(storedState.confirmationCount),
      confirmedThoughtIds,
      previousThoughtId: hasSourceItem(sourceItems, storedState.thoughtId) ? storedState.thoughtId : undefined,
      excludeThoughtIds,
    })

    writeStoredState(storage, nextState)
    return snapshotFromState(sourceItems, nextState)
  }

  const nextState = createFloatingState({
    sourceItems,
    date,
    userSeed,
    confirmationCount: 0,
    confirmedThoughtIds: [],
    excludeThoughtIds,
  })

  writeStoredState(storage, nextState)
  return snapshotFromState(sourceItems, nextState)
}

export function drawTodayOneThought({
  sourceItems,
  currentState,
  storage = null,
  date = new Date(),
  excludeThoughtIds = [],
}: CurrentTodayOneThoughtInput): TodayOneThoughtSnapshot {
  const current = currentState ?? readOrCreateTodayOneThought({ sourceItems, storage, date }).storedState
  const dateKey = getTodayOneThoughtDateKey(date)

  if (current.dateKey !== dateKey) return readOrCreateTodayOneThought({ sourceItems, storage, date, excludeThoughtIds })

  const nextState = createFloatingState({
    sourceItems,
    date,
    userSeed: current.userSeed || getOrCreateUserSeed(storage),
    confirmationCount: clampConfirmationCount(current.confirmationCount),
    confirmedThoughtIds: current.confirmedThoughtIds.filter((thoughtId) => hasSourceItem(sourceItems, thoughtId)),
    previousThoughtId: current.thoughtId,
    excludeThoughtIds,
  })

  writeStoredState(storage, nextState)
  return snapshotFromState(sourceItems, nextState)
}

export function confirmTodayOneThought({
  sourceItems,
  currentState,
  storage = null,
  date = new Date(),
}: CurrentTodayOneThoughtInput): TodayOneThoughtSnapshot {
  const current = currentState ?? readOrCreateTodayOneThought({ sourceItems, storage, date }).storedState
  const dateKey = getTodayOneThoughtDateKey(date)

  if (current.dateKey !== dateKey) return readOrCreateTodayOneThought({ sourceItems, storage, date })

  const confirmationCount = clampConfirmationCount(current.confirmationCount)
  if (confirmationCount >= TODAY_ONE_THOUGHT_CONFIRM_LIMIT) return snapshotFromState(sourceItems, current)

  const confirmedThoughtIds = Array.from(new Set([...current.confirmedThoughtIds, current.thoughtId]))
  const nextState = {
    ...current,
    confirmationCount: confirmationCount + 1,
    confirmedThoughtIds,
    updatedAt: date.getTime(),
  }

  writeStoredState(storage, nextState)
  return snapshotFromState(sourceItems, nextState)
}

export const changeTodayOneThought = drawTodayOneThought

export function createOneThoughtRecord(
  thought: OneThought | TodayOneThoughtSnapshot | TodayOneThoughtSourceItem,
  options: {
    id?: string
    recordId?: string
    date?: string
    dayIndex?: number
    mirrorName?: string
    completed?: boolean
    sealedAt?: string
  } = {},
): OneThoughtRecord {
  const date = options.date ?? thought.date ?? getTodayOneThoughtDateKey(new Date())
  const thoughtId = "thoughtId" in thought ? thought.thoughtId : thought.id
  const recordId = options.recordId ?? `one_thought_${cleanIdPart(date)}_${cleanIdPart(thoughtId)}`
  const dayIndex = Number(options.dayIndex)

  return {
    id: options.id ?? recordId,
    recordId,
    date,
    dayIndex: Number.isFinite(dayIndex) && dayIndex > 0 ? Math.trunc(dayIndex) : 0,
    thoughtId,
    sceneId: thought.sceneId,
    sceneName: thought.sceneName,
    mirrorId: thought.mirrorId,
    mirrorName: options.mirrorName ?? thought.mirrorId,
    tradeMoment: thought.tradeMoment,
    thief: thought.thief,
    os: thought.os,
    reflection: thought.reflection,
    evidence: thought.evidence,
    practice: thought.practice,
    completed: options.completed ?? true,
    sealedAt: options.sealedAt,
  }
}

export function loadOneThoughtRecords(storage: BrowserStorage | null | undefined = null): OneThoughtRecord[] {
  const parsedRecords = parseJson<unknown[]>(safeGet(storage, ONE_THOUGHT_RECORDS_STORAGE_KEY), [])

  if (!Array.isArray(parsedRecords)) return []

  return parsedRecords
    .map(normalizeOneThoughtRecord)
    .filter((record): record is OneThoughtRecord => Boolean(record))
    .sort((left, right) => getRecordTime(right) - getRecordTime(left))
}

export function saveOneThoughtRecord(
  record: OneThoughtRecord,
  storage: BrowserStorage | null | undefined = null,
): OneThoughtRecord[] {
  const nextRecords = [
    ...loadOneThoughtRecords(storage).filter((item) => item.recordId !== record.recordId),
    record,
  ].sort((left, right) => getRecordTime(right) - getRecordTime(left))

  safeSet(storage, ONE_THOUGHT_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords))
  return nextRecords
}

const userThoughtMatchRules = [
  {
    sceneIds: ["scene_09", "scene_10"],
    keywords: ["补仓", "成本", "摊平", "回来", "总会回来", "越跌越补"],
  },
  {
    sceneIds: ["scene_28", "scene_29"],
    keywords: ["回本", "解套", "本钱", "回到成本"],
  },
  {
    sceneIds: ["scene_07", "scene_08"],
    keywords: ["再等等", "不卖", "扛", "止损", "死撑"],
  },
  {
    sceneIds: ["scene_01", "scene_19", "scene_27"],
    keywords: ["追", "上车", "涨停", "拉升", "高位"],
  },
  {
    sceneIds: ["scene_23", "scene_24", "scene_34"],
    keywords: ["消息", "群里", "老师", "喊", "观点"],
  },
] as const

export function matchUserThought(inputText: string, sourceItems: TodayOneThoughtSourceItem[]): OneThoughtMatchResult {
  const text = inputText.trim()
  const items = getSourceItems(sourceItems)
  const rankedRules = userThoughtMatchRules
    .map((rule) => ({
      rule,
      score: rule.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score)
  const topRule = rankedRules[0]
  const matchedItem =
    topRule && topRule.score > 0
      ? items.find((item) => topRule.rule.sceneIds.some((sceneId) => sceneId === item.sceneId)) ?? items[0] ?? fallbackSourceItem
      : items[hashText(text || "今日一念") % items.length] ?? fallbackSourceItem
  const confidence = topRule && topRule.score > 0
    ? Math.min(0.92, 0.52 + topRule.score * 0.12)
    : 0.36

  return {
    matchedSceneId: matchedItem.sceneId,
    matchedThoughtId: matchedItem.thoughtId,
    confidence,
    matchedThief: matchedItem.thief,
    matchedMirrorId: matchedItem.mirrorId,
    suggestedReflection: matchedItem.reflection,
    suggestedPractice: matchedItem.practice,
  }
}

export function buildOneThoughtGrowthProfile({
  userId,
  period,
  records,
}: {
  userId: string
  period: OneThoughtGrowthPeriod
  records: OneThoughtRecord[]
}): OneThoughtGrowthProfile {
  const recentRecords = filterRecordsByPeriod(records, period)
  const topThoughts = countBy(
    recentRecords,
    (record) => `${record.sceneId}:${record.os}`,
    (record) => ({ os: record.os, sceneId: record.sceneId }),
  )
  const thiefTrend = countThieves(recentRecords)
  const mirrorTrend = countBy(
    recentRecords,
    (record) => record.mirrorId,
    (record) => ({ mirrorId: record.mirrorId }),
  )
  const topThought = topThoughts[0]?.os || "今日一念"
  const topThief = thiefTrend[0]?.thief || "念"

  return {
    userId,
    period,
    topThoughts,
    thiefTrend,
    mirrorTrend,
    growthPrompt: `你最近最常被「${topThought}」带走。\n这一念背后，是${topThief}。`,
  }
}

function getRecordTime(record: Pick<OneThoughtRecord, "date" | "sealedAt">) {
  const value = record.sealedAt ?? record.date
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function periodToDays(period: OneThoughtGrowthPeriod) {
  if (period === "21d") return 21
  if (period === "30d") return 30
  if (period === "365d") return 365
  return 7
}

function filterRecordsByPeriod(records: OneThoughtRecord[], period: OneThoughtGrowthPeriod) {
  const sortedRecords = [...records].sort((left, right) => getRecordTime(right) - getRecordTime(left))
  const latestTime = getRecordTime(sortedRecords[0] ?? { date: new Date().toISOString() })
  const fromTime = latestTime - periodToDays(period) * 24 * 60 * 60 * 1000

  return sortedRecords.filter((record) => getRecordTime(record) >= fromTime)
}

function countBy<T extends Record<string, string>>(
  records: OneThoughtRecord[],
  keyForRecord: (record: OneThoughtRecord) => string,
  seedForRecord: (record: OneThoughtRecord) => T,
): Array<T & { count: number }> {
  const countMap = new Map<string, T & { count: number }>()

  records.forEach((record) => {
    const key = keyForRecord(record)
    const current = countMap.get(key)

    if (current) {
      current.count += 1
      return
    }

    countMap.set(key, {
      ...seedForRecord(record),
      count: 1,
    })
  })

  return Array.from(countMap.values()).sort((left, right) => right.count - left.count)
}

function countThieves(records: OneThoughtRecord[]) {
  const countMap = new Map<string, { thief: string; count: number }>()

  records.forEach((record) => {
    normalizeThiefGlyphs(record.thief).forEach((thief) => {
      const current = countMap.get(thief)

      if (current) {
        current.count += 1
        return
      }

      countMap.set(thief, { thief, count: 1 })
    })
  })

  return Array.from(countMap.values()).sort((left, right) => right.count - left.count)
}

function normalizeThiefGlyphs(thief: string) {
  const glyphs: string[] = []
  const push = (glyph: string) => {
    if (!glyphs.includes(glyph)) glyphs.push(glyph)
  }

  if (thief.includes("贪")) push("贪")
  if (thief.includes("急")) push("急")
  if (thief.includes("惧") || thief.includes("怯")) push("惧")
  if (thief.includes("疑")) push("疑")
  if (thief.includes("执") || thief.includes("痴") || thief.includes("慢") || thief.includes("懒")) push("执")
  if (thief.includes("从")) push("从")

  return glyphs.length ? glyphs : [thief || "念"]
}
