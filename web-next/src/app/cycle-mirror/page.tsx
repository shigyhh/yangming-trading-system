"use client"

import { useEffect, useMemo, useState } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { getBehaviorLoopsForUser, loadBehaviorLoops } from "@/features/living-mirror-growth/behaviorLoopStorage"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"

const complianceText = "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。"

export default function CycleMirrorPage() {
  const [loops, setLoops] = useState<BehaviorLoop[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const buildResult = recomputeAndSaveGrowthProfile()
      const ownerId = buildResult.growthProfile.userId || buildResult.growthProfile.anonymousId
      const userLoops = ownerId ? getBehaviorLoopsForUser(ownerId) : []
      const storageLoops = userLoops.length ? userLoops : loadBehaviorLoops()

      setLoops([...storageLoops].sort(sortBehaviorLoops))
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const topLoops = useMemo(() => loops.slice(0, 9), [loops])

  if (!loaded) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在照见循环之镜</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="cycle-page mx-auto w-full max-w-[1320px]">
        <section className="cycle-hero">
          <div className="min-w-0">
            <StatusPill>循环之镜</StatusPill>
            <h1 className="mt-7 font-story text-[clamp(2.6rem,6vw,5.8rem)] font-light leading-[1.12] tracking-[.08em] text-[rgba(244,235,221,.94)]">
              循环之镜
            </h1>
            <p className="mt-5 max-w-[46rem] font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.64)]">
              照见你为何反复在同一个地方失守。
            </p>
          </div>

          <GlassPanel className="cycle-summary-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">已显影循环</p>
            <p className="mt-4 font-story text-5xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
              {loops.length}
            </p>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              循环只描述行为模式，不显示个股、买卖点或收益判断。
            </p>
          </GlassPanel>
        </section>

        {topLoops.length ? (
          <section className="cycle-grid mt-6">
            {topLoops.map((loop) => (
              <BehaviorLoopCard key={loop.behaviorLoopId || loop.id} loop={loop} />
            ))}
          </section>
        ) : (
          <GlassPanel className="cycle-empty mt-6 min-w-[240px]">
            <div className="max-w-[42rem]">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">空状态</p>
              <h2 className="mt-4 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
                循环还未显影
              </h2>
              <p className="mt-5 font-function text-sm leading-7 tracking-[.03em] text-[rgba(220,212,195,.6)]">
                完成至少一次真实交易复盘，或连续记录同一念头后，系统会开始识别你的重复循环。
              </p>
              <PrimaryLink href="/trade-review" className="mt-7 w-full sm:w-auto">
                去做真实交易复盘
              </PrimaryLink>
            </div>
          </GlassPanel>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SecondaryLink href="/living-mirror-growth" className="w-full">
            回到活镜成长谱
          </SecondaryLink>
          <SecondaryLink href="/trade-review" className="w-full">
            继续真实复盘
          </SecondaryLink>
          <SecondaryLink href="/mirror-archive" className="w-full">
            查看心镜档案
          </SecondaryLink>
        </div>

        <ComplianceNote>{complianceText}</ComplianceNote>
      </div>

      <style jsx>{`
        .cycle-page {
          animation: cycle-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .cycle-hero {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }

        .cycle-summary-card,
        .cycle-empty {
          position: relative;
          overflow: hidden;
        }

        .cycle-summary-card::before,
        .cycle-empty::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(216, 183, 111, 0.08), transparent 13rem),
            radial-gradient(circle at 88% 92%, rgba(95, 132, 117, 0.08), transparent 15rem),
            linear-gradient(135deg, rgba(244, 235, 221, 0.025), transparent 45%);
        }

        .cycle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        @media (min-width: 980px) {
          .cycle-hero {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.34fr);
          }
        }

        @keyframes cycle-page-in {
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

function BehaviorLoopCard({ loop }: { loop: BehaviorLoop }) {
  return (
    <GlassPanel className="cycle-loop-card min-w-[240px]">
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">行为循环</p>
          <RiskBadge riskLevel={loop.riskLevel} />
        </div>
        <h2 className="mt-4 line-clamp-3 font-story text-3xl font-light leading-tight tracking-[.06em] text-[rgba(244,235,221,.9)]">
          {buildLoopName(loop)}
        </h2>

        <div className="mt-5 grid gap-3">
          <LoopStep label="触发" value={loop.trigger} />
          <LoopStep label="一念" value={loop.thought} />
          <LoopStep label="行为" value={loop.action} />
          <LoopStep label="结果" value={loop.result} />
          <LoopStep label="自我解释" value={loop.selfStory} />
          <LoopStep label="破环动作" value={loop.loopBreakAction} strong />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EvidenceMetric label="重复次数" value={`${Math.max(1, loop.repeatCount || 1)} 次`} />
          <EvidenceMetric label="风险等级" value={getRiskText(loop.riskLevel)} />
          <EvidenceMetric label="置信度" value={formatConfidence(loop.confidence)} />
          <EvidenceMetric label="最近出现" value={formatDateTime(loop.lastSeenAt || loop.updatedAt)} />
          <EvidenceMetric label="首次出现" value={formatDateTime(loop.firstSeenAt || loop.createdAt)} />
        </div>

        <div className="mt-5">
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">影响维度</p>
          <TagRow labels={loop.affectedDimensions} />
        </div>
      </div>

      <style jsx>{`
        .cycle-loop-card {
          position: relative;
          overflow: hidden;
        }

        .cycle-loop-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 10% 0%, rgba(216, 183, 111, 0.085), transparent 12rem),
            radial-gradient(circle at 92% 100%, rgba(95, 132, 117, 0.08), transparent 13rem),
            linear-gradient(135deg, rgba(255, 255, 255, 0.025), transparent 48%);
        }
      `}</style>
    </GlassPanel>
  )
}

function LoopStep({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
      <p className="font-function text-[0.68rem] font-semibold tracking-[.16em] text-[rgba(216,183,111,.72)]">{label}</p>
      <p className={`mt-2 line-clamp-3 font-function text-sm leading-7 ${strong ? "text-[rgba(244,235,221,.84)]" : "text-[rgba(220,212,195,.62)]"}`}>
        {value || "待补全"}
      </p>
    </div>
  )
}

function EvidenceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[rgba(217,189,122,.1)] bg-black/10 px-4 py-3">
      <p className="font-function text-[0.68rem] font-semibold tracking-[.14em] text-[rgba(216,183,111,.68)]">{label}</p>
      <p className="mt-2 line-clamp-2 font-function text-sm leading-6 text-[rgba(244,235,221,.76)]">{value}</p>
    </div>
  )
}

function RiskBadge({ riskLevel }: { riskLevel?: BehaviorLoop["riskLevel"] }) {
  return (
    <span className={`rounded-full border px-3 py-1 font-function text-xs tracking-[.1em] ${getRiskClassName(riskLevel)}`}>
      {getRiskText(riskLevel)}
    </span>
  )
}

function TagRow({ labels }: { labels: string[] }) {
  if (!labels.length) {
    return <p className="mt-3 font-function text-sm text-[rgba(220,212,195,.44)]">影响维度待更多证据沉淀。</p>
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className="max-w-full rounded-full border border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.08)] px-3 py-2 font-function text-xs leading-5 text-[rgba(220,212,195,.72)]">
          {label}
        </span>
      ))}
    </div>
  )
}

function sortBehaviorLoops(left: BehaviorLoop, right: BehaviorLoop) {
  return (
    riskRank(right.riskLevel) - riskRank(left.riskLevel) ||
    Math.max(1, right.repeatCount || 1) - Math.max(1, left.repeatCount || 1) ||
    new Date(right.lastSeenAt || right.updatedAt || right.createdAt).getTime() -
      new Date(left.lastSeenAt || left.updatedAt || left.createdAt).getTime()
  )
}

function buildLoopName(loop: BehaviorLoop) {
  return [loop.trigger, loop.thought, loop.action, loop.result]
    .map((part) => compactPart(part))
    .filter(Boolean)
    .join(" → ")
}

function compactPart(value: string) {
  return String(value || "")
    .replace(/[。！？.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function formatConfidence(confidence: number | undefined) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) return "待沉淀"
  const normalized = confidence <= 1 ? confidence * 100 : confidence
  return `${Math.round(Math.max(0, Math.min(100, normalized)))}%`
}

function formatDateTime(value: string | undefined) {
  if (!value) return "待沉淀"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "待沉淀"

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getRiskText(riskLevel: BehaviorLoop["riskLevel"]) {
  if (riskLevel === "high") return "高"
  if (riskLevel === "medium") return "中"
  if (riskLevel === "low") return "低"
  return "待分级"
}

function getRiskClassName(riskLevel: BehaviorLoop["riskLevel"]) {
  if (riskLevel === "high") return "border-[rgba(120,60,45,.46)] bg-[rgba(120,60,45,.16)] text-[rgba(244,205,188,.9)]"
  if (riskLevel === "medium") return "border-[rgba(216,183,111,.26)] bg-[rgba(216,183,111,.1)] text-[rgba(216,183,111,.9)]"
  return "border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.08)] text-[rgba(220,212,195,.72)]"
}

function riskRank(value: BehaviorLoop["riskLevel"]) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}
