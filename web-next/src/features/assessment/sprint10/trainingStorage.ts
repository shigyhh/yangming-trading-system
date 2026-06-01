import type { AssistantSummaryPreview } from "../evidence-engine"
import type { PracticeChangeState } from "../practice-change"
import { assessmentStorageKeys, getStorage, removeStorage, setStorage } from "../storage"
import type { DailyTrainingDraftState } from "./trainingTypes"

export const trainingStorageKey = assessmentStorageKeys.sprint10TrainingState
export const dailyTrainingDraftStorageKey = assessmentStorageKeys.sprint10DailyTrainingDraft

export function loadTrainingPracticeState() {
  return getStorage<PracticeChangeState | null>(trainingStorageKey, null)
}

export function saveTrainingPracticeState(state: PracticeChangeState) {
  setStorage(trainingStorageKey, state)
}

export function saveLegacyPracticeState(state: PracticeChangeState) {
  setStorage(assessmentStorageKeys.practiceChange, state)
}

export function loadLegacyPracticeState() {
  return getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
}

export function saveAssistantSummaryPreview(summary: AssistantSummaryPreview) {
  setStorage(assessmentStorageKeys.sprint10AssistantSummary, summary)
}

export function loadDailyTrainingDraftState(trainingDay: number) {
  const draft = getStorage<DailyTrainingDraftState | null>(dailyTrainingDraftStorageKey, null)
  if (!draft || draft.trainingDay !== trainingDay) return null

  return {
    ...draft,
    holdProgress: 0,
  }
}

export function saveDailyTrainingDraftState(draft: DailyTrainingDraftState) {
  setStorage(dailyTrainingDraftStorageKey, {
    ...draft,
    holdProgress: 0,
  })
}

export function clearDailyTrainingDraftState() {
  removeStorage(dailyTrainingDraftStorageKey)
}
