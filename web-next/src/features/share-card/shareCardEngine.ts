import { loadHeartProofs } from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { loadMirrorArchiveData } from "@/features/mirror-archive/archiveEngine"
import type { ArchiveItem } from "@/features/mirror-archive/archiveTypes"
import { loadMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import type { MirrorReport } from "@/features/mirror-report/mirrorReportTypes"

import type { ShareCard, ShareCardSource, ShareCardSourceType } from "./shareCardTypes"

export const shareCardComplianceText = "本内容仅用于交易心理训练，不构成投资建议"
export const shareCardCtaText = "测一测你的交易心镜"
export const shareCardTitle = "市场照见人心"
export const defaultShareInviteCode = "YMLOCAL"

const sourceLabelMap: Record<ShareCardSourceType, string> = {
  mirror_report: "心镜报告卡",
  heart_proof: "今日心证卡",
  retest: "七日变化卡",
}

const subtitleMap: Record<ShareCardSourceType, string> = {
  mirror_report: "我的心镜报告",
  heart_proof: "我的今日心证",
  retest: "我的七日变化",
}

export function loadShareCardSources({ includePreview = false }: { includePreview?: boolean } = {}) {
  const report = loadMirrorReport()
  const heartProofs = loadHeartProofs()
  const archive = loadMirrorArchiveData()
  const sources = [
    ...(report ? [toMirrorReportSource(report)] : []),
    ...heartProofs.map(toHeartProofSource),
    ...archive.sections.retests.map(toRetestSource),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  if (sources.length || !includePreview) return sources

  return [buildPreviewShareCardSource()]
}

export function buildShareCard(source: ShareCardSource, inviteCode: string, createdAt = new Date().toISOString()): ShareCard {
  const normalizedInviteCode = normalizeInviteCode(inviteCode)
  const shareCardId = makeShareCardId(source, createdAt)

  return {
    id: shareCardId,
    shareCardId,
    cardType: source.cardType,
    userId: source.userId,
    anonymousId: source.anonymousId,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    inviteCode: normalizedInviteCode,
    title: shareCardTitle,
    subtitle: subtitleMap[source.sourceType],
    quote: cleanShareQuote(source.quote),
    ctaText: shareCardCtaText,
    complianceText: shareCardComplianceText,
    createdAt,
  }
}

export function formatShareCardCopy(card: ShareCard) {
  return [
    card.title,
    card.subtitle,
    "",
    card.quote,
    "",
    card.ctaText,
    `邀请码：${card.inviteCode}`,
    "",
    card.complianceText,
  ].join("\n")
}

export function normalizeInviteCode(value?: string) {
  const compact = (value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()

  if (!compact) return defaultShareInviteCode
  if (compact.startsWith("YM")) return compact.slice(0, 12)

  return `YM${compact.slice(0, 8) || "LOCAL"}`
}

export function getShareCardSourceLabel(sourceType: ShareCardSourceType) {
  return sourceLabelMap[sourceType]
}

function toMirrorReportSource(report: MirrorReport): ShareCardSource {
  return {
    cardType: "mirror_report_card",
    sourceType: "mirror_report",
    sourceId: report.reportId,
    userId: report.userId,
    anonymousId: report.anonymousId,
    label: sourceLabelMap.mirror_report,
    title: "心镜报告",
    summary: report.headline,
    quote: `我照见的是：${report.headline}\n\n${report.coreProblem}`,
    tags: [report.primaryPersona, report.secondaryPersona, "心镜报告"].filter(Boolean),
    createdAt: report.createdAt,
    report,
  }
}

function toHeartProofSource(heartProof: HeartProof): ShareCardSource {
  return {
    cardType: "heart_proof_card",
    sourceType: "heart_proof",
    sourceId: heartProof.heartProofId,
    userId: heartProof.userId,
    anonymousId: heartProof.anonymousId,
    label: sourceLabelMap.heart_proof,
    title: heartProof.sourceType === "trade_review" ? "复盘心证" : "今日心证",
    summary: heartProof.proofText,
    quote: `我照见的是：${heartProof.thoughtLabel || heartProof.thoughtType}\n\n${heartProof.proofText}`,
    tags: [heartProof.thoughtLabel || heartProof.thoughtType, ...heartProof.affectedDimensions].filter(Boolean).slice(0, 5),
    createdAt: heartProof.createdAt,
    heartProof,
  }
}

function toRetestSource(item: ArchiveItem): ShareCardSource {
  return {
    cardType: "retest_change_card",
    sourceType: "retest",
    sourceId: item.sourceId,
    userId: item.userId,
    anonymousId: item.anonymousId,
    label: sourceLabelMap.retest,
    title: item.title,
    summary: item.summary,
    quote: `七日之后，我把变化重新照回心镜。\n\n${item.summary}`,
    tags: item.tags,
    createdAt: item.createdAt,
    archiveItem: item,
  }
}

function buildPreviewShareCardSource(): ShareCardSource {
  return {
    cardType: "heart_proof_card",
    sourceType: "heart_proof",
    sourceId: "preview-heart-proof",
    anonymousId: "preview-anonymous",
    label: sourceLabelMap.heart_proof,
    title: "今日心证",
    summary: "真正的变化，不是今天就不冲动了，而是我已经能在冲动前看见它。",
    quote: "我照见的是：怕错过\n\n真正的变化，不是今天就不冲动了，而是我已经能在冲动前看见它。",
    tags: ["怕错过", "今日心证", "追涨冲动"],
    createdAt: new Date().toISOString(),
  }
}

function makeShareCardId(source: ShareCardSource, createdAt: string) {
  const timestamp = new Date(createdAt).getTime()
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

  return `share_card_${source.sourceType}_${timestamp}_${randomPart}`
}

function cleanShareQuote(value: string) {
  const unsafeTerms = [
    `推荐${"买入"}`,
    `推荐${"卖出"}`,
    `保证${"收益"}`,
    `收益${"保证"}`,
    `稳${"赚"}`,
    `必${"赚"}`,
    `抄${"底"}`,
    `逃${"顶"}`,
    `带${"单"}`,
    `喊${"单"}`,
    `预测${"行情"}`,
  ]

  const unsafePattern = new RegExp(unsafeTerms.join("|"), "g")

  return value
    .replace(unsafePattern, "照见训练")
    .trim()
}
