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
  practiceChange: "ym_practice_change",
  sprint10TrainingState: "ym_sprint10_training_state_v1",
  sprint10DailyTrainingDraft: "ym_sprint10_daily_training_state_v1",
  sprint10AssistantSummary: "ym_sprint10_assistant_summary_v1",
  selectedMirrorId: "ym_selected_behavior_mirror",
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
  removeStorage(assessmentStorageKeys.practiceChange)
  removeStorage(assessmentStorageKeys.sprint10TrainingState)
  removeStorage(assessmentStorageKeys.sprint10DailyTrainingDraft)
  removeStorage(assessmentStorageKeys.sprint10AssistantSummary)
  removeStorage(assessmentStorageKeys.selectedMirrorId)
}

export function clearAssessmentDraft() {
  removeStorage(assessmentStorageKeys.answers)
  removeStorage(assessmentStorageKeys.currentIndex)
  removeStorage(assessmentStorageKeys.questionOrder)
  removeStorage(assessmentStorageKeys.selectedMirrorId)
}
