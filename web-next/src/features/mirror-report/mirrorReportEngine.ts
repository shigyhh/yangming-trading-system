import type { AssessmentReport } from "@/features/assessment/report"

import type { MirrorReport, MirrorReportRiskRadar } from "./mirrorReportTypes"

const headlineByPersona: Record<string, string> = {
  fomo_chaser: "你不是没有系统，而是急拉升时怕错过会先接管你。",
  panic_runner: "你不是胆小，而是亏损后的记忆让你不敢执行下一笔正确交易。",
  hold_and_hope: "你不是不会止损，而是不甘心在替你扛单。",
  prove_self: "你不是想赢过市场，而是想证明自己没有错。",
  revenge_rescuer: "你不是缺机会，而是不甘心会把下一次动作推快。",
  hesitant_watcher: "你不是没有判断力，而是群消息会临时夺走你的主心。",
  over_control: "你不是不敢行动，而是想等到完全确定才允许自己行动。",
  numb_repeat: "你不是没有觉察，而是复盘缺席让同一种反应反复出现。",
  disciplined_observer: "你不是没有波动，而是已经能更早看见念头。",
}

const scenarioByPersona: Record<string, string> = {
  fomo_chaser: "价格突然拉升，群里情绪升温，你的第一念是再不上就来不及，于是计划之前先被念头推着走。",
  panic_runner: "波动放大后，你先被亏损记忆牵动，真正需要训练的是在恐惧出现时仍能回看原计划。",
  hold_and_hope: "条件已经失效，但不甘心开始替你解释，于是边界一再后移，复盘也被拖到更晚。",
  prove_self: "临场动作变成证明自己，真正的风险不是一次判断，而是心里必须赢回一句评价。",
  revenge_rescuer: "上一笔的不甘还没有被看见，下一次动作就已经被推上去，复盘被情绪抢先。",
  hesitant_watcher: "外部声音越多，主心越容易暂时离位；真正要练的是先写下自己的判断。",
  over_control: "你不断寻找更多确认，表面是谨慎，里面是怕失控；训练重点是把条件写清楚。",
  numb_repeat: "同一种偏离反复出现时，不是缺少方法，而是缺少一次如实命名。",
  disciplined_observer: "你已经具备较好的观察基础，下一步是让每一次心证都能沉淀为可复盘证据。",
}

export const mirrorReportStorageKey = "ym_mirror_report_v1"
export const mirrorReportComplianceText = "本报告用于交易心理觉察与训练，不构成投资建议"

export function buildMirrorReport({
  report,
  anonymousId,
}: {
  report: AssessmentReport
  anonymousId: string
}): MirrorReport {
  const riskRadar = buildMirrorReportRiskRadar(report)
  const primaryKey = report.primaryType.key

  return {
    reportId: report.reportId || createLocalReportId(report.createdAt),
    assessmentId: buildAssessmentId(report),
    anonymousId,
    userId: report.userId || undefined,
    primaryPersona: report.primaryType.label,
    secondaryPersona: report.secondaryType.label,
    confidenceScore: buildConfidenceScore(report),
    headline: headlineByPersona[primaryKey] || report.conclusion,
    coreProblem: report.primaryType.risk || report.conclusion,
    highRiskScenario: buildHighRiskScenario(report),
    riskRadar,
    sevenDayPrescription: buildSevenDayPrescription(report),
    recommendedCamp: report.campSuggestion.name,
    complianceText: mirrorReportComplianceText,
    createdAt: report.createdAt || new Date().toISOString(),
  }
}

function buildAssessmentId(report: AssessmentReport) {
  const version = report.metadata?.assessmentVersion || "local_assessment"
  const created = report.createdAt ? report.createdAt.replace(/\D/g, "").slice(0, 14) : "local"
  return `${version}_${created}`
}

function buildConfidenceScore(report: AssessmentReport) {
  const primaryScore = report.primaryPersonality?.score ?? (report.primaryType.score || 0) * 20
  const secondaryScore = report.secondaryPersonality?.score ?? (report.secondaryType.score || 0) * 20
  const spread = Math.max(0, primaryScore - secondaryScore)
  return clampRisk(Math.max(62, Math.min(96, primaryScore * 0.72 + spread * 0.28)))
}

function buildMirrorReportRiskRadar(report: AssessmentReport): MirrorReportRiskRadar {
  const riskValue = (key: string) => report.riskRadar.find((item) => item.key === key)?.value ?? 0
  const impulse = riskValue("impulse")
  const fear = riskValue("panic")
  const holding = riskValue("holding")
  const ego = riskValue("proving")
  const hesitation = riskValue("hesitation")
  const review = riskValue("review")

  return {
    impulse: clampRisk(impulse),
    fear: clampRisk(fear),
    ego: clampRisk(ego),
    stopLossExecution: clampRisk(holding),
    reviewAbility: clampRisk(review),
    systemConsistency: clampRisk((impulse + hesitation) / 2),
    riskControl: clampRisk((holding + fear) / 2),
    independentJudgment: clampRisk((ego + hesitation) / 2),
  }
}

function buildSevenDayPrescription(report: AssessmentReport) {
  return report.trainingPrescription7Days.map((item) => ({
    day: item.day,
    title: item.theme,
    action: item.action,
    completionStandard: item.reflectionPrompt || "完成一次照见、一条动作和一句复盘。",
  }))
}

function buildHighRiskScenario(report: AssessmentReport) {
  if (report.sourceMirror?.behavior || report.sourceMirror?.thought) {
    return [
      report.sourceMirror.behavior ? `行为：${report.sourceMirror.behavior}` : "",
      report.sourceMirror.thought ? `念头：${report.sourceMirror.thought}` : "",
      report.sourceMirror.verdict ? `照见：${report.sourceMirror.verdict}` : "",
    ].filter(Boolean).join(" / ")
  }

  return scenarioByPersona[report.primaryType.key] || report.emotionalTriggers[0]?.description || report.conclusion
}

function createLocalReportId(value?: string) {
  const stamp = (value || new Date().toISOString()).replace(/\D/g, "").slice(0, 14)
  return `MIRROR-${stamp}`
}

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}
