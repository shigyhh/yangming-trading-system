import { generateMirrorReport, type AssessmentReport } from "./report"

export function buildPreviewAssessmentReport(): AssessmentReport {
  const report = generateMirrorReport("chasing")

  return {
    ...report,
    userId: report.userId || "preview-user",
    metadata: {
      ...report.metadata,
      source: "web-next-preview",
    },
  }
}
