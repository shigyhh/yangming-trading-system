export type BrowserStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const TODAY_ONE_THOUGHT_STORAGE_KEY = "zhaojian:today-one-thought:v1"
export const TODAY_ONE_THOUGHT_USER_SEED_KEY = "zhaojian:today-one-thought:user-seed:v1"
export const TODAY_ONE_THOUGHT_CONFIRM_LIMIT = 3
export const TODAY_ONE_THOUGHT_CHANGE_LIMIT = TODAY_ONE_THOUGHT_CONFIRM_LIMIT

export type TodayOneThoughtSourceItem = {
  thoughtId: string
  sceneId: string
  sceneName: string
  mirrorId: string
  thief: string
  itemId: string
  tradeMoment: string
  os: string
  reflection: string
  evidence: string
  practice: string
  coreStatement: string
  evidenceLines?: string[]
  practiceLines?: string[]
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
