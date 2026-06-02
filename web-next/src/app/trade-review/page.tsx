"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { getStorage, setStorage } from "@/features/assessment/storage"
import { fetchDataBindingSummary, syncTradeReviewBinding, type DataBindingSummaryResponse } from "@/features/data-binding/api-client"
import {
  buildTradeReviewPayload,
  canSubmitTradeReview,
  createEmptyTradeReviewDraft,
  inferTradeReviewMapping,
  marketTypeOptions,
  reviewQuestionPrompts,
  tradeReviewLastResultStorageKey,
  tradeReviewStorageKey,
  type TradeReviewDraft,
} from "@/features/trade-review/trade-review"
import type { LivingMirrorStats, TradeReview } from "@yangming/contracts/living-mirror"

const mirrorScoreLabels: Record<string, string> = {
  chasing: "追涨之镜",
  holding_loss: "扛单之镜",
  fantasy: "幻想之镜",
  gambling: "赌性之镜",
  following: "从众之镜",
  hesitation: "犹疑之镜",
  procrastination: "拖延之镜",
  anxiety: "焦虑之镜",
  conscience: "良知之镜",
}

export default function TradeReviewPage() {
  const [draft, setDraft] = useState<TradeReviewDraft>(() => createEmptyTradeReviewDraft())
  const [summary, setSummary] = useState<DataBindingSummaryResponse | null>(null)
  const [lastReview, setLastReview] = useState<TradeReview | null>(null)
  const [livingStats, setLivingStats] = useState<LivingMirrorStats | null>(null)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(getStorage<TradeReviewDraft>(tradeReviewStorageKey, createEmptyTradeReviewDraft()))
      setLastReview(getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null))
      setLoaded(true)
      void fetchDataBindingSummary().then((result) => {
        if (result.ok) {
          setSummary(result.data)
          setLivingStats(result.data.living_mirror_stats)
          setLastReview(result.data.trade_reviews.at(-1) || getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null))
        }
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const mapping = useMemo(() => inferTradeReviewMapping(draft), [draft])
  const canSubmit = canSubmitTradeReview(draft)
  const activeStats = livingStats || summary?.living_mirror_stats || null
  const latestReview = lastReview || summary?.trade_reviews.at(-1) || null
  const userLabel = summary?.user.nickname || "体验学员"
  const serverState = summary ? "Server API 已绑定" : "等待同步"

  function updateDraft(patch: Partial<TradeReviewDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch }
      setStorage(tradeReviewStorageKey, next)
      return next
    })
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setMessage("请上传图片格式的复盘截图。")
      return
    }

    if (file.size > 1_400_000) {
      setMessage("截图先控制在 1.4MB 以内，避免本地 runtime JSON 过大。")
      return
    }

    const imageUrl = await readImageAsDataUrl(file)
    updateDraft({
      imageUrl,
      imageName: file.name,
    })
    setMessage("截图已放入复盘草稿。")
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setMessage("正在写入活镜成长...")
    const payload = buildTradeReviewPayload(draft)
    const result = await syncTradeReviewBinding(payload)

    if (result.ok) {
      setLastReview(result.data.review)
      setLivingStats(result.data.living_mirror_stats)
      setStorage(tradeReviewLastResultStorageKey, result.data.review)
      setMessage("已写入活镜成长。真实交易复盘已成为你的修行证据。")
    } else {
      setMessage(`${result.error}。草稿已保留，server 启动后可再次落档。`)
    }

    setIsSubmitting(false)
  }

  if (!loaded) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在取出复盘草稿</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="trade-review-page mx-auto w-full max-w-[1440px]">
        <section className="trade-review-hero">
          <div>
            <StatusPill>真实交易复盘 MVP</StatusPill>
            <h1 className="trade-review-title mt-8 font-story font-light leading-[1.08] tracking-[.08em]">
              以复盘照行为，
              <br />
              以活镜照成长。
            </h1>
            <p className="mt-6 max-w-[44rem] font-story text-[1.12rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
              上传一张截图，写下三句真实自述。系统先不判断行情，只把你的念头映射到九面行为心镜。
            </p>
          </div>

          <GlassPanel className="trade-review-status-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">数据绑定</p>
            <div className="mt-5 grid gap-3">
              <ReviewMeta label="账号" value={userLabel} />
              <ReviewMeta label="数据状态" value={serverState} />
              <ReviewMeta label="复盘记录" value={`${summary?.trade_reviews.length ?? (latestReview ? 1 : 0)} 条`} />
              <ReviewMeta label="良知之镜" value={activeStats ? `${activeStats.conscienceGrowth}` : "待写入"} />
            </div>
          </GlassPanel>
        </section>

        <section className="trade-review-grid mt-6">
          <GlassPanel className="trade-review-upload-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">截图证据</p>
            <label className="mt-5 flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-[rgba(180,157,93,.28)] bg-black/20 p-5 text-center transition hover:border-[rgba(216,183,111,.48)]">
              {draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.imageUrl}
                  alt="交易复盘截图预览"
                  className="max-h-[300px] w-full rounded-[8px] object-contain opacity-90"
                />
              ) : (
                <span className="font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.76)]">
                  上传交易截图 / K 线截图 / 交易记录截图
                </span>
              )}
              <span className="mt-4 font-function text-xs leading-6 text-[rgba(220,212,195,.5)]">
                第一版只保存截图与自述，不自动识别行情。
              </span>
              <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FieldLabel label="日期">
                <input
                  className="review-input"
                  type="date"
                  value={draft.tradeDate}
                  onChange={(event) => updateDraft({ tradeDate: event.target.value })}
                />
              </FieldLabel>
              <FieldLabel label="市场">
                <select
                  className="review-input"
                  value={draft.marketType}
                  onChange={(event) => updateDraft({ marketType: event.target.value })}
                >
                  {marketTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="标的可脱敏">
                <input
                  className="review-input"
                  value={draft.symbolMasked}
                  placeholder="可不填"
                  onChange={(event) => updateDraft({ symbolMasked: event.target.value })}
                />
              </FieldLabel>
            </div>
          </GlassPanel>

          <GlassPanel className="trade-review-form-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复盘三问</p>
            <div className="mt-5 grid gap-4">
              <FieldLabel label={reviewQuestionPrompts.buyReason}>
                <textarea
                  className="review-textarea"
                  value={draft.buyReason}
                  placeholder="写下当时为什么决定进入，只记录真实念头。"
                  onChange={(event) => updateDraft({ buyReason: event.target.value })}
                />
              </FieldLabel>
              <FieldLabel label={reviewQuestionPrompts.sellReason}>
                <textarea
                  className="review-textarea"
                  value={draft.sellReason}
                  placeholder="写下当时为什么决定离开，或为什么没有按原计划处理。"
                  onChange={(event) => updateDraft({ sellReason: event.target.value })}
                />
              </FieldLabel>
              <FieldLabel label={reviewQuestionPrompts.strongestThought}>
                <textarea
                  className="review-textarea"
                  value={draft.strongestThought}
                  placeholder="例如：怕错过、想翻本、不认错、怕回吐、大家都在说。"
                  onChange={(event) => updateDraft({ strongestThought: event.target.value })}
                />
              </FieldLabel>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton className="w-full" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? "正在落档..." : canSubmit ? "写入活镜成长" : "先完成截图与三问"}
              </PrimaryButton>
              <SecondaryButton className="w-full" onClick={() => updateDraft(createEmptyTradeReviewDraft())}>
                清空草稿
              </SecondaryButton>
            </div>
            {message ? (
              <p className="mt-4 rounded-[8px] border border-[rgba(180,157,93,.18)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(242,235,220,.68)]">
                {message}
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel className="trade-review-mapping-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">心镜映射预览</p>
            <h2 className="mt-5 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.92)]">
              {mapping.detectedMirror}
            </h2>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              心贼显影：{mapping.detectedThieves.length ? mapping.detectedThieves.join(" / ") : "待继续观察"}
            </p>
            <p className="mt-4 font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(242,235,220,.72)]">
              {mapping.reviewText}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {mapping.behaviorTags.map((tag) => (
                <span key={tag} className="rounded-full border border-[rgba(180,157,93,.2)] bg-[rgba(180,157,93,.08)] px-3 py-1 font-function text-xs text-[rgba(216,183,111,.86)]">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
              {mapping.nextPracticeText}
            </p>
          </GlassPanel>

          <GlassPanel className="trade-review-growth-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">活镜成长</p>
            {activeStats ? (
              <div className="mt-5 grid gap-3">
                <ReviewMeta label="训练完成率" value={`${activeStats.trainingCompletionRate}%`} />
                <ReviewMeta label="循环复发次数" value={`${activeStats.loopRelapseCount}`} />
                <ReviewMeta label="良知成长值" value={`${activeStats.conscienceGrowth}`} />
                <div className="mt-2 grid gap-3">
                  {Object.entries(activeStats.mirrorScores).slice(0, 9).map(([key, value]) => (
                    <div key={key} className="grid gap-2">
                      <div className="flex items-center justify-between font-function text-sm text-[rgba(220,212,195,.62)]">
                        <span>{mirrorScoreLabels[key] || key}</span>
                        <span className="text-[rgba(180,157,93,.78)]">{value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[.055]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#5f8475,#d8b76f)]" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                完成一次复盘落档后，这里会显示九镜强度、心贼频次和良知成长值。
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="trade-review-latest-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">最近复盘</p>
            {latestReview ? (
              <>
                <h2 className="mt-4 font-story text-2xl font-light tracking-[.08em]">{latestReview.detectedMirror}</h2>
                <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
                  {latestReview.reviewText}
                </p>
              </>
            ) : (
              <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                暂无真实交易复盘。先上传一张截图，留下一次行为证据。
              </p>
            )}
            <SecondaryLink href="/observing-archive" className="mt-5 w-full">
              回到心镜档案馆 →
            </SecondaryLink>
          </GlassPanel>
        </section>

        <ComplianceNote>
          本页仅用于记录交易行为复盘、念头模式与训练变化；不预测行情，不提供买卖建议，不构成任何投资建议。
        </ComplianceNote>
      </div>

      <style jsx>{`
        .trade-review-page {
          animation: trade-review-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .trade-review-hero {
          display: grid;
          gap: 1.25rem;
          align-items: end;
        }

        .trade-review-title {
          max-width: 13em;
          font-size: clamp(3.1rem, 7vw, 7.4rem);
        }

        .trade-review-grid {
          display: grid;
          gap: 1rem;
        }

        .trade-review-status-card,
        .trade-review-upload-panel,
        .trade-review-form-panel,
        .trade-review-mapping-panel,
        .trade-review-growth-panel,
        .trade-review-latest-panel {
          position: relative;
          overflow: hidden;
        }

        .trade-review-status-card::before,
        .trade-review-upload-panel::before,
        .trade-review-form-panel::before,
        .trade-review-mapping-panel::before,
        .trade-review-growth-panel::before,
        .trade-review-latest-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 16% 0%, rgba(216, 183, 111, 0.06), transparent 14rem),
            radial-gradient(circle at 88% 10%, rgba(95, 132, 117, 0.055), transparent 15rem);
          pointer-events: none;
        }

        .review-input,
        .review-textarea {
          width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(172, 146, 83, 0.16);
          background: rgba(255, 255, 255, 0.035);
          padding: 0.9rem 1rem;
          color: rgba(242, 235, 220, 0.84);
          outline: none;
          transition: border-color 240ms ease, background 240ms ease;
        }

        .review-input:focus,
        .review-textarea:focus {
          border-color: rgba(216, 183, 111, 0.42);
          background: rgba(255, 255, 255, 0.055);
        }

        .review-textarea {
          min-height: 112px;
          resize: vertical;
          line-height: 1.8;
        }

        .review-input::placeholder,
        .review-textarea::placeholder {
          color: rgba(220, 212, 195, 0.34);
        }

        @media (min-width: 920px) {
          .trade-review-hero {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 0.38fr);
            min-height: min(44vh, 520px);
          }

          .trade-review-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
            align-items: start;
          }

          .trade-review-upload-panel {
            grid-column: span 5;
          }

          .trade-review-form-panel {
            grid-column: span 7;
          }

          .trade-review-mapping-panel {
            grid-column: span 7;
          }

          .trade-review-growth-panel,
          .trade-review-latest-panel {
            grid-column: span 5;
          }
        }

        @media (max-width: 640px) {
          .trade-review-title {
            font-size: clamp(2.55rem, 12vw, 3.5rem);
            line-height: 1.18;
          }
        }

        @keyframes trade-review-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(18px);
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

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(180,157,93,.82)]">{label}</span>
      {children}
    </label>
  )
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="min-w-0 break-words text-left font-function text-sm text-[rgba(242,235,220,.72)] sm:text-right">{value}</span>
    </div>
  )
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("图片读取失败"))
    reader.readAsDataURL(file)
  })
}
