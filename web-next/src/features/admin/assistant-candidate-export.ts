import type { AssistantCandidateDryRunItem, AssistantCandidateDryRunResult } from "./assistant-candidate-dry-run"

const csvHeaders = [
  "userId",
  "phoneMasked",
  "priority",
  "assistantStatus",
  "focus",
  "reasonText",
  "suggestedNextStep",
  "candidateReasonCodes",
] as const

type ExportCandidate = Pick<
  AssistantCandidateDryRunItem,
  | "userId"
  | "phoneMasked"
  | "priority"
  | "assistantStatus"
  | "focus"
  | "reasonText"
  | "suggestedNextStep"
  | "candidateReasonCodes"
>

export function exportAssistantCandidatesAsJson(result: AssistantCandidateDryRunResult) {
  return JSON.stringify(
    {
      generatedAt: result.generatedAt,
      totalCandidates: result.totalCandidates,
      dryRun: true,
      candidates: result.candidates.map(toExportCandidate),
      complianceText: result.complianceText,
    },
    null,
    2,
  )
}

export function exportAssistantCandidatesAsCsv(result: AssistantCandidateDryRunResult) {
  const rows = result.candidates.map((candidate) => {
    const item = toExportCandidate(candidate)
    return csvHeaders.map((header) => csvEscape(formatCsvValue(item[header]))).join(",")
  })

  return [csvHeaders.join(","), ...rows].join("\n")
}

function toExportCandidate(candidate: AssistantCandidateDryRunItem): ExportCandidate {
  return {
    userId: candidate.userId,
    phoneMasked: candidate.phoneMasked,
    priority: candidate.priority,
    assistantStatus: candidate.assistantStatus,
    focus: candidate.focus,
    reasonText: candidate.reasonText,
    suggestedNextStep: candidate.suggestedNextStep,
    candidateReasonCodes: candidate.candidateReasonCodes,
  }
}

function formatCsvValue(value: string | string[]) {
  return Array.isArray(value) ? value.join(" / ") : value
}

function csvEscape(value: string) {
  if (!/[",\n\r]/.test(value)) return value
  return `"${value.replace(/"/g, "\"\"")}"`
}
