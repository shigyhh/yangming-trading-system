import type { CheckinType, ThoughtType } from "./trainingTypes"

export type TrainingEventName =
  | "training_checkin_selected"
  | "training_thought_selected"
  | "training_reflection_changed"
  | "training_hold_started"
  | "training_hold_cancelled"
  | "training_day_completed"
  | "retest_locked_clicked"

export function trackTrainingEvent(
  eventName: TrainingEventName,
  payload: {
    trainingDay: number
    checkinType?: CheckinType | string | null
    thoughtType?: ThoughtType | string | null
    completedDays?: number
  },
) {
  if (process.env.NODE_ENV !== "development") return

  console.log("[training]", eventName, {
    trainingDay: payload.trainingDay,
    checkinType: payload.checkinType || "",
    thoughtType: payload.thoughtType || "",
    completedDays: payload.completedDays ?? 0,
    timestamp: new Date().toISOString(),
  })
}
