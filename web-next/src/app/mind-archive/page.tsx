"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import DangAnGuanArchive from "@/components/archive/DangAnGuanArchive"
import { ReturnHomeLink } from "@/components/navigation/ReturnHomeLink"
import { AssessmentShell } from "@/features/assessment/components"
import { getHeartThiefProfile, type HeartThiefProfile } from "@/lib/mind-archive/heartThiefProfileService"
import {
  getMindArchiveStats,
  getRecentSealedThoughtEvents,
} from "@/lib/mind-archive/archiveStatsService"
import { buildReviewArchive, type ReviewArchiveResult } from "@/lib/mind-archive/reviewArchiveService"
import { listRecentTradeReviews } from "@/lib/trade-review/tradeReviewRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ArchiveStats,
  type OneThoughtEvent,
} from "@/lib/mind-archive/types"

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MindArchivePage() {
  const router = useRouter()
  const [stats, setStats] = useState<ArchiveStats | null>(null)
  const [recentSealedEvents, setRecentSealedEvents] = useState<OneThoughtEvent[]>([])
  const [reviewArchive, setReviewArchive] = useState<ReviewArchiveResult | null>(null)
  const [heartThiefProfile, setHeartThiefProfile] = useState<HeartThiefProfile | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const sealedEvents = getRecentSealedThoughtEvents(DEFAULT_MIND_ARCHIVE_USER_ID, 50)
      const recentReviews = listRecentTradeReviews(DEFAULT_MIND_ARCHIVE_USER_ID, 20)
      const nextReviewArchive = buildReviewArchive({
        tradeReviews: recentReviews,
        oneThoughtEvents: sealedEvents,
        recentDays: 30,
      })

      setStats(getMindArchiveStats(DEFAULT_MIND_ARCHIVE_USER_ID))
      setRecentSealedEvents(sealedEvents)
      setReviewArchive(nextReviewArchive)
      setHeartThiefProfile(getHeartThiefProfile(DEFAULT_MIND_ARCHIVE_USER_ID))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const pendingReviewEvents = stats ? stats.pendingReviewEvents : []
  const recurringThoughts = stats ? stats.recurringThoughts : []
  const recentArchiveEvents = recentSealedEvents.slice(0, 5)
  const reviewArchiveItems = reviewArchive?.reviewArchiveItems ?? []

  function openMindArchive() {
    document.getElementById("one-thought-ledger")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function openTradeReview(oneThoughtEventId?: string) {
    if (oneThoughtEventId) {
      router.push(`/trade-review?linkedOneThoughtEventId=${encodeURIComponent(oneThoughtEventId)}`)
      return
    }

    router.push("/trade-review")
  }

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <ReturnHomeLink />
      <DangAnGuanArchive
        summary={{
          todaySealedCount: stats?.todayTotal ?? 0,
          seenCount: stats?.todaySeen ?? 0,
          stoppedCount: stats?.todayStopped ?? 0,
          stillMovingCount: stats?.todayStillMoving ?? 0,
          pendingReviewCount: stats?.pendingReviewCount ?? 0,
          stopRate: stats?.stopRate ?? 0,
        }}
        strongestHeartThief={{
          name: heartThiefProfile?.dominantHeartThief || "待显影",
          riskLabel: heartThiefProfile?.riskLabel || "先照一念，档案才会说话。",
        }}
        recentEntries={recentArchiveEvents.map((event) => ({
          id: event.id,
          time: formatTime(event.createdAt),
          tradeMoment: event.tradeMoment,
          os: event.os,
          reflectionFinal: event.reflectionFinal,
          heartThief: event.heartThief,
          userReaction: event.userReaction,
          actualAction: event.actualAction,
          reviewStatus: event.reviewStatus,
        }))}
        recurringThoughts={recurringThoughts.map((item) => ({
          key: item.key,
          os: item.os,
          count: item.count,
          lastSeenAt: formatTime(item.lastSeenAt),
        }))}
        completedReviewCount={reviewArchiveItems.length}
        reviewArchiveItems={reviewArchiveItems}
        reviewArchiveStats={reviewArchive?.reviewArchiveStats}
        reviewRiskSignals={reviewArchive?.reviewRiskSignals ?? []}
        onOpenMindArchive={openMindArchive}
        onOpenHeartMirrorScroll={() => router.push("/mind-scroll")}
        onOpenZhixingScroll={() => router.push("/zhixing-scroll")}
        onOpenTradeReview={() => openTradeReview(pendingReviewEvents[0]?.id)}
        onContinueRitual={() => router.push("/assessment-entry")}
      />
    </AssessmentShell>
  )
}
