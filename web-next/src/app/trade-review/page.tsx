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
import {
  assessmentStorageKeys,
  getStorage,
  setStorage,
} from "@/features/assessment/storage"
import { fetchDataBindingSummary, syncTradeReviewBinding, type DataBindingSummaryResponse } from "@/features/data-binding/api-client"
import { HeartProofCard } from "@/features/heart-proof/HeartProofCard"
import {
  buildTradeReviewHeartProof,
  formatHeartProofForCopy,
} from "@/features/heart-proof/heartProofEngine"
import { loadLatestHeartProof, saveHeartProof } from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { deriveBehaviorLoops } from "@/features/living-mirror-growth/behaviorLoopEngine"
import { upsertBehaviorLoops } from "@/features/living-mirror-growth/behaviorLoopStorage"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import { loadMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import {
  buildTradeReviewPayload,
  canSubmitTradeReview,
  createEmptyTradeReviewDraft,
  directionOptions,
  getTradeReviewPostReactionLabel,
  getTradeReviewThoughtLabel,
  inferTradeReviewMapping,
  loadTradeReviewHistory,
  marketTypeOptions,
  postReactionOptions,
  resultOptions,
  reviewQuestionPrompts,
  thoughtOptions,
  tradeReviewLastResultStorageKey,
  tradeReviewStorageKey,
  upsertTradeReviewHistory,
  type TradeReviewDirection,
  type TradeReviewDraft,
  type TradeReviewMarketType,
  type TradeReviewResultOptional,
} from "@/features/trade-review/trade-review"
import { cn } from "@/lib/utils"
import type { LivingMirrorStats, TradeReview } from "../../../../packages/contracts/living-mirror"

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

type TradeReviewCompletionFeedback = {
  reviewHeartProofId: string
  thoughtLabel: string
  breakAction: string
  loopTitle?: string
  behaviorLoopId?: string
  syncNote?: string
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function getAnonymousId() {
  const existing = getStorage<string>(assessmentStorageKeys.dataBindingUserId, "")
  if (existing) return existing

  const next = makeId("anon")
  setStorage(assessmentStorageKeys.dataBindingUserId, next)
  return next
}

export default function TradeReviewPage() {
  const [draft, setDraft] = useState<TradeReviewDraft>(() => createEmptyTradeReviewDraft())
  const [summary, setSummary] = useState<DataBindingSummaryResponse | null>(null)
  const [lastReview, setLastReview] = useState<TradeReview | null>(null)
  const [localTradeReviewCount, setLocalTradeReviewCount] = useState(0)
  const [livingStats, setLivingStats] = useState<LivingMirrorStats | null>(null)
  const [heartProof, setHeartProof] = useState<HeartProof | null>(null)
  const [completionFeedback, setCompletionFeedback] = useState<TradeReviewCompletionFeedback | null>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedReview = getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null)
      const savedTradeReviews = loadTradeReviewHistory()
      const latestHeartProof = loadLatestHeartProof()

      setDraft(getStorage<TradeReviewDraft>(tradeReviewStorageKey, createEmptyTradeReviewDraft()))
      setLocalTradeReviewCount(savedTradeReviews.length)
      setLastReview(savedTradeReviews.at(0) || savedReview)
      if (latestHeartProof?.sourceType === "trade_review") setHeartProof(latestHeartProof)
      setLoaded(true)
      void fetchDataBindingSummary().then((result) => {
        if (result.ok) {
          setSummary(result.data)
          setLivingStats(result.data.living_mirror_stats)
          setLastReview(result.data.trade_reviews.at(-1) || savedTradeReviews.at(0) || savedReview)
          setLocalTradeReviewCount(Math.max(savedTradeReviews.length, result.data.trade_reviews.length))
        }
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const mapping = useMemo(() => inferTradeReviewMapping(draft), [draft])
  const canSubmit = canSubmitTradeReview(draft)
  const activeStats = livingStats || summary?.living_mirror_stats || null
  const latestReview = lastReview || summary?.trade_reviews.at(-1) || null
  const tradeReviewCount = Math.max(localTradeReviewCount, summary?.trade_reviews.length || 0, latestReview ? 1 : 0)
  const userLabel = summary?.user.nickname || "体验学员"
  const serverState = summary ? "Server API 已绑定" : "本地记录"

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
      setMessage("截图先控制在 1.4MB 以内，避免本地记录过大。")
      return
    }

    const imageUrl = await readImageAsDataUrl(file)
    updateDraft({
      imageUrl,
      imageName: file.name,
    })
    setMessage("截图已作为可选证据放入复盘草稿。")
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setMessage("正在落下一次真实复盘...")

    const createdAt = new Date().toISOString()
    const reviewId = makeId("trade_review")
    const anonymousId = getAnonymousId()
    const payload = buildTradeReviewPayload(draft, { reviewId, createdAt })
    const localReview = {
      ...payload,
      id: reviewId,
      reviewId,
      anonymousId,
      createdAt,
    } as TradeReview
    const reviewHeartProofId = makeId("review_heart_proof")
    const nextHeartProof = buildTradeReviewHeartProof({
      heartProofId: reviewHeartProofId,
      anonymousId,
      sourceId: reviewId,
      thoughtType: draft.strongestThought || "none",
      reflectionText: draft.exposedRisk.trim(),
      nextActionText: draft.nextAction.trim(),
      createdAt,
      userId: localReview.userId,
    })
    const result = await syncTradeReviewBinding(payload)

    let completedReview = localReview
    let syncNote = ""

    if (result.ok) {
      const syncedReview = {
        ...localReview,
        ...result.data.review,
        id: result.data.review.id || reviewId,
        reviewId,
        anonymousId,
      } as TradeReview
      completedReview = syncedReview
      setLastReview(syncedReview)
      setLivingStats(result.data.living_mirror_stats)
      setStorage(tradeReviewLastResultStorageKey, syncedReview)
    } else {
      setLastReview(localReview)
      setStorage(tradeReviewLastResultStorageKey, localReview)
      syncNote = `${result.error}。已先保存到本地，server 启动后可再次同步。`
    }

    const tradeReviews = upsertTradeReviewHistory([
      ...(summary?.trade_reviews || []),
      completedReview,
    ])
    const savedHeartProofs = saveHeartProof(nextHeartProof)
    const mirrorReport = loadMirrorReport()
    const derivedBehaviorLoops = deriveBehaviorLoops({
      mirrorReports: mirrorReport ? [mirrorReport] : [],
      dailyGrowthRecords: [],
      heartProofs: savedHeartProofs,
      tradeReviews,
      now: createdAt,
    })
    const behaviorLoops = upsertBehaviorLoops(derivedBehaviorLoops)
    const currentLoop = findCurrentBehaviorLoop({
      behaviorLoops,
      derivedBehaviorLoops,
      reviewId,
      reviewHeartProofId,
    })
    const { assistantHandoffPatch } = recomputeAndSaveGrowthProfile({
      mirrorReports: mirrorReport ? [mirrorReport] : [],
      heartProofs: savedHeartProofs,
      tradeReviews,
      behaviorLoops,
      now: createdAt,
    })
    void assistantHandoffPatch

    setHeartProof(nextHeartProof)
    setLocalTradeReviewCount(tradeReviews.length)
    setCompletionFeedback({
      reviewHeartProofId,
      thoughtLabel: nextHeartProof.thoughtLabel || getTradeReviewThoughtLabel(draft.strongestThought),
      breakAction: currentLoop?.loopBreakAction || stripNextActionPrefix(nextHeartProof.nextActionText),
      loopTitle: currentLoop ? buildLoopTitle(currentLoop) : undefined,
      behaviorLoopId: currentLoop?.behaviorLoopId,
      syncNote,
    })
    setMessage("")
    setIsSubmitting(false)
  }

  async function copyProof() {
    if (!heartProof) return
    await navigator.clipboard.writeText(formatHeartProofForCopy(heartProof))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1300)
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
            <StatusPill>真实交易复盘</StatusPill>
            <h1 className="trade-review-title mt-8 font-story font-light leading-[1.08] tracking-[.08em]">
              真实交易复盘
            </h1>
            <p className="mt-6 max-w-[44rem] font-story text-[1.28rem] font-light leading-10 tracking-[.045em] text-[rgba(242,235,220,.72)]">
              这笔交易，是计划在下单，还是念头在下单？
            </p>
            <p className="mt-5 max-w-[46rem] font-function text-sm leading-7 text-[rgba(220,212,195,.48)]">
              不评价行情，不判断买卖对错，只记录交易行为和当时的一念。
            </p>
          </div>

          <GlassPanel className="trade-review-status-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复盘状态</p>
            <div className="mt-5 grid gap-3">
              <ReviewMeta label="账号" value={userLabel} />
              <ReviewMeta label="数据状态" value={serverState} />
              <ReviewMeta label="复盘记录" value={`${tradeReviewCount} 条`} />
              <ReviewMeta label="复盘心证" value={heartProof ? "已生成" : "待生成"} />
            </div>
          </GlassPanel>
        </section>

        <section className="trade-review-grid mt-6">
          <GlassPanel className="trade-review-form-panel">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">八问复盘</p>
            <div className="mt-5 grid gap-5">
              <ReviewGroup eyebrow="交易前" title="计划与第一念">
                <BooleanChoice
                  label={reviewQuestionPrompts.wasPlanned}
                  value={draft.wasPlanned}
                  yesLabel="在原计划内"
                  noLabel="不在原计划内"
                  onChange={(value) => updateDraft({ wasPlanned: value })}
                />
                <FieldLabel label={reviewQuestionPrompts.strongestThought}>
                  <div className="choice-grid">
                    {thoughtOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn("review-choice", draft.strongestThought === option.value && "is-active")}
                        onClick={() => updateDraft({ strongestThought: option.value })}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </FieldLabel>
                <FieldLabel label={reviewQuestionPrompts.emotionIntensity}>
                  <div className="intensity-row">
                    <input
                      className="review-range"
                      type="range"
                      min="0"
                      max="100"
                      value={draft.emotionIntensity}
                      onChange={(event) => updateDraft({ emotionIntensity: Number(event.target.value) })}
                    />
                    <span>{draft.emotionIntensity}</span>
                  </div>
                </FieldLabel>
              </ReviewGroup>

              <ReviewGroup eyebrow="交易中" title="边界与临盘动作">
                <BooleanChoice
                  label={reviewQuestionPrompts.hadExitRule}
                  value={draft.hadExitRule}
                  yesLabel="提前写过"
                  noLabel="没有写清"
                  onChange={(value) => updateDraft({ hadExitRule: value })}
                />
                <BooleanChoice
                  label={reviewQuestionPrompts.changedPlanDuringTrade}
                  value={draft.changedPlanDuringTrade}
                  yesLabel="临盘改过"
                  noLabel="未临盘改"
                  onChange={(value) => updateDraft({ changedPlanDuringTrade: value })}
                />
              </ReviewGroup>

              <ReviewGroup eyebrow="交易后" title="反应、风险与下一步">
                <FieldLabel label={reviewQuestionPrompts.postTradeReaction}>
                  <div className="choice-grid compact">
                    {postReactionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn("review-choice", draft.postTradeReaction === option.value && "is-active")}
                        onClick={() => updateDraft({ postTradeReaction: option.value })}
                      >
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                  </div>
                </FieldLabel>
                <FieldLabel label={reviewQuestionPrompts.exposedRisk}>
                  <textarea
                    className="review-textarea"
                    value={draft.exposedRisk}
                    placeholder="例如：怕错过、临盘改计划、想问别人、不敢承认边界。"
                    onChange={(event) => updateDraft({ exposedRisk: event.target.value })}
                  />
                </FieldLabel>
                <FieldLabel label={reviewQuestionPrompts.nextAction}>
                  <textarea
                    className="review-textarea"
                    value={draft.nextAction}
                    placeholder="例如：先停十秒，再看是否在原计划内。"
                    onChange={(event) => updateDraft({ nextAction: event.target.value })}
                  />
                </FieldLabel>
              </ReviewGroup>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton className="w-full" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? "正在落档..." : canSubmit ? "生成复盘心证" : "先完成八问"}
              </PrimaryButton>
              <SecondaryButton className="w-full" onClick={() => updateDraft(createEmptyTradeReviewDraft())}>
                清空草稿
              </SecondaryButton>
            </div>
            {completionFeedback ? (
              <ReviewCompletionNotice feedback={completionFeedback} />
            ) : message ? (
              <p className="mt-4 rounded-[8px] border border-[rgba(180,157,93,.18)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(242,235,220,.68)]">
                {message}
              </p>
            ) : null}
          </GlassPanel>

          <aside className="trade-review-side">
            <GlassPanel className="trade-review-options-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">可选信息</p>
              <div className="mt-5 grid gap-3">
                <FieldLabel label="复盘日期">
                  <input
                    className="review-input"
                    type="date"
                    value={draft.tradeDate}
                    onChange={(event) => updateDraft({ tradeDate: event.target.value })}
                  />
                </FieldLabel>
                <FieldLabel label="市场类型">
                  <SegmentedChoice
                    options={marketTypeOptions}
                    value={draft.marketType}
                    onChange={(value) => updateDraft({ marketType: value as TradeReviewMarketType })}
                  />
                </FieldLabel>
                <FieldLabel label="方向">
                  <SegmentedChoice
                    options={directionOptions}
                    value={draft.direction}
                    onChange={(value) => updateDraft({ direction: value as TradeReviewDirection })}
                  />
                </FieldLabel>
                <FieldLabel label="盈亏结果">
                  <SegmentedChoice
                    options={resultOptions}
                    value={draft.resultOptional}
                    onChange={(value) => updateDraft({ resultOptional: value as TradeReviewResultOptional })}
                  />
                </FieldLabel>
              </div>
            </GlassPanel>

            <GlassPanel className="trade-review-upload-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">截图证据</p>
              <label className="mt-5 flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-[rgba(180,157,93,.28)] bg-black/20 p-5 text-center transition hover:border-[rgba(216,183,111,.48)]">
                {draft.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.imageUrl}
                    alt="交易复盘截图预览"
                    className="max-h-[220px] w-full rounded-[8px] object-contain opacity-90"
                  />
                ) : (
                  <span className="font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.76)]">
                    可上传截图
                  </span>
                )}
                <span className="mt-4 font-function text-xs leading-6 text-[rgba(220,212,195,.5)]">
                  第一版只保存截图与自述，不自动识别行情。
                </span>
                <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
              </label>
            </GlassPanel>

            <GlassPanel className="trade-review-mapping-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复盘心证预览</p>
              <h2 className="mt-5 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.92)]">
                {mapping.detectedMirror}
              </h2>
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                心贼显影：{mapping.detectedThieves.length ? mapping.detectedThieves.join(" / ") : "待继续观察"}
              </p>
              <p className="mt-4 font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(242,235,220,.72)]">
                {mapping.proofText}
              </p>
              <p className="mt-4 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
                {mapping.nextActionText}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {mapping.behaviorTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[rgba(180,157,93,.2)] bg-[rgba(180,157,93,.08)] px-3 py-1 font-function text-xs text-[rgba(216,183,111,.86)]">
                    {tag}
                  </span>
                ))}
              </div>
            </GlassPanel>
          </aside>

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
                <p className="mt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">
                  第一念：{latestReview.strongestThought} / 交易后：{getTradeReviewPostReactionLabel(latestReview.postTradeReaction)}
                </p>
              </>
            ) : (
              <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                暂无真实交易复盘。先完成八问，留下一次行为证据。
              </p>
            )}
            <SecondaryLink href="/mirror-archive" className="mt-5 w-full">
              回到心镜档案馆 →
            </SecondaryLink>
          </GlassPanel>

          {heartProof ? (
            <section className="trade-review-heart-proof">
              <HeartProofCard heartProof={heartProof} copied={copied} onCopy={copyProof} />
            </section>
          ) : null}
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

        .trade-review-grid,
        .trade-review-side {
          display: grid;
          gap: 1rem;
        }

        .trade-review-status-card,
        .trade-review-form-panel,
        .trade-review-options-panel,
        .trade-review-upload-panel,
        .trade-review-mapping-panel,
        .trade-review-growth-panel,
        .trade-review-latest-panel,
        .trade-review-heart-proof {
          position: relative;
          overflow: hidden;
        }

        .trade-review-status-card::before,
        .trade-review-form-panel::before,
        .trade-review-options-panel::before,
        .trade-review-upload-panel::before,
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

        .choice-grid {
          display: grid;
          gap: 0.75rem;
        }

        .choice-grid.compact {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .review-choice {
          display: grid;
          gap: 0.36rem;
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0.95rem 1rem;
          text-align: left;
          transition: border-color 220ms ease, background 220ms ease, transform 220ms ease;
        }

        .review-choice:hover,
        .review-choice.is-active {
          border-color: rgba(216, 183, 111, 0.42);
          background:
            radial-gradient(circle at 0% 0%, rgba(216, 183, 111, 0.12), transparent 12rem),
            rgba(180, 157, 93, 0.04);
          transform: translateY(-1px);
        }

        .review-choice strong {
          font-family: var(--font-story);
          font-size: 1.08rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.84);
        }

        .review-choice span {
          font-family: var(--font-function);
          font-size: 0.82rem;
          line-height: 1.65;
          color: rgba(220, 212, 195, 0.5);
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
          min-height: 104px;
          resize: vertical;
          line-height: 1.8;
        }

        .review-input::placeholder,
        .review-textarea::placeholder {
          color: rgba(220, 212, 195, 0.34);
        }

        .intensity-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 72px;
          gap: 1rem;
          align-items: center;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 1rem;
        }

        .intensity-row span {
          font-family: var(--font-story);
          font-size: 2rem;
          font-weight: 300;
          color: rgba(242, 235, 220, 0.82);
          text-align: right;
        }

        .review-range {
          width: 100%;
          accent-color: #d8b76f;
        }

        @media (min-width: 920px) {
          .trade-review-hero {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 0.34fr);
            min-height: min(44vh, 520px);
          }

          .trade-review-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 0.36fr);
            align-items: start;
          }

          .trade-review-form-panel {
            grid-row: span 3;
          }

          .trade-review-heart-proof,
          .trade-review-growth-panel,
          .trade-review-latest-panel {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .trade-review-title {
            font-size: clamp(2.55rem, 12vw, 3.5rem);
            line-height: 1.18;
          }

          .choice-grid.compact {
            grid-template-columns: minmax(0, 1fr);
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

function ReviewGroup({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.02] p-4">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">{eyebrow}</p>
      <h2 className="mt-3 font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.82)]">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  )
}

function ReviewCompletionNotice({ feedback }: { feedback: TradeReviewCompletionFeedback }) {
  return (
    <div className="mt-4 rounded-[8px] border border-[rgba(180,157,93,.2)] bg-[rgba(216,183,111,.045)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">复盘心证已生成</p>
      <p className="mt-3 font-function text-sm leading-7 text-[rgba(242,235,220,.76)]">
        这笔交易照见的是：{feedback.thoughtLabel}
      </p>
      <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
        真正的问题不是行情对错，而是当时哪一念先于规则行动。
      </p>
      <p className="mt-2 font-function text-sm leading-7 text-[rgba(242,235,220,.76)]">
        下一次同场景，只练一个动作：{feedback.breakAction}
      </p>

      {feedback.loopTitle ? (
        <div className="mt-4 rounded-[8px] border border-[rgba(95,132,117,.22)] bg-[rgba(95,132,117,.07)] px-4 py-3">
          <p className="line-clamp-2 font-story text-xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
            循环之镜已显影：{feedback.loopTitle}
          </p>
          <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">
            你可以去查看自己反复出现的触发 → 一念 → 行为 → 结果。
          </p>
          <SecondaryLink href="/cycle-mirror" className="mt-4 w-full">
            查看循环之镜
          </SecondaryLink>
        </div>
      ) : (
        <p className="mt-4 rounded-[8px] border border-[rgba(180,157,93,.12)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
          这条复盘已入档。继续记录真实交易后，系统会识别你的重复循环。
        </p>
      )}

      {feedback.syncNote ? (
        <p className="mt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">{feedback.syncNote}</p>
      ) : null}
      <p className="mt-3 font-function text-[0.68rem] leading-6 tracking-[.04em] text-[rgba(220,212,195,.34)]">
        review_heart_proof_id：{feedback.reviewHeartProofId}
      </p>
    </div>
  )
}

function BooleanChoice({
  label,
  value,
  yesLabel,
  noLabel,
  onChange,
}: {
  label: string
  value: boolean | null
  yesLabel: string
  noLabel: string
  onChange: (value: boolean) => void
}) {
  return (
    <FieldLabel label={label}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={cn("review-choice", value === true && "is-active")} onClick={() => onChange(true)}>
          <strong>{yesLabel}</strong>
        </button>
        <button type="button" className={cn("review-choice", value === false && "is-active")} onClick={() => onChange(false)}>
          <strong>{noLabel}</strong>
        </button>
      </div>
    </FieldLabel>
  )
}

function SegmentedChoice({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-full border border-[rgba(180,157,93,.16)] bg-white/[.025] px-3 py-2 font-function text-xs text-[rgba(220,212,195,.58)] transition hover:border-[rgba(216,183,111,.42)]",
            value === option.value && "border-[rgba(216,183,111,.5)] bg-[rgba(180,157,93,.1)] text-[rgba(242,220,168,.86)]",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
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

function findCurrentBehaviorLoop({
  behaviorLoops,
  derivedBehaviorLoops,
  reviewId,
  reviewHeartProofId,
}: {
  behaviorLoops: BehaviorLoop[]
  derivedBehaviorLoops: BehaviorLoop[]
  reviewId: string
  reviewHeartProofId: string
}) {
  const evidenceKeys = new Set([
    `trade_review:${reviewId}`,
    `heart_proof:${reviewHeartProofId}`,
  ])
  const derivedCurrentLoops = derivedBehaviorLoops.filter((loop) => loopHasAnyEvidence(loop, evidenceKeys))
  const currentSignatures = new Set(derivedCurrentLoops.map((loop) => loop.signature || loop.behaviorLoopId))
  const savedLoops = behaviorLoops.filter((loop) => (
    loopHasAnyEvidence(loop, evidenceKeys) ||
    currentSignatures.has(loop.signature || loop.behaviorLoopId)
  ))

  return [...savedLoops, ...derivedCurrentLoops]
    .sort(sortBehaviorLoopsForFeedback)
    .at(0) || null
}

function loopHasAnyEvidence(loop: BehaviorLoop, evidenceKeys: Set<string>) {
  return [
    ...(loop.evidenceIds || []),
    ...(loop.evidenceSources || []).map((source) => `${source.sourceType}:${source.sourceId}`),
  ].some((key) => evidenceKeys.has(key))
}

function sortBehaviorLoopsForFeedback(left: BehaviorLoop, right: BehaviorLoop) {
  return (
    riskRank(right.riskLevel) - riskRank(left.riskLevel) ||
    Math.max(1, right.repeatCount || 1) - Math.max(1, left.repeatCount || 1) ||
    new Date(right.lastSeenAt || right.updatedAt || right.createdAt).getTime() -
      new Date(left.lastSeenAt || left.updatedAt || left.createdAt).getTime()
  )
}

function buildLoopTitle(loop: BehaviorLoop) {
  return [loop.trigger, loop.thought, loop.action, loop.result]
    .map((part) => compactLoopPart(part))
    .filter(Boolean)
    .join(" → ")
}

function compactLoopPart(value: string) {
  return String(value || "")
    .replace(/[。！？.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function stripNextActionPrefix(value: string) {
  return compactLoopPart(value)
    .replace(/^下一次同场景，只练一个动作[:：]?/, "")
    .replace(/^下一次只练一个动作[:：]?/, "")
    .trim()
}

function riskRank(value: BehaviorLoop["riskLevel"]) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("图片读取失败"))
    reader.readAsDataURL(file)
  })
}
