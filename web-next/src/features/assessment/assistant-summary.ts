import {
  buildAssistantSummaryPreview,
  type AssistantSummaryPreview,
  type EvidenceEngineInput,
} from "./evidence-engine"

export type AssistantSummary = AssistantSummaryPreview

export const assistantSummaryApiPath = "/api/assistant/summary"

export function buildAssistantSummary(input: EvidenceEngineInput): AssistantSummary {
  return buildAssistantSummaryPreview({
    ...input,
    userId: input.userId || "",
  })
}

export function logAssistantSummaryInDevelopment(assistantSummary: AssistantSummary) {
  if (process.env.NODE_ENV !== "development") return
  console.log("[assistantSummary]", assistantSummary)
}

export async function postAssistantSummaryLater(assistantSummary: AssistantSummary) {
  void assistantSummary

  return {
    ok: false as const,
    skipped: true as const,
    endpoint: assistantSummaryApiPath,
    reason: "assistant summary API is reserved for a later sprint",
  }
}
