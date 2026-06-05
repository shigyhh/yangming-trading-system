export const assessmentStorageKeys = {
  userPhone: "ym_user_phone",
  phoneTail: "ym_user_phone_tail",
  userNickname: "ym_user_nickname",
  userCreatedAt: "ym_assessment_user_created_at",
  answers: "ym_assessment_answers",
  currentIndex: "ym_assessment_current_index",
  questionOrder: "ym_assessment_question_order",
  report: "ym_assessment_report",
  reportCreatedAt: "ym_assessment_report_created_at",
  mirrorReport: "ym_mirror_report_v1",
  practiceChange: "ym_practice_change",
  livingMirrorGrowth: "ym_living_mirror_growth_v1",
  livingMirrorGrowthProfile: "ym_living_mirror_growth_profile_v1",
  sprint10TrainingState: "ym_sprint10_training_state_v1",
  sprint10DailyTrainingDraft: "ym_sprint10_daily_training_state_v1",
  sprint10AssistantSummary: "ym_sprint10_assistant_summary_v1",
  heartProofs: "ym_heart_proofs_v1",
  latestHeartProof: "ym_latest_heart_proof_v1",
  shareCards: "ym_share_cards_v1",
  latestShareCard: "ym_latest_share_card_v1",
  tradeReviewDraft: "ym_trade_review_draft_v1",
  tradeReviewLastResult: "ym_trade_review_last_result_v1",
  tradeReviewHistory: "ym_trade_review_history_v1",
  selectedMirrorId: "ym_selected_behavior_mirror",
  skipEntryOpeningRitualOnce: "ym_skip_entry_opening_ritual_once",
  assessmentGatewayOnce: "ym_assessment_gateway_once",
  dataBindingUserId: "ym_data_binding_user_id",
  dataBindingLastSyncAt: "ym_data_binding_last_sync_at",
} as const

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  const rawValue = window.localStorage.getItem(key)
  if (!rawValue) return fallback

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return rawValue as T
  }
}

export function setStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(key)
}

export function getSavedPhoneTail() {
  return getStorage<string>(assessmentStorageKeys.phoneTail, "")
}

export function getSavedNickname() {
  return getStorage<string>(assessmentStorageKeys.userNickname, "")
}

export function hasSavedPhone() {
  return Boolean(
    getStorage<string>(assessmentStorageKeys.userPhone, "") ||
    getStorage<string>(assessmentStorageKeys.phoneTail, ""),
  )
}

export function clearAssessmentProgress() {
  removeStorage(assessmentStorageKeys.answers)
  removeStorage(assessmentStorageKeys.currentIndex)
  removeStorage(assessmentStorageKeys.questionOrder)
  removeStorage(assessmentStorageKeys.report)
  removeStorage(assessmentStorageKeys.reportCreatedAt)
  removeStorage(assessmentStorageKeys.mirrorReport)
  removeStorage(assessmentStorageKeys.practiceChange)
  removeStorage(assessmentStorageKeys.livingMirrorGrowth)
  removeStorage(assessmentStorageKeys.livingMirrorGrowthProfile)
  removeStorage(assessmentStorageKeys.sprint10TrainingState)
  removeStorage(assessmentStorageKeys.sprint10DailyTrainingDraft)
  removeStorage(assessmentStorageKeys.sprint10AssistantSummary)
  removeStorage(assessmentStorageKeys.heartProofs)
  removeStorage(assessmentStorageKeys.latestHeartProof)
  removeStorage(assessmentStorageKeys.shareCards)
  removeStorage(assessmentStorageKeys.latestShareCard)
  removeStorage(assessmentStorageKeys.tradeReviewDraft)
  removeStorage(assessmentStorageKeys.tradeReviewLastResult)
  removeStorage(assessmentStorageKeys.tradeReviewHistory)
  removeStorage(assessmentStorageKeys.selectedMirrorId)
}

export function clearAssessmentDraft() {
  removeStorage(assessmentStorageKeys.answers)
  removeStorage(assessmentStorageKeys.currentIndex)
  removeStorage(assessmentStorageKeys.questionOrder)
  removeStorage(assessmentStorageKeys.selectedMirrorId)
}

export function markSkipEntryOpeningRitualOnce() {
  setStorage(assessmentStorageKeys.skipEntryOpeningRitualOnce, true)
}

export function consumeSkipEntryOpeningRitualOnce() {
  const shouldSkip = getStorage<boolean>(assessmentStorageKeys.skipEntryOpeningRitualOnce, false)
  removeStorage(assessmentStorageKeys.skipEntryOpeningRitualOnce)
  return shouldSkip
}

export function markAssessmentGatewayOnce() {
  setStorage(assessmentStorageKeys.assessmentGatewayOnce, true)
}

export function consumeAssessmentGatewayOnce() {
  const shouldEnterGateway = getStorage<boolean>(assessmentStorageKeys.assessmentGatewayOnce, false)
  removeStorage(assessmentStorageKeys.assessmentGatewayOnce)
  return shouldEnterGateway
}
