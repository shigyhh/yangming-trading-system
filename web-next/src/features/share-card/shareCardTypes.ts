import type { ArchiveItem } from "@/features/mirror-archive/archiveTypes"
import type { MirrorReport } from "@/features/mirror-report/mirrorReportTypes"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"

export type ShareCardSourceType = "mirror_report" | "heart_proof" | "retest"

export type ShareCardType = "mirror_report_card" | "heart_proof_card" | "retest_change_card"

export interface ShareCard {
  id: string
  shareCardId: string
  cardType: ShareCardType
  userId?: string
  anonymousId: string
  sourceType: ShareCardSourceType
  sourceId: string
  inviteCode: string
  title: string
  subtitle: string
  quote: string
  ctaText: string
  complianceText: string
  createdAt: string
}

export interface ShareCardSource {
  cardType: ShareCardType
  sourceType: ShareCardSourceType
  sourceId: string
  userId?: string
  anonymousId: string
  label: string
  title: string
  summary: string
  quote: string
  tags: string[]
  createdAt: string
  report?: MirrorReport
  heartProof?: HeartProof
  archiveItem?: ArchiveItem
}
