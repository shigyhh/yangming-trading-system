export interface MirrorReportRiskRadar {
  impulse: number
  fear: number
  ego: number
  stopLossExecution: number
  reviewAbility: number
  systemConsistency: number
  riskControl: number
  independentJudgment: number
}

export interface MirrorReportPrescriptionItem {
  day: number
  title: string
  action: string
  completionStandard: string
}

export interface MirrorReport {
  reportId: string
  assessmentId: string
  anonymousId: string
  userId?: string
  primaryPersona: string
  secondaryPersona: string
  confidenceScore: number
  headline: string
  coreProblem: string
  highRiskScenario: string
  riskRadar: MirrorReportRiskRadar
  sevenDayPrescription: MirrorReportPrescriptionItem[]
  recommendedCamp: string
  complianceText: string
  createdAt: string
}
