import scene01Insight from "@/data/insight-engine/scenes/scene-01-chase-surge.json"
import scene02Insight from "@/data/insight-engine/scenes/scene-02-missed.json"
import scene03Insight from "@/data/insight-engine/scenes/scene-03-small-position.json"
import scene04Insight from "@/data/insight-engine/scenes/scene-04-sold-too-early.json"
import scene05Insight from "@/data/insight-engine/scenes/scene-05-sold-too-late.json"
import scene06Insight from "@/data/insight-engine/scenes/scene-06-floating-gain-fear.json"
import scene07Insight from "@/data/insight-engine/scenes/scene-07-unwilling-stop-loss.json"
import scene08Insight from "@/data/insight-engine/scenes/scene-08-hold-loss.json"
import scene09Insight from "@/data/insight-engine/scenes/scene-09-average-down.json"
import scene10Insight from "@/data/insight-engine/scenes/scene-10-more-average-down.json"
import scene11Insight from "@/data/insight-engine/scenes/scene-11-revenge-trade.json"
import scene12Insight from "@/data/insight-engine/scenes/scene-12-overconfidence.json"
import scene13Insight from "@/data/insight-engine/scenes/scene-13-heavy-position.json"
import scene14Insight from "@/data/insight-engine/scenes/scene-14-all-in.json"
import scene15Insight from "@/data/insight-engine/scenes/scene-15-empty-position.json"
import scene16Insight from "@/data/insight-engine/scenes/scene-16-change-plan.json"
import scene17Insight from "@/data/insight-engine/scenes/scene-17-stop-loss-regret.json"
import scene18Insight from "@/data/insight-engine/scenes/scene-18-profit-regret.json"
import scene19Insight from "@/data/insight-engine/scenes/scene-19-open-impulse.json"
import scene20Insight from "@/data/insight-engine/scenes/scene-20-close-impulse.json"
import scene21Insight from "@/data/insight-engine/scenes/scene-21-after-close-regret.json"
import scene22Insight from "@/data/insight-engine/scenes/scene-22-avoid-review.json"
import scene23Insight from "@/data/insight-engine/scenes/scene-23-news-trigger.json"
import scene24Insight from "@/data/insight-engine/scenes/scene-24-follow-call.json"
import scene25Insight from "@/data/insight-engine/scenes/scene-25-hot-theme.json"
import scene26Insight from "@/data/insight-engine/scenes/scene-26-bottom-fishing.json"
import scene27Insight from "@/data/insight-engine/scenes/scene-27-high-buy.json"
import scene28Insight from "@/data/insight-engine/scenes/scene-28-breakeven-obsession.json"
import scene29Insight from "@/data/insight-engine/scenes/scene-29-unlock-obsession.json"
import scene30Insight from "@/data/insight-engine/scenes/scene-30-see-right-no-buy.json"
import scene31Insight from "@/data/insight-engine/scenes/scene-31-instant-regret.json"
import scene32Insight from "@/data/insight-engine/scenes/scene-32-account-checking.json"
import scene33Insight from "@/data/insight-engine/scenes/scene-33-stock-hopping.json"
import scene34Insight from "@/data/insight-engine/scenes/scene-34-news-trading.json"
import scene35Insight from "@/data/insight-engine/scenes/scene-35-fear-holding.json"
import scene36Insight from "@/data/insight-engine/scenes/scene-36-fear-of-being-wrong.json"

import type { InsightSceneFile } from "./schema"
import {
  changeTodayOneThought as changeTodayOneThoughtCore,
  confirmTodayOneThought as confirmTodayOneThoughtCore,
  createTodayOneThoughtSnapshot as createTodayOneThoughtSnapshotCore,
  drawTodayOneThought as drawTodayOneThoughtCore,
  readOrCreateTodayOneThought as readOrCreateTodayOneThoughtCore,
} from "./today-one-thought-core"
import type {
  BrowserStorage,
  TodayOneThoughtSnapshot,
  TodayOneThoughtSourceItem,
  TodayOneThoughtStoredState,
} from "./today-one-thought-core"

export {
  TODAY_ONE_THOUGHT_CONFIRM_LIMIT,
  getTodayOneThoughtDateKey,
  TODAY_ONE_THOUGHT_CHANGE_LIMIT,
  TODAY_ONE_THOUGHT_STORAGE_KEY,
  TODAY_ONE_THOUGHT_USER_SEED_KEY,
} from "./today-one-thought-core"
export type {
  BrowserStorage,
  TodayOneThoughtSnapshot,
  TodayOneThoughtSourceItem,
  TodayOneThoughtStoredState,
} from "./today-one-thought-core"

export const todayOneThoughtSceneLibrary = [
  scene01Insight,
  scene02Insight,
  scene03Insight,
  scene04Insight,
  scene05Insight,
  scene06Insight,
  scene07Insight,
  scene08Insight,
  scene09Insight,
  scene10Insight,
  scene11Insight,
  scene12Insight,
  scene13Insight,
  scene14Insight,
  scene15Insight,
  scene16Insight,
  scene17Insight,
  scene18Insight,
  scene19Insight,
  scene20Insight,
  scene21Insight,
  scene22Insight,
  scene23Insight,
  scene24Insight,
  scene25Insight,
  scene26Insight,
  scene27Insight,
  scene28Insight,
  scene29Insight,
  scene30Insight,
  scene31Insight,
  scene32Insight,
  scene33Insight,
  scene34Insight,
  scene35Insight,
  scene36Insight,
] as InsightSceneFile[]

export const todayOneThoughtSourceItems = todayOneThoughtSceneLibrary.flatMap((scene) =>
  scene.items.map((item, index) => ({
    thoughtId: item.id,
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    mirrorId: scene.mirrorId,
    thief: scene.thief,
    itemId: item.id,
    tradeMoment: item.tradeMoment,
    os: item.os,
    reflection: item.reflection,
    evidence: scene.evidences[index % scene.evidences.length] ?? scene.evidences[0] ?? "",
    practice: scene.practices[index % scene.practices.length] ?? scene.practices[0] ?? "",
    coreStatement: scene.coreStatement,
    evidenceLines: scene.evidences,
    practiceLines: scene.practices,
  })),
) satisfies TodayOneThoughtSourceItem[]

function getBrowserStorage(): BrowserStorage | null {
  if (typeof window === "undefined") return null
  return window.localStorage
}

export function createTodayOneThoughtSnapshot(date = new Date()): TodayOneThoughtSnapshot {
  return createTodayOneThoughtSnapshotCore({ sourceItems: todayOneThoughtSourceItems, date })
}

export function readOrCreateTodayOneThought(
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
  excludeThoughtIds: string[] = [],
): TodayOneThoughtSnapshot {
  return readOrCreateTodayOneThoughtCore({ sourceItems: todayOneThoughtSourceItems, storage, date, excludeThoughtIds })
}

export function drawTodayOneThought(
  currentState?: TodayOneThoughtStoredState,
  options: { excludeThoughtIds?: string[]; storage?: BrowserStorage | null; date?: Date } = {},
): TodayOneThoughtSnapshot {
  return drawTodayOneThoughtCore({
    sourceItems: todayOneThoughtSourceItems,
    currentState,
    storage: options.storage ?? getBrowserStorage(),
    date: options.date ?? new Date(),
    excludeThoughtIds: options.excludeThoughtIds ?? [],
  })
}

export function confirmTodayOneThought(
  currentState?: TodayOneThoughtStoredState,
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
): TodayOneThoughtSnapshot {
  return confirmTodayOneThoughtCore({ sourceItems: todayOneThoughtSourceItems, currentState, storage, date })
}

export function changeTodayOneThought(
  currentState?: TodayOneThoughtStoredState,
  storage: BrowserStorage | null = getBrowserStorage(),
  date = new Date(),
): TodayOneThoughtSnapshot {
  return changeTodayOneThoughtCore({ sourceItems: todayOneThoughtSourceItems, currentState, storage, date })
}
