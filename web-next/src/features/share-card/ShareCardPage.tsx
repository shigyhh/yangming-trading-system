"use client"

import { useEffect, useMemo, useState } from "react"

import { YangmingC16Mark } from "@/components/brand/yangming-mark"
import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  PrimaryLink,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { getDataBindingUserProfile } from "@/features/data-binding/api-client"
import { cn } from "@/lib/utils"

import {
  defaultShareInviteCode,
  formatShareCardCopy,
  getShareCardSourceLabel,
  loadShareCardSources,
  normalizeInviteCode,
  shareCardComplianceText,
  buildShareCard,
} from "./shareCardEngine"
import { loadLatestShareCard, saveShareCard } from "./shareCardStorage"
import type { ShareCard, ShareCardSource, ShareCardSourceType } from "./shareCardTypes"

export function ShareCardPage() {
  const [loaded, setLoaded] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [sources, setSources] = useState<ShareCardSource[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [savedCard, setSavedCard] = useState<ShareCard | null>(null)
  const [message, setMessage] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search)
      const previewMode = search.get("preview") === "1"
      const preferredSource = search.get("source") as ShareCardSourceType | null
      const nextSources = loadShareCardSources({ includePreview: previewMode })
      const latestCard = loadLatestShareCard()
      const initialSource = pickInitialSource(nextSources, preferredSource, latestCard)

      setIsPreview(previewMode)
      setSources(nextSources)
      setSavedCard(latestCard)
      setSelectedKey(initialSource ? getSourceKey(initialSource) : "")
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const selectedSource = useMemo(
    () => sources.find((source) => getSourceKey(source) === selectedKey) || null,
    [selectedKey, sources],
  )

  const inviteCode = useMemo(() => {
    if (!loaded) return defaultShareInviteCode
    const profile = getDataBindingUserProfile()
    return normalizeInviteCode(profile.inviteSource || profile.sourceChannel || profile.userId)
  }, [loaded])

  const draftCard = useMemo(() => (
    selectedSource ? buildShareCard(selectedSource, inviteCode, selectedSource.createdAt) : null
  ), [inviteCode, selectedSource])

  const card = useMemo(() => {
    if (!selectedSource) return null
    if (
      savedCard &&
      savedCard.sourceType === selectedSource.sourceType &&
      savedCard.sourceId === selectedSource.sourceId
    ) {
      return savedCard
    }

    return draftCard
  }, [draftCard, savedCard, selectedSource])

  function handleGenerateCard() {
    if (!selectedSource) return

    if (isPreview) {
      setMessage("当前为预览卡，不写入本地档案。完成心镜报告或今日心证后即可生成正式卡片。")
      return
    }

    const nextCard = buildShareCard(selectedSource, inviteCode)
    saveShareCard(nextCard)
    setSavedCard(nextCard)
    setMessage("分享卡已生成，并保存在此设备。")
    setCopied(false)
  }

  async function handleCopyCard() {
    if (!card) return

    try {
      await navigator.clipboard.writeText(formatShareCardCopy(card))
      setCopied(true)
      setMessage("卡片文字已复制。")
    } catch {
      setMessage("当前浏览器暂不支持复制。")
    }
  }

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在照见分享来源</StatusPill>
      </AssessmentShell>
    )
  }

  if (!selectedSource || !card) {
    return (
      <AssessmentShell className="py-5">
        <StatusPill>Sprint 13 分享卡片</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(2.25rem,10vw,4.2rem)] font-light leading-[1.28] tracking-[.1em]">
          先留下一次照见，
          <br />
          再生成分享卡。
        </h1>
        <p className="mt-6 max-w-[34rem] font-story text-[1rem] font-light leading-8 tracking-[.045em] text-[rgba(220,212,195,.6)]">
          分享卡只分享心镜报告、今日心证或七日变化，不展示收益、行情、个股和买卖点。
        </p>
        <div className="mt-8 grid gap-3 sm:max-w-[460px] sm:grid-cols-2">
          <PrimaryLink href="/assessment-entry" className="w-full">
            进入入照心 →
          </PrimaryLink>
          <SecondaryLink href="/share-card?preview=1" className="w-full">
            查看预览卡 →
          </SecondaryLink>
        </div>
        <ComplianceNote>{shareCardComplianceText}</ComplianceNote>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-8" contentWidth="wide">
      <div className="share-card-experience mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(390px,0.72fr)] lg:items-center">
        <section className="share-card-story">
          <StatusPill>{isPreview ? "分享卡预览" : "Sprint 13 分享卡片"}</StatusPill>
          <h1 className="mt-8 font-story text-[clamp(2.5rem,7vw,5.8rem)] font-light leading-[1.18] tracking-[.1em]">
            分享照见，
            <br />
            不分享标签。
          </h1>
          <p className="mt-6 max-w-[37rem] font-story text-[1.08rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
            这张卡不说你是谁，也不暗示行情会怎样。它只把一次心镜报告、一枚今日心证，或一段七日变化，沉静地留成可以转发的文字。
          </p>

          <GlassPanel className="mt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">选择分享来源</p>
                <p className="mt-2 font-function text-sm leading-6 text-[rgba(220,212,195,.48)]">
                  支持心镜报告、今日心证、七日变化三种来源。
                </p>
              </div>
              <span className="font-function text-xs tracking-[.12em] text-[rgba(220,212,195,.42)]">
                邀请码 {inviteCode}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {sources.map((source) => (
                <button
                  key={getSourceKey(source)}
                  type="button"
                  className={cn(
                    "rounded-[8px] border bg-white/[.025] px-4 py-3 text-left transition duration-300",
                    getSourceKey(source) === selectedKey
                      ? "border-[rgba(216,183,111,.42)] shadow-[0_0_0_1px_rgba(216,183,111,.08),0_18px_44px_rgba(0,0,0,.26)]"
                      : "border-[rgba(172,146,83,.12)] hover:border-[rgba(216,183,111,.28)]",
                  )}
                  onClick={() => {
                    setSelectedKey(getSourceKey(source))
                    setMessage("")
                    setCopied(false)
                  }}
                >
                  <span className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.78)]">
                    {getShareCardSourceLabel(source.sourceType)}
                  </span>
                  <strong className="mt-3 block font-story text-xl font-light leading-8 tracking-[.04em] text-[rgba(242,235,220,.82)]">
                    {source.title}
                  </strong>
                  <span className="mt-2 line-clamp-2 block font-function text-xs leading-5 text-[rgba(220,212,195,.42)]">
                    {source.summary}
                  </span>
                </button>
              ))}
            </div>
          </GlassPanel>

          <div className="mt-6 grid gap-3 sm:max-w-[520px] sm:grid-cols-2">
            <PrimaryButton type="button" onClick={handleGenerateCard} className="w-full">
              {isPreview ? "预览卡不写入" : "生成分享卡"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={handleCopyCard} className="w-full">
              {copied ? "已复制" : "复制卡片文字"}
            </SecondaryButton>
          </div>
          <div className="mt-3 grid gap-3 sm:max-w-[520px] sm:grid-cols-2">
            <SecondaryLink href="/mirror-archive" className="w-full">
              回到心镜档案 →
            </SecondaryLink>
            <SecondaryLink href="/mirror-scroll" className="w-full">
              查看心镜长卷 →
            </SecondaryLink>
          </div>
          {message ? (
            <p className="mt-4 font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.48)]">{message}</p>
          ) : null}
        </section>

        <section className="share-card-preview-wrap" aria-label="分享卡预览">
          <SharePoster card={card} source={selectedSource} />
        </section>

        <ComplianceNote>{shareCardComplianceText}</ComplianceNote>
      </div>
      <style jsx>{`
        .share-card-experience {
          animation: share-card-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .share-card-story {
          position: relative;
          isolation: isolate;
        }

        .share-card-story::before {
          content: "";
          position: absolute;
          left: -12%;
          top: -14%;
          width: min(62vw, 560px);
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.052) 0 1px, transparent 1px 18px),
            radial-gradient(circle, rgba(95, 132, 117, 0.105), transparent 64%);
          opacity: 0.58;
          z-index: -1;
        }

        .share-card-preview-wrap {
          width: 100%;
          max-width: 440px;
          justify-self: center;
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

function SharePoster({ card, source }: { card: ShareCard; source: ShareCardSource }) {
  return (
    <GlassPanel className="overflow-hidden p-0">
      <article className="share-poster">
        <div className="share-poster-ripple" aria-hidden="true" />
        <div className="share-poster-top">
          <div className="share-poster-brand">
            <span className="share-poster-mark">
              <YangmingC16Mark className="size-7" title="阳明照见分享卡小标" />
            </span>
            <p>YANGMING MIND MIRROR</p>
          </div>
          <span className="share-poster-state">{source.label}</span>
        </div>

        <div className="share-poster-title">
          <h2>{card.title}</h2>
          <p>{card.subtitle}</p>
        </div>

        <div className="share-quote">
          {card.quote.split("\n").map((line) => (
            line ? <p key={line}>{line}</p> : <br key="break" />
          ))}
        </div>

        <div className="share-source-tags">
          {source.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="share-poster-bottom">
          <div>
            <span>{card.ctaText}</span>
            <strong>邀请码：{card.inviteCode}</strong>
          </div>
        </div>
        <p className="share-compliance">{card.complianceText}</p>
      </article>
      <style jsx>{`
        .share-poster {
          position: relative;
          display: flex;
          aspect-ratio: 4 / 5;
          min-height: 548px;
          flex-direction: column;
          overflow: hidden;
          border-radius: 8px;
          background:
            radial-gradient(circle at 22% 12%, rgba(216, 183, 111, 0.17), transparent 15rem),
            radial-gradient(circle at 78% 30%, rgba(95, 132, 117, 0.15), transparent 15rem),
            linear-gradient(180deg, rgba(17, 16, 13, 0.98), rgba(8, 8, 7, 0.98));
          padding: 1.25rem;
        }

        .share-poster::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(216, 183, 111, 0.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 183, 111, 0.024) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at 50% 38%, black, transparent 78%);
          pointer-events: none;
        }

        .share-poster-ripple {
          position: absolute;
          left: 50%;
          top: 41%;
          width: 88%;
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
        .share-quote,
        .share-source-tags,
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
          min-height: 2.45rem;
          font-family: var(--font-function);
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.72);
        }

        .share-poster-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-width: 0;
        }

        .share-poster-mark {
          display: grid;
          width: 2.35rem;
          height: 2.35rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.22);
          border-radius: 8px;
          color: rgba(216, 183, 111, 0.78);
          background:
            radial-gradient(circle at 50% 42%, rgba(216, 183, 111, 0.14), transparent 62%),
            rgba(255, 255, 255, 0.034);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 0 28px rgba(216, 183, 111, 0.055);
        }

        .share-poster-top p {
          margin: 0;
          min-width: 0;
          color: rgba(216, 183, 111, 0.74);
        }

        .share-poster-state {
          flex: 0 0 auto;
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 999px;
          padding: 0.28rem 0.5rem;
          color: rgba(220, 212, 195, 0.46);
        }

        .share-poster-title {
          margin-top: 2.35rem;
        }

        .share-poster-title h2 {
          margin: 0;
          max-width: 8em;
          font-family: var(--font-narrative);
          font-size: clamp(2.25rem, 9vw, 3.45rem);
          font-weight: 300;
          line-height: 1.22;
          letter-spacing: 0.12em;
          color: rgba(242, 235, 220, 0.92);
        }

        .share-poster-title p {
          margin: 1rem 0 0;
          max-width: 20em;
          font-family: var(--font-story);
          font-size: 1rem;
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: 0.05em;
          color: rgba(220, 212, 195, 0.58);
        }

        .share-quote {
          margin-top: 2.2rem;
          border-left: 1px solid rgba(216, 183, 111, 0.28);
          padding-left: 1rem;
        }

        .share-quote p {
          margin: 0;
          font-family: var(--font-story);
          font-size: clamp(1.12rem, 3vw, 1.5rem);
          font-weight: 300;
          line-height: 1.82;
          letter-spacing: 0.05em;
          color: rgba(242, 235, 220, 0.84);
        }

        .share-source-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 1.4rem;
        }

        .share-source-tags span {
          border: 1px solid rgba(172, 146, 83, 0.15);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.028);
          padding: 0.35rem 0.55rem;
          font-family: var(--font-function);
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.48);
        }

        .share-poster-bottom {
          margin-top: auto;
          border-top: 1px solid rgba(172, 146, 83, 0.14);
          padding-top: 1rem;
          font-family: var(--font-function);
        }

        .share-poster-bottom span {
          display: block;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          color: rgba(220, 212, 195, 0.38);
        }

        .share-poster-bottom strong {
          display: block;
          margin-top: 0.42rem;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.72);
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
            min-height: 520px;
            padding: 1rem;
          }

          .share-poster-title {
            margin-top: 1.85rem;
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
    </GlassPanel>
  )
}

function getSourceKey(source: ShareCardSource) {
  return `${source.sourceType}:${source.sourceId}`
}

function pickInitialSource(
  sources: ShareCardSource[],
  preferredSource: ShareCardSourceType | null,
  latestCard: ShareCard | null,
) {
  if (!sources.length) return null

  if (preferredSource) {
    const preferred = sources.find((source) => source.sourceType === preferredSource)
    if (preferred) return preferred
  }

  if (latestCard) {
    const previous = sources.find((source) => source.sourceType === latestCard.sourceType && source.sourceId === latestCard.sourceId)
    if (previous) return previous
  }

  return (
    sources.find((source) => source.sourceType === "heart_proof") ||
    sources.find((source) => source.sourceType === "mirror_report") ||
    sources.find((source) => source.sourceType === "retest") ||
    sources[0]
  )
}
