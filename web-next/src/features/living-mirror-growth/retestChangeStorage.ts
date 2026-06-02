import type { PracticeRadarComparison } from "@/features/assessment/practice-change"
import { getStorage, setStorage } from "@/features/assessment/storage"

import type { RetestChange, RetestDimensionChange } from "./growthProfileTypes"

export const retestChangesStorageKey = "ym_retest_changes_v1"

export function loadRetestChanges() {
  return getStorage<RetestChange[]>(retestChangesStorageKey, [])
}

export function upsertRetestChange(retestChange: RetestChange) {
  const retestMap = new Map(loadRetestChanges().map((item) => [item.retestId, item]))
  retestMap.set(retestChange.retestId, retestChange)

  const nextChanges = Array.from(retestMap.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  setStorage(retestChangesStorageKey, nextChanges)
  return retestChange
}

export function clearRetestChangesForDev() {
  setStorage(retestChangesStorageKey, [])
}

export function buildRetestChangeFromComparisons(
  comparisons: PracticeRadarComparison[],
  options: {
    retestId?: string
    userId?: string
    anonymousId?: string
    reportId?: string
    createdAt?: string
    trainingEvidenceSummary?: string
  } = {},
): RetestChange {
  const createdAt = options.createdAt || new Date().toISOString()
  const dimensionChanges: RetestDimensionChange[] = comparisons.map((item) => ({
    key: item.key,
    label: item.label,
    before: item.before,
    after: item.after,
    delta: item.delta,
    direction: getRetestDirection(item.key, item.label, item.delta),
  }))

  return {
    retestId: options.retestId || `retest_${hashText(comparisons.map((item) => `${item.key}:${item.delta}`).join("|"))}`,
    userId: options.userId,
    anonymousId: options.anonymousId,
    reportId: options.reportId,
    baselineScores: Object.fromEntries(comparisons.map((item) => [item.key, item.before])),
    currentScores: Object.fromEntries(comparisons.map((item) => [item.key, item.after])),
    deltaScores: Object.fromEntries(comparisons.map((item) => [item.key, item.delta])),
    dimensionChanges,
    improvedDimensions: dimensionChanges.filter((item) => item.direction === "improved").map((item) => item.label),
    declinedDimensions: dimensionChanges.filter((item) => item.direction === "declined").map((item) => item.label),
    trainingEvidenceSummary: options.trainingEvidenceSummary,
    createdAt,
  }
}

function getRetestDirection(key: string, label: string, delta: number): RetestDimensionChange["direction"] {
  if (delta === 0) return "flat"
  const higherBetter = /zhixing|knowing|execution|review|consistency|control|judgment|知行|止损执行|复盘|一致性|风险边界|独立判断/.test(`${key} ${label}`)
  if (higherBetter) return delta > 0 ? "improved" : "declined"
  return delta < 0 ? "improved" : "declined"
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}
