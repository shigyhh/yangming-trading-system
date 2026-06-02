import { compareRiskRadarSnapshots, type PracticeChangeState } from "@/features/assessment/practice-change"
import { assistantGrowthHandoffStorageKey, buildAssistantHandoffFromGrowthProfile } from "@/features/assessment/assistant-summary"
import { assessmentStorageKeys, getStorage, setStorage } from "@/features/assessment/storage"
import type { DailyGrowthState } from "@/features/assessment/sprint10/trainingTypes"
import { loadHeartProofs } from "@/features/heart-proof/heartProofStorage"
import { loadMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import { loadTradeReviewHistory, tradeReviewLastResultStorageKey } from "@/features/trade-review/trade-review"
import type { TradeReview } from "../../../../packages/contracts/living-mirror"

import {
  ensureBehaviorLoopFromTradeReview,
  ensureBehaviorLoopsFromHeartProofs,
  loadBehaviorLoops,
  upsertBehaviorLoops,
} from "./behaviorLoopStorage"
import { buildGrowthProfile, buildLivingMirrorGrowthProfile } from "./growthProfileEngine"
import type {
  GrowthProfile,
  GrowthProfileBuildResult,
  GrowthProfileInput,
  LivingMirrorGrowthProfile,
} from "./growthProfileTypes"
import { clearRetestChangesForDev, loadRetestChanges } from "./retestChangeStorage"

export const livingMirrorGrowthProfileStorageKey = "ym_living_mirror_growth_profile_v1"
export const growthProfilesStorageKey = "ym_growth_profiles_v1"
export const growthProfileArchiveItemsStorageKey = "ym_growth_profile_archive_items_v1"
export const growthProfileScrollEventsStorageKey = "ym_growth_profile_scroll_events_v1"

export function loadGrowthProfiles() {
  return getStorage<GrowthProfile[]>(growthProfilesStorageKey, [])
}

export function getGrowthProfileForUser(userIdOrAnonymousId: string) {
  const owner = String(userIdOrAnonymousId || "").trim()
  if (!owner) return null

  return loadGrowthProfiles()
    .filter((profile) => profile.status === "active")
    .filter((profile) => profile.userId === owner || profile.anonymousId === owner)
    .sort(sortGrowthProfilesByLatest)
    .at(0) || null
}

export function getGrowthProfileById(growthProfileId: string) {
  const id = String(growthProfileId || "").trim()
  if (!id) return null

  return loadGrowthProfiles().find((profile) => (
    profile.growthProfileId === id ||
    profile.growth_profile_id === id
  )) || null
}

export function upsertGrowthProfile(growthProfile: GrowthProfile) {
  const incoming = normalizeGrowthProfile(growthProfile)
  const storedProfiles = loadGrowthProfiles()
  const existing = storedProfiles.find((profile) => (
    profile.growthProfileId === incoming.growthProfileId ||
    profile.growth_profile_id === incoming.growth_profile_id ||
    getGrowthProfileSignature(profile) === getGrowthProfileSignature(incoming)
  ))
  const merged = mergeGrowthProfile(existing, incoming)
  const profiles = [
    ...storedProfiles.filter((profile) => (
      profile.growthProfileId !== incoming.growthProfileId &&
      profile.growth_profile_id !== incoming.growth_profile_id &&
      getGrowthProfileSignature(profile) !== getGrowthProfileSignature(incoming)
    )),
    merged,
  ].sort(sortGrowthProfilesByLatest)

  setStorage(growthProfilesStorageKey, profiles)
  return merged
}

export function recomputeAndSaveGrowthProfile(input: GrowthProfileInput = {}) {
  const normalizedInput = buildGrowthProfileInputFromLocal(input)
  const buildResult = buildGrowthProfile(normalizedInput)
  const behaviorLoops = upsertBehaviorLoops(buildResult.behaviorLoops)
  const profileOwnerId = buildResult.growthProfile.userId || buildResult.growthProfile.anonymousId
  const ownerBehaviorLoops = behaviorLoops.filter((loop) => (
    loop.userId === profileOwnerId ||
    loop.anonymousId === profileOwnerId
  ))
  const ownerBehaviorLoopsForAssistant = sortBehaviorLoopsForAssistant(ownerBehaviorLoops)
  const growthProfile = upsertGrowthProfile({
    ...buildResult.growthProfile,
    behaviorLoopCount: ownerBehaviorLoops.length,
    topBehaviorLoopIds: ownerBehaviorLoopsForAssistant
      .map((loop) => loop.behaviorLoopId)
      .slice(0, 5),
    sourceSummary: {
      ...buildResult.growthProfile.sourceSummary,
      behaviorLoopCount: ownerBehaviorLoops.length,
    },
  })

  upsertGrowthProfileArchiveItems(buildResult.archiveItemsToUpsert)
  upsertGrowthProfileScrollEvents(buildResult.scrollEventsToUpsert)
  setStorage(assistantGrowthHandoffStorageKey, buildAssistantHandoffFromGrowthProfile({
    userId: growthProfile.userId,
    anonymousId: growthProfile.anonymousId,
    primaryPersona: growthProfile.primaryPersona,
    secondaryPersona: growthProfile.secondaryPersona,
    latestHeartProof: getLatestHeartProof(normalizedInput.heartProofs || []),
    growthProfile,
    behaviorLoop: ownerBehaviorLoopsForAssistant[0] || null,
    createdAt: growthProfile.updatedAt,
  }))

  return {
    ...buildResult,
    growthProfile,
    behaviorLoops,
  }
}

export function clearGrowthProfileForDev() {
  setStorage(growthProfilesStorageKey, [])
  setStorage(growthProfileArchiveItemsStorageKey, [])
  setStorage(growthProfileScrollEventsStorageKey, [])
  setStorage(livingMirrorGrowthProfileStorageKey, null)
  clearRetestChangesForDev()
}

export function loadGrowthProfileArchiveItems() {
  return getStorage<GrowthProfileBuildResult["archiveItemsToUpsert"]>(growthProfileArchiveItemsStorageKey, [])
}

export function loadGrowthProfileScrollEvents() {
  return getStorage<GrowthProfileBuildResult["scrollEventsToUpsert"]>(growthProfileScrollEventsStorageKey, [])
}

export function loadLivingMirrorGrowthProfile() {
  return getStorage<LivingMirrorGrowthProfile | null>(livingMirrorGrowthProfileStorageKey, null)
}

export function saveLivingMirrorGrowthProfile(profile: LivingMirrorGrowthProfile) {
  setStorage(livingMirrorGrowthProfileStorageKey, profile)
  return profile
}

export function buildLivingMirrorGrowthProfileFromLocal() {
  const mirrorReport = loadMirrorReport()
  const dailyGrowth = getStorage<DailyGrowthState | null>(assessmentStorageKeys.livingMirrorGrowth, null)
  const practiceChange = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
  const heartProofs = loadHeartProofs()
  const latestTradeReview = getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null)
  const latestBehaviorLoop = ensureBehaviorLoopFromTradeReview(latestTradeReview)
  const heartProofBehaviorLoops = ensureBehaviorLoopsFromHeartProofs(heartProofs)
  const behaviorLoops = dedupeBehaviorLoops([
    ...(latestBehaviorLoop ? [latestBehaviorLoop] : []),
    ...heartProofBehaviorLoops,
    ...loadBehaviorLoops(),
  ])
  const retestComparisons = compareRiskRadarSnapshots(practiceChange?.baselineReport, practiceChange?.retestReport)

  return buildLivingMirrorGrowthProfile({
    mirrorReport,
    dailyGrowth,
    practiceChange,
    heartProofs,
    tradeReviews: latestTradeReview ? [latestTradeReview] : [],
    behaviorLoops,
    retestComparisons,
  })
}

export function refreshLivingMirrorGrowthProfile() {
  const profile = saveLivingMirrorGrowthProfile(buildLivingMirrorGrowthProfileFromLocal())
  const heartProof = [...loadHeartProofs()]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .at(0)
  const behaviorLoop = loadBehaviorLoops().at(0) || null

  setStorage(assistantGrowthHandoffStorageKey, buildAssistantHandoffFromGrowthProfile({
    userId: profile.userId,
    anonymousId: profile.anonymousId,
    primaryPersona: profile.primaryPersona,
    secondaryPersona: profile.secondaryPersona,
    latestHeartProof: heartProof || null,
    growthProfile: profile,
    behaviorLoop,
    createdAt: profile.updatedAt,
  }))
  recomputeAndSaveGrowthProfile()

  return profile
}

function dedupeBehaviorLoops(loops: ReturnType<typeof loadBehaviorLoops>) {
  return Array.from(new Map(loops.map((loop) => [loop.behaviorLoopId, loop])).values())
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function buildGrowthProfileInputFromLocal(input: GrowthProfileInput): GrowthProfileInput {
  const mirrorReport = input.mirrorReport !== undefined ? input.mirrorReport : loadMirrorReport()
  const dailyGrowth = input.dailyGrowth !== undefined
    ? input.dailyGrowth
    : getStorage<DailyGrowthState | null>(assessmentStorageKeys.livingMirrorGrowth, null)
  const practiceChange = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
  const latestTradeReview = getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null)
  const retestComparisons = input.retestComparisons || compareRiskRadarSnapshots(practiceChange?.baselineReport, practiceChange?.retestReport)

  return {
    ...input,
    mirrorReport,
    mirrorReports: dedupeById([
      ...(mirrorReport ? [mirrorReport] : []),
      ...(input.mirrorReports || []),
    ], (report) => report.reportId),
    dailyGrowth,
    dailyGrowthRecords: dedupeById([
      ...(dailyGrowth ? [dailyGrowth] : []),
      ...(input.dailyGrowthRecords || []),
      ...(input.dailyPracticeRecords || []),
    ], getDailyGrowthRecordId),
    heartProofs: dedupeById([
      ...loadHeartProofs(),
      ...(input.heartProofs || []),
    ], (proof) => proof.heartProofId),
    tradeReviews: dedupeById([
      ...loadTradeReviewHistory(),
      ...(latestTradeReview ? [latestTradeReview] : []),
      ...(input.tradeReviews || []),
    ], (review) => review.reviewId || review.id),
    behaviorLoops: dedupeBehaviorLoops([
      ...loadBehaviorLoops(),
      ...(input.behaviorLoops || []),
    ]),
    retestChanges: dedupeById([
      ...loadRetestChanges(),
      ...(input.retestChanges || []),
    ], (retestChange) => retestChange.retestId),
    retestComparisons,
  }
}

function getLatestHeartProof(heartProofs: NonNullable<GrowthProfileInput["heartProofs"]>) {
  return [...heartProofs]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .at(0) || null
}

function sortBehaviorLoopsForAssistant(loops: ReturnType<typeof loadBehaviorLoops>) {
  return [...loops].sort((left, right) => (
    behaviorLoopRiskRank(right.riskLevel) - behaviorLoopRiskRank(left.riskLevel) ||
    (right.repeatCount || 1) - (left.repeatCount || 1) ||
    (right.confidence || 0) - (left.confidence || 0) ||
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  ))
}

function behaviorLoopRiskRank(riskLevel: ReturnType<typeof loadBehaviorLoops>[number]["riskLevel"]) {
  if (riskLevel === "high") return 3
  if (riskLevel === "medium") return 2
  if (riskLevel === "low") return 1
  return 0
}

function normalizeGrowthProfile(profile: GrowthProfile): GrowthProfile {
  const computedAt = profile.computedAt || profile.updatedAt || new Date().toISOString()
  const computedAtHistory = uniqueStrings([
    ...(profile.computedAtHistory || []),
    computedAt,
  ])

  return {
    ...profile,
    status: "active",
    computedAt,
    computedAtHistory,
    dailyGrowthCount: profile.dailyGrowthCount ?? profile.sourceSummary.dailyGrowthCount,
    heartProofCount: profile.heartProofCount ?? profile.sourceSummary.heartProofCount,
    tradeReviewCount: profile.tradeReviewCount ?? profile.sourceSummary.tradeReviewCount,
    behaviorLoopCount: profile.behaviorLoopCount ?? profile.sourceSummary.behaviorLoopCount,
    retestChangeCount: profile.retestChangeCount ?? profile.sourceSummary.retestChangeCount,
    topBehaviorLoopIds: profile.topBehaviorLoopIds || [],
  }
}

function mergeGrowthProfile(existing: GrowthProfile | undefined, incoming: GrowthProfile): GrowthProfile {
  if (!existing) return incoming

  const computedAtHistory = uniqueStrings([
    ...(existing.computedAtHistory || []),
    existing.computedAt,
    ...(incoming.computedAtHistory || []),
    incoming.computedAt,
  ]).sort((left, right) => new Date(left).getTime() - new Date(right).getTime())

  return {
    ...incoming,
    computedAtHistory,
  }
}

function upsertGrowthProfileArchiveItems(items: GrowthProfileBuildResult["archiveItemsToUpsert"]) {
  const storedItems = loadGrowthProfileArchiveItems()
  const itemMap = new Map(storedItems.map((item) => [item.archiveItemId, item]))

  items.forEach((item) => itemMap.set(item.archiveItemId, item))

  const nextItems = Array.from(itemMap.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  setStorage(growthProfileArchiveItemsStorageKey, nextItems)
  return nextItems
}

function upsertGrowthProfileScrollEvents(events: GrowthProfileBuildResult["scrollEventsToUpsert"]) {
  const storedEvents = loadGrowthProfileScrollEvents()
  const eventMap = new Map(storedEvents.map((event) => [event.id, event]))

  events.forEach((event) => eventMap.set(event.id, event))

  const nextEvents = Array.from(eventMap.values())
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())

  setStorage(growthProfileScrollEventsStorageKey, nextEvents)
  return nextEvents
}

function getGrowthProfileSignature(profile: GrowthProfile) {
  return [
    profile.userId || profile.anonymousId || "local-anonymous",
    profile.reportId || "no_report",
  ].join("|")
}

function sortGrowthProfilesByLatest(left: GrowthProfile, right: GrowthProfile) {
  return new Date(right.computedAt || right.updatedAt).getTime() - new Date(left.computedAt || left.updatedAt).getTime()
}

function dedupeById<T>(items: T[], getId: (item: T) => string | undefined) {
  return Array.from(new Map(
    items
      .filter(Boolean)
      .map((item, index) => [getId(item) || `item_${index}`, item]),
  ).values())
}

function getDailyGrowthRecordId(record: DailyGrowthState | NonNullable<GrowthProfileInput["dailyGrowthRecords"]>[number]) {
  return ("dailyGrowthId" in record ? record.dailyGrowthId : undefined) ||
    record.growthRecordId ||
    `daily_${record.trainingDay || "unknown"}`
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}
