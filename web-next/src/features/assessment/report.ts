import { getBehaviorMirrorSignal, type BehaviorMirrorId } from "./behavior-mirrors"
import { assessmentQuestions, type AssessmentQuestion, type AssessmentTag } from "./questions"

import {
  buildAssessmentReport,
  getPersonalityLabel,
  type PersonalityMirrorSignal,
  type PersonalityTypeProfile,
  type UnifiedAssessmentReport,
} from "../../../../packages/personality/index.js"

export type AssessmentAnswer = {
  questionId: string
  optionId: string
}

export type AssessmentTypeProfile = PersonalityTypeProfile & {
  key: AssessmentTag
}

export type AssessmentReport = UnifiedAssessmentReport & {
  sourceMirror?: {
    id: BehaviorMirrorId
    name: string
    behavior: string
    thought: string
    thief: string[]
    verdict: string
  }
  primaryType: AssessmentTypeProfile
  secondaryType: AssessmentTypeProfile
  scores: Record<AssessmentTag, number>
}

export function getAssessmentTypeLabel(key: AssessmentTag | string) {
  return getPersonalityLabel(key)
}

function getSourceMirror(mirrorId?: string | null) {
  const signal = getBehaviorMirrorSignal(mirrorId)
  if (!signal) return null

  return {
    id: signal.id,
    name: signal.name,
    behavior: signal.behavior,
    thought: signal.thought,
    thief: signal.thief,
    verdict: signal.verdict,
  }
}

function getMirrorSignal(mirrorId?: string | null): PersonalityMirrorSignal | null {
  const signal = getBehaviorMirrorSignal(mirrorId)
  if (!signal) return null

  return {
    id: signal.id,
    name: signal.name,
    behavior: signal.behavior,
    thought: signal.thought,
    verdict: signal.verdict,
    training: signal.training,
    assessmentTag: signal.assessmentTag,
  }
}

export function generateAssessmentReport(
  answers: AssessmentAnswer[],
  questions: AssessmentQuestion[] = assessmentQuestions,
  sourceMirrorId?: string | null,
): AssessmentReport {
  const report = buildAssessmentReport({
    answers,
    questions,
    mirrorSignal: getMirrorSignal(sourceMirrorId),
    source: "web-next",
  }) as AssessmentReport

  return {
    ...report,
    sourceMirror: getSourceMirror(sourceMirrorId) ?? undefined,
  }
}

export function generateMirrorReport(mirrorId: string): AssessmentReport {
  return generateAssessmentReport([], [], mirrorId)
}
