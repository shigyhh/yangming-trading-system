"use client"

import { useEffect, useMemo, useReducer } from "react"

import {
  clearDailyTrainingDraftState,
  loadDailyTrainingDraftState,
  saveDailyTrainingDraftState,
} from "./trainingStorage"
import {
  defaultBaselineScores,
  type BaselineScores,
  type CheckinType,
  type DailyTrainingDraftState,
  type DailyTrainingState,
  type ThoughtType,
} from "./trainingTypes"

type DailyTrainingAction =
  | { type: "select_checkin"; trainingDay: number; checkinType: CheckinType }
  | { type: "select_thought"; trainingDay: number; thoughtType: ThoughtType }
  | { type: "set_reflection"; trainingDay: number; reflectionText: string }
  | { type: "set_hold_progress"; trainingDay: number; holdProgress: number }
  | { type: "reset"; trainingDay: number }

export function getProgressStep(state: DailyTrainingState): 0 | 1 | 2 | 3 {
  if (state.isCompleted) return 3
  if (state.checkinType && state.thoughtType && state.reflectionText.trim()) return 2
  if (state.checkinType && state.thoughtType) return 2
  if (state.checkinType) return 1
  return 0
}

export function canSelectThought(state: DailyTrainingState): boolean {
  return Boolean(state.checkinType) && !state.isCompleted
}

export function canWriteReflection(state: DailyTrainingState): boolean {
  return Boolean(state.checkinType && state.thoughtType) && !state.isCompleted
}

export function canHoldToComplete(state: DailyTrainingState): boolean {
  return Boolean(
    state.checkinType &&
      state.thoughtType &&
      state.reflectionText.trim().length >= 2 &&
      !state.isCompleted,
  )
}

export const canCompleteTraining = canHoldToComplete

export function getRemainingDays(completedDays: number): number {
  return Math.max(0, 7 - completedDays)
}

export function getIsRetestUnlocked(completedDays: number): boolean {
  return completedDays >= 7
}

type UseDailyTrainingInput = {
  trainingDay: number
  completedDays: number
  klineMindCount: number
  reflectionCount: number
  isCompleted: boolean
  completedAt: string | null
  baselineScores?: BaselineScores
}

export function useDailyTraining({
  trainingDay,
  completedDays,
  klineMindCount,
  reflectionCount,
  isCompleted,
  completedAt,
  baselineScores = defaultBaselineScores,
}: UseDailyTrainingInput) {
  const [draft, dispatch] = useReducer(dailyTrainingReducer, trainingDay, createInitialDraft)
  const activeDraft = draft.trainingDay === trainingDay && !isCompleted
    ? draft
    : createEmptyDraft(trainingDay)

  const state = useMemo<DailyTrainingState>(() => ({
    trainingDay,
    checkinType: activeDraft.checkinType,
    thoughtType: activeDraft.thoughtType,
    reflectionText: activeDraft.reflectionText,
    holdProgress: activeDraft.holdProgress,
    isCompleted,
    completedAt,
    completedDays,
    klineMindCount,
    reflectionCount,
    baselineScores,
  }), [
    activeDraft.checkinType,
    activeDraft.holdProgress,
    activeDraft.reflectionText,
    activeDraft.thoughtType,
    baselineScores,
    completedAt,
    completedDays,
    isCompleted,
    klineMindCount,
    reflectionCount,
    trainingDay,
  ])

  useEffect(() => {
    if (isCompleted) {
      clearDailyTrainingDraftState()
      return
    }

    saveDailyTrainingDraftState(activeDraft)
  }, [activeDraft, isCompleted])

  const progressStep = getProgressStep(state)
  const remainingDays = getRemainingDays(completedDays)
  const isRetestUnlocked = getIsRetestUnlocked(completedDays)

  return {
    state,
    progressStep,
    canSelectThought: canSelectThought(state),
    canWriteReflection: canWriteReflection(state),
    canHoldToComplete: canHoldToComplete(state),
    canCompleteTraining: canHoldToComplete(state),
    remainingDays,
    isRetestUnlocked,
    setCheckinType: (nextCheckinType: CheckinType) => {
      dispatch({ type: "select_checkin", trainingDay, checkinType: nextCheckinType })
    },
    setThoughtType: (nextThoughtType: ThoughtType) => {
      dispatch({ type: "select_thought", trainingDay, thoughtType: nextThoughtType })
    },
    setReflectionText: (nextReflectionText: string) => {
      dispatch({ type: "set_reflection", trainingDay, reflectionText: nextReflectionText })
    },
    setHoldProgress: (nextHoldProgress: number) => {
      dispatch({ type: "set_hold_progress", trainingDay, holdProgress: nextHoldProgress })
    },
    resetDraft: () => {
      clearDailyTrainingDraftState()
      dispatch({ type: "reset", trainingDay })
    },
  }
}

function dailyTrainingReducer(
  state: DailyTrainingDraftState,
  action: DailyTrainingAction,
): DailyTrainingDraftState {
  switch (action.type) {
    case "select_checkin":
      return {
        ...state,
        trainingDay: action.trainingDay,
        checkinType: action.checkinType,
        holdProgress: 0,
      }
    case "select_thought":
      return {
        ...state,
        trainingDay: action.trainingDay,
        thoughtType: action.thoughtType,
        holdProgress: 0,
      }
    case "set_reflection":
      return {
        ...state,
        trainingDay: action.trainingDay,
        reflectionText: action.reflectionText,
        holdProgress: 0,
      }
    case "set_hold_progress":
      return {
        ...state,
        trainingDay: action.trainingDay,
        holdProgress: clampProgress(action.holdProgress),
      }
    case "reset":
      return createEmptyDraft(action.trainingDay)
    default:
      return state
  }
}

function createInitialDraft(trainingDay: number): DailyTrainingDraftState {
  return loadDailyTrainingDraftState(trainingDay) ?? createEmptyDraft(trainingDay)
}

function createEmptyDraft(trainingDay: number): DailyTrainingDraftState {
  return {
    trainingDay,
    checkinType: null,
    thoughtType: null,
    reflectionText: "",
    holdProgress: 0,
  }
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}
