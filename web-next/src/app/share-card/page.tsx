"use client"

import { useEffect, useMemo, useState } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import {
  fetchShareCardBinding,
  generateShareCardBinding,
  getDataBindingUserProfile,
} from "@/features/data-binding/api-client"
import type { DataBindingShareCard } from "../../../../packages/contracts/data-binding"

type LocalShareCard = Pick<
  DataBindingShareCard,
  | "title"
  | "subtitle"
  | "conclusion"
  | "primaryType"
  | "secondaryType"
  | "riskLabel"
  | "trainingFocus"
  | "inviteCode"
  | "cta"
  | "shareText"
  | "compliance"
>

export default function ShareCardPage() {
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [remoteCard, setRemoteCard] = useState<DataBindingShareCard | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReport(getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setLoaded(true)
      void fetchShareCardBinding().then((result) => {
        if (result.ok) setRemoteCard(result.data.share_card)
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const profile = useMemo(() => (loaded ? getDataBindingUserProfile() : null), [loaded])
  const localCard = useMemo(() => {
    if (!report || !profile) return null
    return buildLocalShareCard(report, profile.inviteSource || profile.sourceChannel || "web-next")
  }, [profile, report])
  const card = remoteCard || localCard

  async function generateCard() {
    if (!report) return
    setSubmitting(true)
    setMessage("")

    const result = await generateShareCardBinding()
    if (result.ok) {
      setRemoteCard(result.data.share_card)
      setMessage("照见分享卡已生成。")
    } else {
      setMessage(result.error)
    }
    setSubmitting(false)
  }

  async function copyShareText() {
    if (!card) return
    const text = `${card.shareText}\n${card.conclusion}\n${card.compliance}`
    try {
      await navigator.clipboard.writeText(text)
      setMessage("卡片文字已复制。")
    } catch {
      setMessage("当前浏览器暂不支持复制。")
    }
  }

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在生成照见卡</StatusPill>
      </AssessmentShell>
    )
  }

  if (!report || !card) {
    return (
      <AssessmentShell className="py-5">
        <StatusPill>照见分享卡</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(2.2rem,10vw,3.6rem)] font-light leading-[1.35] tracking-[.1em]">
          先完成一次照心。
        </h1>
        <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
          分享卡只承载人格照见与训练方向，不承载任何行情判断。
        </p>
        <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
          进入交易人格测评 →
        </PrimaryLink>
        <ComplianceNote>
          本卡片仅用于交易认知、行为训练与风险教育；不构成投资建议。
        </ComplianceNote>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5">
      <div className="share-card-page flex flex-col">
        <StatusPill>照见分享卡</StatusPill>
        <GlassPanel className="mt-8 overflow-hidden">
          <div className="rounded-[8px] border border-[rgba(172,146,83,.16)] bg-[radial-gradient(circle_at_26%_12%,rgba(180,157,93,.16),transparent_18rem),linear-gradient(180deg,rgba(17,16,13,.92),rgba(8,8,7,.94))] px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,.32)]">
            <p className="font-function text-xs font-semibold tracking-[.2em] text-[#b49d5d]">
              YANGMING TRADING MIND
            </p>
            <h1 className="mt-6 font-story text-[clamp(2.25rem,10vw,3.5rem)] font-light leading-[1.32] tracking-[.1em] text-[#f2ebdc]">
              {card.title}
            </h1>
            <p className="mt-4 font-story text-[1.06rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.64)]">
              {card.subtitle}
            </p>

            <div className="mt-8 grid gap-3">
              <ShareMeta label="主人格" value={card.primaryType} />
              <ShareMeta label="副人格" value={card.secondaryType} />
              <ShareMeta label="先照见" value={card.riskLabel} />
            </div>

            <p className="mt-7 font-story text-[1.28rem] font-light leading-[1.7] tracking-[.06em] text-[rgba(242,235,220,.84)]">
              {card.conclusion}
            </p>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.54)]">
              {card.trainingFocus}
            </p>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-[rgba(172,146,83,.14)] pt-4">
              <span className="font-function text-xs tracking-[.12em] text-[rgba(220,212,195,.42)]">邀请码来源</span>
              <span className="text-right font-function text-sm text-[rgba(242,235,220,.72)]">{card.inviteCode}</span>
            </div>
          </div>
        </GlassPanel>

        <div className="mt-5 grid gap-3">
          <PrimaryLink href="/assessment-entry" className="w-full">
            {card.cta} →
          </PrimaryLink>
          <SecondaryButton type="button" onClick={generateCard} disabled={submitting} className="w-full">
            {submitting ? "生成中..." : "生成照见分享卡"}
          </SecondaryButton>
          <SecondaryButton type="button" onClick={copyShareText} className="w-full">
            复制卡片文字
          </SecondaryButton>
          <SecondaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </SecondaryLink>
          {message ? (
            <p className="text-center font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.42)]">{message}</p>
          ) : null}
        </div>

        <ComplianceNote>{card.compliance}</ComplianceNote>
      </div>
      <style jsx>{`
        .share-card-page {
          animation: share-card-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes share-card-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

function ShareMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="text-right font-function text-sm text-[rgba(242,235,220,.72)]">{value}</span>
    </div>
  )
}

function buildLocalShareCard(report: AssessmentReport, inviteCode: string): LocalShareCard {
  const primaryType = getAssessmentTypeLabel(report.primaryType.key)
  const secondaryType = getAssessmentTypeLabel(report.secondaryType.key)
  const riskLabel = report.firstThoughtDisplay || report.firstThought || "第一念"

  return {
    title: "我的交易人格照见",
    subtitle: "不是预测行情，是看见自己的交易反应。",
    conclusion: `我正在观察「${primaryType}」反应，先从「${riskLabel}」开始练。`,
    primaryType,
    secondaryType,
    riskLabel,
    trainingFocus: `先记录「${riskLabel}」出现的时刻，再做七日觉察、训练与复盘。`,
    inviteCode,
    cta: "照见此心，一起事上练",
    shareText: "我的交易人格照见：我正在做交易心理觉察与七日训练。",
    compliance: "本卡片仅用于交易认知、行为训练与风险教育；不构成投资建议。",
  }
}
