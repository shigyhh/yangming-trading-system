export type PersonalityTag =
  | "fomo_chaser"
  | "panic_runner"
  | "hold_and_hope"
  | "prove_self"
  | "revenge_rescuer"
  | "hesitant_watcher"
  | "over_control"
  | "numb_repeat"
  | "disciplined_observer"

export type PersonalityTypeProfile = {
  key: PersonalityTag
  label: string
  poeticName: string
  summary: string
  risk: string
  training: string
  score: number
}

export type UnifiedPersonalityProfile = {
  type: PersonalityTag
  label: string
  poeticName: string
  summary: string
  score: number
}

export type UnifiedRiskRadarItem = {
  key: string
  label: string
  value: number
  description?: string
}

export type UnifiedEmotionalTrigger = {
  key: string
  label: string
  description: string
  firstThought?: string
}

export type UnifiedTrainingPrescription = {
  day: number
  theme: string
  action: string
  reflectionPrompt: string
}

export type UnifiedCampSuggestion = {
  name: string
  reason: string
  focus: string
}

export type UnifiedAssessmentReport = {
  schemaVersion: "assessment_report_v1"
  reportId: string
  userId: string
  createdAt: string
  conclusion: string
  primaryPersonality: UnifiedPersonalityProfile
  secondaryPersonality: UnifiedPersonalityProfile
  riskRadar: UnifiedRiskRadarItem[]
  emotionalTriggers: UnifiedEmotionalTrigger[]
  trainingPrescription7Days: UnifiedTrainingPrescription[]
  campSuggestion: UnifiedCampSuggestion
  complianceNotice: "本报告用于交易心理觉察，不构成投资建议"
  metadata: {
    source: string
    assessmentVersion: string
    scoringVersion: string
    contentVersion: string
  }
  totalQuestions: number
  answeredCount: number
  primaryType: PersonalityTypeProfile
  secondaryType: PersonalityTypeProfile
  scores: Record<PersonalityTag, number>
  firstThought: string
  firstThoughtDisplay: string
  trainingDirection: string
  disclaimer: string
}

export type PersonalityQuestion = {
  id: string
  options: Array<{
    id: string
    tags: PersonalityTag[]
    weight: number
  }>
}

export type PersonalityAnswer = {
  questionId: string
  optionId: string
}

export type PersonalityMirrorSignal = {
  id?: string
  name?: string
  behavior?: string
  thought?: string
  verdict?: string
  training?: string
  assessmentTag?: PersonalityTag
}

export const ASSESSMENT_REPORT_SCHEMA_VERSION: "assessment_report_v1"
export const COMPLIANCE_NOTICE: "本报告用于交易心理觉察，不构成投资建议"

export function createEmptyPersonalityScores(): Record<PersonalityTag, number>
export function getPersonalityLabel(key: PersonalityTag | string): string
export function buildRiskRadar(scores: Partial<Record<PersonalityTag, number>>): UnifiedRiskRadarItem[]
export function buildTrainingPrescription7Days(primaryKey: PersonalityTag | string, mirrorSignal?: PersonalityMirrorSignal | null): UnifiedTrainingPrescription[]
export function buildCampSuggestion(primaryKey: PersonalityTag | string): UnifiedCampSuggestion
export function buildAssessmentReport(input?: {
  answers?: PersonalityAnswer[]
  questions?: PersonalityQuestion[]
  mirrorSignal?: PersonalityMirrorSignal | null
  source?: string
  reportId?: string
  userId?: string
  now?: Date | string
}): UnifiedAssessmentReport
