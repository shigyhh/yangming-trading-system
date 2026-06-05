"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import {
  dispatchTrainingPrescriptionBinding,
  fetchDataBindingSummary,
  type DataBindingSummaryResponse,
} from "@/features/data-binding/api-client"
import type { DataBindingKLineRecord } from "@yangming/contracts/data-binding"
import type { LivingMirrorProfile, TradeReview, TrainingPrescriptionDispatch } from "@yangming/contracts/living-mirror"

const complianceText = "本中枢仅用于交易心理觉察、复盘训练与行为管理，不预测行情，不构成投资建议。"

export default function LivingMirrorCenterPage() {
  const [summary, setSummary] = useState<DataBindingSummaryResponse | null>(null)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDataBindingSummary().then((result) => {
        if (result.ok) {
          setSummary(result.data)
          setError("")
        } else {
          setError(result.error)
        }
        setLoaded(true)
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const profile = summary?.living_mirror_profile || null
  const tradeReviews = useMemo(() => (summary?.trade_reviews || []).slice().reverse(), [summary])
  const klineRecords = useMemo(() => (summary?.kline_records || []).slice().reverse(), [summary])
  const assistant = summary?.assistant_summary || null
  const zhixing = summary?.living_mirror_stats?.zhixingStability || null
  const prescription = summary?.training_prescription || null

  async function handleDispatchPrescription() {
    setIsDispatching(true)
    setDispatchMessage("")
    const result = await dispatchTrainingPrescriptionBinding()
    setIsDispatching(false)

    if (!result.ok) {
      setDispatchMessage(result.error)
      return
    }

    setSummary((current) => current
      ? {
          ...current,
          training_prescription: result.data.training_prescription,
          living_mirror_profile: result.data.living_mirror_profile || current.living_mirror_profile,
          admin_user: result.data.admin_user || current.admin_user,
        }
      : current)
    setDispatchMessage("已下发到小程序，学员可在活镜页接收今日训练。")
  }

  if (!loaded) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在读取活镜中枢</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="mirror-center-page mx-auto w-full max-w-[1440px]">
        <section className="mirror-center-hero">
          <div className="min-w-0">
            <StatusPill>活镜中枢 · 跨端总览</StatusPill>
            <h1 className="mt-7 font-story text-[clamp(2.8rem,6.8vw,6.8rem)] font-light leading-[1.1] tracking-[.08em] text-[rgba(244,235,221,.94)]">
              活镜中枢
            </h1>
            <p className="mt-5 max-w-[48rem] font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.64)]">
              网页看总览，小程序采集每日真实记录。同一个 userId 下，测评、盲练与真实复盘会合成同一份活镜画像。
            </p>
          </div>

          <GlassPanel className="mirror-center-stage-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">当前主镜</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
              {profile?.currentMainMirror || "待照见"}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {profile?.trainingFocus || "完成九镜测评、K线盲练或一次真实复盘后，这里会出现主修方向。"}
            </p>
          </GlassPanel>
        </section>

        {error ? (
          <GlassPanel className="mt-5">
            <p className="font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">连接未完成</p>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {error}。本地记录不会因此丢失，可以稍后重试，或先继续完成真实复盘。
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SecondaryLink href="/trade-review" className="w-full">
                继续真实复盘
              </SecondaryLink>
              <SecondaryLink href="/assessment-result?preview=1" className="w-full">
                返回心镜报告
              </SecondaryLink>
            </div>
          </GlassPanel>
        ) : null}

        <section className="mirror-center-grid mt-6">
          <OverviewPanel profile={profile} zhixingText={zhixing ? `${zhixing.totalText || zhixing.total} · ${zhixing.level}` : "待生成"} />
          <TripleReflectionPanel profile={profile} />
          <PrescriptionDispatchPanel
            prescription={prescription}
            isDispatching={isDispatching}
            message={dispatchMessage}
            onDispatch={handleDispatchPrescription}
          />
          <TradeReviewLibrary reviews={tradeReviews} />
          <KLineLab records={klineRecords} />
          <AssistantWorkbench assistant={assistant} />
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <PrimaryLink href="/trade-review" className="w-full">
            上传真实记录
          </PrimaryLink>
          <SecondaryLink href="/practice-change?preview=1" className="w-full">
            继续今日修行
          </SecondaryLink>
          <SecondaryLink href="/living-mirror-growth" className="w-full">
            查看成长谱
          </SecondaryLink>
          <SecondaryLink href="/mirror-archive" className="w-full">
            回到档案馆
          </SecondaryLink>
        </div>

        <ComplianceNote>{profile?.complianceNotice || complianceText}</ComplianceNote>
      </div>

      <style jsx>{`
        .mirror-center-page {
          animation: mirror-center-in 840ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-center-hero {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }

        .mirror-center-stage-card,
        .mirror-center-panel {
          position: relative;
          overflow: hidden;
        }

        .mirror-center-stage-card::before,
        .mirror-center-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(216, 183, 111, 0.075), transparent 13rem),
            radial-gradient(circle at 88% 92%, rgba(95, 132, 117, 0.07), transparent 15rem),
            linear-gradient(135deg, rgba(244, 235, 221, 0.022), transparent 45%);
        }

        .mirror-center-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }

        @media (min-width: 920px) {
          .mirror-center-hero {
            grid-template-columns: minmax(0, 1fr) minmax(320px, 0.36fr);
          }

          .mirror-center-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
          }
        }

        @keyframes mirror-center-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px);
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

function OverviewPanel({ profile, zhixingText }: { profile: LivingMirrorProfile | null; zhixingText: string }) {
  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="活镜总览" title={profile?.currentStage || "待入镜"} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CenterMetric label="九镜测评" value={`${profile?.sourceCounts.assessment || 0}`} />
        <CenterMetric label="K线盲练" value={`${profile?.sourceCounts.klineBlind || 0}`} />
        <CenterMetric label="真实复盘" value={`${profile?.sourceCounts.tradeReview || 0}`} />
        <CenterMetric label="知行稳定度" value={zhixingText} />
      </div>
      <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        {profile?.trainingFocus || "先留下第一条真实记录，活镜中枢会开始形成训练方向。"}
      </p>
    </CenterPanel>
  )
}

function TripleReflectionPanel({ profile }: { profile: LivingMirrorProfile | null }) {
  const triple = profile?.tripleReflection || null

  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="三证互照" title={triple?.evidenceLevelText || triple?.stateLabel || "待补全"} />
      {triple?.unifiedConclusion ? (
        <p className="mt-4 font-story text-3xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
          {triple.unifiedConclusion}
        </p>
      ) : null}
      {triple?.proofLine ? (
        <p className="mt-3 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.66)]">
          {triple.proofLine}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(triple?.rows || [
          { key: "assessment", name: "九镜测评", mirror: "待照见", statusText: "待测评" },
          { key: "kline", name: "K线盲练", mirror: "待照见", statusText: "待训练" },
          { key: "trade", name: "真实复盘", mirror: "待照见", statusText: "待复盘" },
        ]).map((row) => (
          <div key={row.key} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
            <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{row.name}</p>
            <p className="mt-3 line-clamp-2 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
              {row.mirror}
            </p>
            <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.48)]">{row.statusText}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">
        {triple?.conclusion || "先完成测评、一次K线盲练或一条真实复盘，三路会开始互相校准。"}
      </p>
      {triple?.nextCalibration ? (
        <p className="mt-3 font-function text-sm leading-7 text-[rgba(216,183,111,.7)]">
          {triple.nextCalibration}
        </p>
      ) : null}
    </CenterPanel>
  )
}

function PrescriptionDispatchPanel({
  prescription,
  isDispatching,
  message,
  onDispatch,
}: {
  prescription: TrainingPrescriptionDispatch | null
  isDispatching: boolean
  message: string
  onDispatch: () => void
}) {
  return (
    <CenterPanel className="lg:col-span-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.34fr)] lg:items-end">
        <div>
          <PanelHeader eyebrow="训练处方下发" title={prescription?.title || "等待活镜生成今日训练"} />
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
            {prescription?.reason || "完成九镜测评、K线盲练或真实复盘后，中枢服务会生成同一份今日训练，小程序接收后写入今日陪跑。"}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CenterMetric label="处方状态" value={prescriptionStatusText(prescription?.status || "")} />
            <CenterMetric label="主修镜" value={prescription?.mirror || "待照见"} />
            <CenterMetric label="训练日" value={prescription ? `Day ${prescription.day}` : "待生成"} />
          </div>
          {prescription?.action ? (
            <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.66)]">
              今日动作：{prescription.action}
            </p>
          ) : null}
          {prescription?.klinePractice ? (
            <p className="mt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.48)]">
              K线观心：{prescription.klinePractice.marketKey} · {prescription.klinePractice.timeframeKey} · {prescription.klinePractice.reason}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3">
          <PrimaryButton className="w-full" disabled={!prescription || isDispatching} onClick={onDispatch}>
            {isDispatching ? "正在下发" : "下发到小程序"}
          </PrimaryButton>
          <p className="min-h-6 text-center font-function text-xs leading-6 text-[rgba(216,183,111,.66)]">
            {message || "小程序接收后，会覆盖今日训练入口。"}
          </p>
        </div>
      </div>
    </CenterPanel>
  )
}

function TradeReviewLibrary({ reviews }: { reviews: TradeReview[] }) {
  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="活镜证据链 · 真实记录库" title={`${reviews.length} 条真实复盘`} />
      <div className="mt-5 grid gap-3">
        {reviews.length ? (
          reviews.slice(0, 4).map((review) => <TradeReviewRow key={review.id} review={review} />)
        ) : (
          <EmptyText>小程序或网页完成一次真实复盘后，这里会出现同一条记录。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function KLineLab({ records }: { records: DataBindingKLineRecord[] }) {
  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="盲练实验室" title={`${records.length} 次K线观心`} />
      <div className="mt-5 grid gap-3">
        {records.length ? (
          records.slice(0, 3).map((record, index) => (
            <div key={`${record.scene}-${record.recordedAt || index}`} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">
                Day {record.day || index + 1}
              </p>
              <p className="mt-3 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">{record.scene}</p>
              <p className="mt-3 line-clamp-2 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">{record.reaction}</p>
            </div>
          ))
        ) : (
          <EmptyText>完成一次历史K线盲练后，这里会成为压力反应的对照样本。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function AssistantWorkbench({ assistant }: { assistant: DataBindingSummaryResponse["assistant_summary"] }) {
  return (
    <CenterPanel className="lg:col-span-12">
      <PanelHeader eyebrow="助教工作台" title={assistant?.priority || "待生成照见摘要"} />
      {assistant ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <CenterMetric label="当前主型" value={assistant.primaryType} />
          <CenterMetric label="高频风险" value={assistant.riskLabel} />
          <CenterMetric label="训练承接" value={assistant.trainingCamp} />
          <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4 md:col-span-3">
            <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">助教话术</p>
            <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">{assistant.script}</p>
          </div>
        </div>
      ) : (
        <EmptyText>完成测评与一次真实复盘后，系统会生成助教承接摘要，方便继续陪跑。</EmptyText>
      )}
    </CenterPanel>
  )
}

function TradeReviewRow({ review }: { review: TradeReview }) {
  const context = review.marketContext
  const statusSteps = review.crossEndStatusSteps || []

  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">
            {review.tradeDate || "未填日期"} · {context?.marketLabel || review.marketType || "市场待确认"}
          </p>
          <h3 className="mt-3 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
            {review.detectedMirror}
          </h3>
        </div>
        <span className="rounded-full border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.07)] px-3 py-1 font-function text-xs text-[rgba(180,214,194,.7)]">
          {review.crossEndStatusText || contextStatusText(context?.status || "")}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">{review.reviewText}</p>
      <p className="mt-3 line-clamp-2 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">
        当时位置：{context?.positionLabel || "待历史数据载入后回看"}
      </p>
      <p className="mt-2 font-function text-[11px] leading-5 text-[rgba(220,212,195,.34)]">
        记录编号：{review.reviewId || review.id}
      </p>
      {statusSteps.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {statusSteps.map((step) => (
            <span
              key={step.key}
              className={`rounded-full border px-3 py-1 font-function text-[11px] leading-5 ${
                step.current
                  ? "border-[rgba(216,183,111,.28)] bg-[rgba(216,183,111,.075)] text-[rgba(216,183,111,.82)]"
                  : step.done
                    ? "border-[rgba(95,132,117,.2)] bg-[rgba(95,132,117,.06)] text-[rgba(180,214,194,.72)]"
                    : "border-[rgba(217,189,122,.08)] bg-white/[.02] text-[rgba(220,212,195,.36)]"
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CenterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <GlassPanel className={`mirror-center-panel min-w-[240px] ${className || ""}`}>{children}</GlassPanel>
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">{eyebrow}</p>
      <h2 className="mt-3 line-clamp-2 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
        {title}
      </h2>
    </div>
  )
}

function CenterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-4">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{label}</p>
      <p className="mt-3 line-clamp-2 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">{value}</p>
    </div>
  )
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] px-4 py-4 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">
      {children}
    </p>
  )
}

function contextStatusText(status: string) {
  if (status === "ready") return "历史回看已载入"
  if (status === "missing_cache") return "等待历史缓存"
  if (status === "missing_symbol") return "待补充标的"
  if (status === "failed") return "回看待重试"
  return "手动复盘"
}

function prescriptionStatusText(status: string) {
  if (status === "dispatched") return "已下发"
  if (status === "received") return "已接收"
  if (status === "ready") return "待下发"
  return "待生成"
}
