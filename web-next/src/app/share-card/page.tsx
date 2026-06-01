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
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import {
  fetchShareCardBinding,
  generateShareCardBinding,
  getDataBindingUserProfile,
} from "@/features/data-binding/api-client"
import {
  buildShareCardConclusion,
  buildShareCardTrainingFocus,
  shareCardContent,
} from "../../../../packages/content/share-card.js"
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
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      setIsPreview(previewMode)
      setReport(previewMode ? buildPreviewAssessmentReport() : getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setLoaded(true)

      if (!previewMode) {
        void fetchShareCardBinding().then((result) => {
          if (result.ok) setRemoteCard(result.data.share_card)
        })
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const profile = useMemo(() => (loaded ? getDataBindingUserProfile() : null), [loaded])
  const localCard = useMemo(() => {
    if (!report || !profile) return null
    return buildLocalShareCard(report, isPreview ? "preview-sprint8" : profile.inviteSource || profile.sourceChannel || "web-next")
  }, [isPreview, profile, report])
  const card = isPreview ? localCard : remoteCard || localCard

  async function generateCard() {
    if (!report) return
    if (isPreview) {
      setMessage("当前为预览卡。完成测评后会写入同一条数据链。")
      return
    }

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
        <SecondaryLink href="/share-card?preview=1" className="mt-3 w-full">
          查看分享卡预览 →
        </SecondaryLink>
        <ComplianceNote>
          本卡片仅用于交易认知、行为训练与风险教育；不构成投资建议。
        </ComplianceNote>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-8" contentWidth="wide">
      <div className="share-card-page mx-auto grid w-full max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)] lg:items-center">
        <section className="share-stage">
          <StatusPill>{isPreview ? "分享卡预览" : "照见分享卡"}</StatusPill>
          <h1 className="mt-8 font-story text-[clamp(2.5rem,7vw,5.2rem)] font-light leading-[1.25] tracking-[.1em]">
            一张卡，
            <br />
            只照见此心。
          </h1>
          <p className="mt-6 max-w-[34rem] font-story text-[1.08rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
            分享的不是结果标签，而是一段正在训练的反应模式。它应该克制、安静、可截图，也能让人一眼知道这不是行情判断。
          </p>
          <div className="mt-8 grid gap-3 sm:max-w-[420px] sm:grid-cols-2">
            <PrimaryLink href="/assessment-entry" className="w-full">
              {card.cta} →
            </PrimaryLink>
            <SecondaryLink href={isPreview ? "/assessment-result?preview=1" : "/assessment-result"} className="w-full">
              回看报告 →
            </SecondaryLink>
          </div>
        </section>

        <section className="share-preview-wrap">
          <GlassPanel className="share-preview-panel overflow-hidden p-0">
            <article className="share-poster" aria-label="照见分享卡预览">
              <div className="share-poster-ring" aria-hidden="true" />
              <div className="share-poster-top">
                <p>YANGMING TRADING MIND</p>
                <span>{isPreview ? "PREVIEW" : "REFLECTION"}</span>
              </div>
              <div className="share-poster-title">
                <h2>{card.title}</h2>
                <p>{card.subtitle}</p>
              </div>
              <div className="share-personality-seal">
                <span>{card.primaryType}</span>
                <em>主反应</em>
              </div>
              <div className="share-poster-meta">
                <ShareMeta label="副反应" value={card.secondaryType} />
                <ShareMeta label="先照见" value={card.riskLabel} />
              </div>
              <p className="share-conclusion">{card.conclusion}</p>
              <p className="share-training">{card.trainingFocus}</p>
              <div className="share-poster-bottom">
                <span>邀请码来源</span>
                <strong>{card.inviteCode}</strong>
              </div>
              <p className="share-compliance">{card.compliance}</p>
            </article>
          </GlassPanel>

          <div className="mt-5 grid gap-3">
            <SecondaryButton type="button" onClick={generateCard} disabled={submitting} className="w-full">
              {submitting ? "生成中..." : isPreview ? "预览数据不写入" : "生成照见分享卡"}
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
        </section>

        <ComplianceNote>{card.compliance}</ComplianceNote>
      </div>
      <style jsx>{`
        .share-card-page {
          animation: share-card-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .share-stage {
          position: relative;
          isolation: isolate;
        }

        .share-stage::before {
          content: "";
          position: absolute;
          left: -12%;
          top: -12%;
          width: min(58vw, 520px);
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.055) 0 1px, transparent 1px 18px),
            radial-gradient(circle, rgba(95, 132, 117, 0.1), transparent 62%);
          opacity: 0.54;
          z-index: -1;
        }

        .share-preview-wrap {
          width: 100%;
          max-width: 430px;
          justify-self: center;
        }

        .share-preview-panel {
          border-color: rgba(216, 183, 111, 0.18);
          box-shadow:
            0 34px 90px rgba(0, 0, 0, 0.36),
            0 0 0 1px rgba(216, 183, 111, 0.04);
        }

        .share-poster {
          position: relative;
          display: flex;
          aspect-ratio: 4 / 5;
          min-height: 520px;
          flex-direction: column;
          overflow: hidden;
          border-radius: 8px;
          background:
            radial-gradient(circle at 22% 12%, rgba(216, 183, 111, 0.17), transparent 15rem),
            radial-gradient(circle at 78% 28%, rgba(95, 132, 117, 0.15), transparent 15rem),
            linear-gradient(180deg, rgba(17, 16, 13, 0.98), rgba(8, 8, 7, 0.98));
          padding: 1.25rem;
        }

        .share-poster::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(216, 183, 111, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 183, 111, 0.026) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at 50% 38%, black, transparent 78%);
          pointer-events: none;
        }

        .share-poster-ring {
          position: absolute;
          left: 50%;
          top: 42%;
          width: 86%;
          aspect-ratio: 1;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow:
            inset 0 0 0 1px rgba(216, 183, 111, 0.055),
            inset 0 0 72px rgba(0, 0, 0, 0.34);
          opacity: 0.74;
          animation: share-ring-breathe 7s ease-in-out infinite;
        }

        .share-poster-top,
        .share-poster-title,
        .share-personality-seal,
        .share-poster-meta,
        .share-conclusion,
        .share-training,
        .share-poster-bottom,
        .share-compliance {
          position: relative;
          z-index: 2;
        }

        .share-poster-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          font-family: var(--font-function);
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.72);
        }

        .share-poster-top p {
          margin: 0;
        }

        .share-poster-top span {
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 999px;
          padding: 0.28rem 0.5rem;
          color: rgba(220, 212, 195, 0.46);
        }

        .share-poster-title {
          margin-top: 2.2rem;
        }

        .share-poster-title h2 {
          margin: 0;
          max-width: 8em;
          font-family: var(--font-narrative);
          font-size: clamp(2.1rem, 9vw, 3.3rem);
          font-weight: 300;
          line-height: 1.25;
          letter-spacing: 0.1em;
          color: rgba(242, 235, 220, 0.9);
        }

        .share-poster-title p {
          margin: 1rem 0 0;
          max-width: 20em;
          font-family: var(--font-story);
          font-size: 0.98rem;
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: 0.05em;
          color: rgba(220, 212, 195, 0.58);
        }

        .share-personality-seal {
          display: grid;
          width: 9.2rem;
          height: 9.2rem;
          margin: 2rem auto 0;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.26);
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.08), transparent 62%),
            rgba(5, 5, 4, 0.34);
          text-align: center;
          box-shadow: inset 0 0 38px rgba(216, 183, 111, 0.055);
        }

        .share-personality-seal span {
          font-family: var(--font-narrative);
          font-size: 2.05rem;
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(242, 235, 220, 0.9);
        }

        .share-personality-seal em {
          margin-top: -1.6rem;
          font-family: var(--font-function);
          font-size: 0.66rem;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.68);
        }

        .share-poster-meta {
          display: grid;
          gap: 0.65rem;
          margin-top: 1.65rem;
        }

        .share-conclusion {
          margin: 1.3rem 0 0;
          font-family: var(--font-story);
          font-size: 1.08rem;
          font-weight: 300;
          line-height: 1.78;
          letter-spacing: 0.055em;
          color: rgba(242, 235, 220, 0.82);
        }

        .share-training {
          margin: 0.75rem 0 0;
          font-family: var(--font-function);
          font-size: 0.86rem;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.52);
        }

        .share-poster-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: auto;
          border-top: 1px solid rgba(172, 146, 83, 0.14);
          padding-top: 1rem;
          font-family: var(--font-function);
        }

        .share-poster-bottom span {
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          color: rgba(220, 212, 195, 0.38);
        }

        .share-poster-bottom strong {
          font-size: 0.86rem;
          font-weight: 600;
          color: rgba(242, 235, 220, 0.68);
        }

        .share-compliance {
          margin: 0.75rem 0 0;
          font-family: var(--font-function);
          font-size: 0.66rem;
          line-height: 1.6;
          color: rgba(220, 212, 195, 0.34);
        }

        @media (max-width: 520px) {
          .share-poster {
            min-height: 500px;
            padding: 1rem;
          }

          .share-poster-title {
            margin-top: 1.8rem;
          }

          .share-personality-seal {
            width: 8rem;
            height: 8rem;
            margin-top: 1.5rem;
          }
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

        @keyframes share-ring-breathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.99);
            opacity: 0.58;
          }

          50% {
            transform: translate(-50%, -50%) scale(1.015);
            opacity: 0.84;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

function ShareMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.03] px-3 py-2">
      <span className="font-function text-[0.66rem] tracking-[.14em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="text-right font-function text-[0.78rem] text-[rgba(242,235,220,.72)]">{value}</span>
    </div>
  )
}

function buildLocalShareCard(report: AssessmentReport, inviteCode: string): LocalShareCard {
  const primaryType = getAssessmentTypeLabel(report.primaryType.key)
  const secondaryType = getAssessmentTypeLabel(report.secondaryType.key)
  const riskLabel = report.firstThoughtDisplay || report.firstThought || "第一念"

  return {
    title: shareCardContent.title,
    subtitle: shareCardContent.subtitle,
    conclusion: buildShareCardConclusion({ primaryType, riskLabel }),
    primaryType,
    secondaryType,
    riskLabel,
    trainingFocus: buildShareCardTrainingFocus({ riskLabel }),
    inviteCode,
    cta: shareCardContent.cta,
    shareText: "我的交易人格照见：我正在做交易心理觉察与七日训练。",
    compliance: shareCardContent.compliance,
  }
}
