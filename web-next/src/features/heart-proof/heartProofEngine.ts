import {
  buildTrainingEvidence,
  type EvidenceEngineInput,
} from "@/features/assessment/evidence-engine"
import {
  buildTradeReviewNextActionText,
  buildTradeReviewProofText,
  getTradeReviewAffectedDimensions,
  getTradeReviewThoughtLabel,
  tradeReviewComplianceText,
  type TradeReviewThoughtType,
} from "@/features/trade-review/trade-review"

import type { HeartProof } from "./heartProofTypes"

export const heartProofComplianceText = "仅用于交易行为训练记录，不构成任何投资建议。"

export type DailyGrowthHeartProofInput = EvidenceEngineInput & {
  heartProofId: string
  anonymousId: string
  sourceType?: "daily_growth"
  sourceId: string
  reportId?: string
  trainingDay: number
  behaviorType?: string
  createdAt: string
}

export function buildDailyGrowthHeartProof(input: DailyGrowthHeartProofInput): HeartProof {
  const evidence = buildTrainingEvidence(input)
  const thoughtType = String(input.thoughtType || "fomo")

  return {
    id: input.heartProofId,
    heartProofId: input.heartProofId,
    userId: input.userId || undefined,
    anonymousId: input.anonymousId,
    sourceType: "daily_growth",
    sourceId: input.sourceId,
    reportId: input.reportId,
    trainingDay: input.trainingDay,
    thoughtType,
    thoughtLabel: input.thoughtLabel,
    behaviorType: input.behaviorType,
    reflectionText: String(input.reflectionText || "").trim(),
    affectedDimensions: evidence.affectedDimensions,
    proofText: evidence.dailySealText,
    nextActionText: evidence.nextActionText,
    complianceText: heartProofComplianceText,
    createdAt: input.createdAt,
  }
}

export type TradeReviewHeartProofInput = {
  heartProofId: string
  anonymousId: string
  sourceId: string
  reportId?: string
  thoughtType: TradeReviewThoughtType | string
  behaviorType?: string
  reflectionText: string
  nextActionText?: string
  createdAt: string
  userId?: string
}

export function buildTradeReviewHeartProof(input: TradeReviewHeartProofInput): HeartProof {
  const thoughtLabel = getTradeReviewThoughtLabel(input.thoughtType)

  return {
    id: input.heartProofId,
    heartProofId: input.heartProofId,
    userId: input.userId || undefined,
    anonymousId: input.anonymousId,
    sourceType: "trade_review",
    sourceId: input.sourceId,
    reportId: input.reportId,
    thoughtType: String(input.thoughtType || "none"),
    thoughtLabel,
    behaviorType: input.behaviorType || "trade_review",
    reflectionText: input.reflectionText.trim(),
    affectedDimensions: getTradeReviewAffectedDimensions(input.thoughtType),
    proofText: buildTradeReviewProofText(input.thoughtType),
    nextActionText: buildTradeReviewNextActionText(input.thoughtType, input.nextActionText),
    complianceText: tradeReviewComplianceText,
    createdAt: input.createdAt,
  }
}

export function formatHeartProofForCopy(heartProof: HeartProof) {
  return [
    "今日心证",
    `日期：${formatHeartProofDate(heartProof.createdAt)}`,
    `今日一念：${heartProof.thoughtLabel || heartProof.thoughtType}`,
    `今日动作：${heartProof.nextActionText}`,
    `今日省察：${heartProof.reflectionText}`,
    `今日所证：${heartProof.proofText}`,
    heartProof.complianceText,
  ].filter(Boolean).join("\n")
}

export function formatHeartProofDate(value?: string | null) {
  if (!value) return "今日"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "今日"
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
