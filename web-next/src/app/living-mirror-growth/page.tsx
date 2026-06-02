"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type {
  GrowthProfile,
  GrowthProfileAffectedDimension,
  GrowthProfileRepeatedBehavior,
  GrowthProfileThought,
} from "@/features/living-mirror-growth/growthProfileTypes"

const complianceText = "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。"

export default function LivingMirrorGrowthPage() {
  const [profile, setProfile] = useState<GrowthProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(recomputeAndSaveGrowthProfile().growthProfile)
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const missingTradeReview = useMemo(
    () => profile?.dataGaps.find((gap) => gap.type === "missing_trade_review") || null,
    [profile],
  )

  if (!loaded || !profile) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在读取活镜成长谱</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="growth-page mx-auto w-full max-w-[1320px]">
        <section className="growth-hero">
          <div className="min-w-0">
            <StatusPill>活镜成长谱</StatusPill>
            <h1 className="mt-7 font-story text-[clamp(2.6rem,6vw,5.8rem)] font-light leading-[1.12] tracking-[.08em] text-[rgba(244,235,221,.94)]">
              活镜成长谱
            </h1>
            <p className="mt-5 max-w-[46rem] font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.64)]">
              把每天的一念、复盘和心证，连成可见的变化。
            </p>
          </div>

          <GlassPanel className="growth-stage-panel min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">当前阶段</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
              {profile.mirrorLifeStage.label}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {profile.mirrorLifeStage.description}
            </p>
          </GlassPanel>
        </section>

        <section className="mt-6">
          <GlassPanel className="growth-summary-card">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">成长摘要</p>
                <h2 className="mt-3 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  今日照见概览
                </h2>
              </div>
              <p className="font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
                {profile.growth_profile_id.replace("growth_profile_", "growth_")}
              </p>
            </div>
            <div className="growth-summary-grid mt-5">
              <SummaryMetric label="已修行" value={`${profile.trainingContinuity.completedGrowthDays} 日`} />
              <SummaryMetric label="已生成" value={`${profile.heartProofCount} 枚心证`} />
              <SummaryMetric label="真实复盘" value={`${profile.tradeReviewCount} 次`} />
              <SummaryMetric label="训练连续性" value={`${profile.trainingContinuity.trainingConsistencyScore}%`} />
              <SummaryMetric label="当前阶段" value={profile.mirrorLifeStage.label} />
            </div>
          </GlassPanel>
        </section>

        <section className="growth-grid mt-5">
          <InsightSection
            eyebrow="高频一念"
            title="反复浮现的念头"
            isEmpty={!profile.highFrequencyThoughts.length}
            emptyText="完成今日修行后，这里会出现你的第一条高频一念。"
          >
            <ThoughtList thoughts={profile.highFrequencyThoughts.slice(0, 3)} />
          </InsightSection>

          <InsightSection
            eyebrow="重复行为"
            title="从复盘里照见循环"
            isEmpty={!profile.repeatedBehaviors.length}
            emptyText={missingTradeReview?.message || "真实复盘累积后，这里会出现重复行为。"}
          >
            <BehaviorList behaviors={profile.repeatedBehaviors.slice(0, 3)} />
          </InsightSection>

          <InsightSection
            eyebrow="影响维度"
            title="最常被牵动的地方"
            isEmpty={!profile.affectedDimensions.length}
            emptyText="心证和复盘累积后，这里会出现被牵动最深的维度。"
          >
            <DimensionList dimensions={profile.affectedDimensions.slice(0, 5)} />
          </InsightSection>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <GlassPanel className="growth-focus-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">下一轮照见重点</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light leading-tight tracking-[.06em] text-[rgba(244,235,221,.9)]">
              {profile.nextCycleFocus.title}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">
              {profile.nextCycleFocus.reason}
            </p>
            <div className="mt-5 rounded-[8px] border border-[rgba(217,189,122,.13)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.72)]">下一步动作</p>
              <p className="mt-3 line-clamp-3 font-function text-sm leading-7 text-[rgba(244,235,221,.78)]">
                {profile.nextCycleFocus.nextActionText}
              </p>
            </div>
            <TagRow labels={profile.nextCycleFocus.relatedDimensions} />
          </GlassPanel>

          <GlassPanel className="growth-loop-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">相关循环入口</p>
            {profile.topBehaviorLoopIds.length ? (
              <>
                <h2 className="mt-4 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  已识别 {profile.topBehaviorLoopIds.length} 条循环
                </h2>
                <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                  系统已经从真实复盘和心证中提炼出重复模式，可以进入循环之镜查看触发、一念、行为和破环动作。
                </p>
                <PrimaryLink href="/cycle-mirror" className="mt-6 w-full">
                  查看循环之镜
                </PrimaryLink>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  循环尚未成形
                </h2>
                <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                  完成 1 次真实交易复盘后，系统会开始识别你的重复循环。
                </p>
                <SecondaryLink href="/trade-review" className="mt-6 w-full">
                  进入真实复盘
                </SecondaryLink>
              </>
            )}
          </GlassPanel>
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SecondaryLink href="/practice-change?preview=1" className="w-full">
            继续今日修行
          </SecondaryLink>
          <SecondaryLink href="/mirror-archive" className="w-full">
            回到心镜档案馆
          </SecondaryLink>
          <SecondaryLink href="/mirror-scroll" className="w-full">
            查看心镜长卷
          </SecondaryLink>
        </div>

        <ComplianceNote>{complianceText}</ComplianceNote>
      </div>

      <style jsx>{`
        .growth-page {
          animation: growth-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .growth-hero {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }

        .growth-stage-panel,
        .growth-summary-card,
        .growth-focus-card,
        .growth-loop-card {
          position: relative;
          overflow: hidden;
        }

        .growth-stage-panel::before,
        .growth-summary-card::before,
        .growth-focus-card::before,
        .growth-loop-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(216, 183, 111, 0.08), transparent 13rem),
            radial-gradient(circle at 88% 92%, rgba(95, 132, 117, 0.08), transparent 15rem),
            linear-gradient(135deg, rgba(244, 235, 221, 0.025), transparent 45%);
        }

        .growth-summary-grid,
        .growth-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0.9rem;
        }

        @media (min-width: 980px) {
          .growth-hero {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.38fr);
          }
        }

        @keyframes growth-page-in {
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[240px] rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-4">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{label}</p>
      <p className="mt-3 line-clamp-2 font-story text-3xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
        {value}
      </p>
    </div>
  )
}

function InsightSection({
  eyebrow,
  title,
  isEmpty,
  emptyText,
  children,
}: {
  eyebrow: string
  title: string
  isEmpty: boolean
  emptyText: string
  children: ReactNode
}) {
  return (
    <GlassPanel className="min-w-[240px]">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">{eyebrow}</p>
      <h2 className="mt-4 line-clamp-2 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
        {title}
      </h2>
      <div className="mt-5">
        {isEmpty ? (
          <p className="line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </GlassPanel>
  )
}

function ThoughtList({ thoughts }: { thoughts: GrowthProfileThought[] }) {
  if (!thoughts.length) return null

  return (
    <div className="grid gap-3">
      {thoughts.map((thought) => (
        <div key={thought.thoughtType} className="flex items-center justify-between gap-4 rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
          <span className="min-w-0 line-clamp-2 font-function text-sm text-[rgba(244,235,221,.78)]">{thought.label}</span>
          <span className="shrink-0 rounded-full border border-[rgba(216,183,111,.16)] px-2.5 py-1 font-function text-xs text-[rgba(216,183,111,.78)]">
            出现 {thought.count} 次
          </span>
        </div>
      ))}
    </div>
  )
}

function BehaviorList({ behaviors }: { behaviors: GrowthProfileRepeatedBehavior[] }) {
  if (!behaviors.length) return null

  return (
    <div className="grid gap-3">
      {behaviors.map((behavior) => (
        <div key={behavior.behaviorType} className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
          <p className="line-clamp-2 font-function text-sm leading-6 text-[rgba(244,235,221,.78)]">{behavior.label}</p>
        </div>
      ))}
    </div>
  )
}

function DimensionList({ dimensions }: { dimensions: GrowthProfileAffectedDimension[] }) {
  if (!dimensions.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {dimensions.map((dimension) => (
        <span key={dimension.label} className="max-w-full rounded-full border border-[rgba(217,189,122,.14)] bg-[rgba(216,183,111,.055)] px-3 py-2 font-function text-xs leading-5 text-[rgba(244,235,221,.76)]">
          {dimension.label}
        </span>
      ))}
    </div>
  )
}

function TagRow({ labels }: { labels: string[] }) {
  if (!labels.length) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.08)] px-3 py-2 font-function text-xs text-[rgba(220,212,195,.7)]">
          {label}
        </span>
      ))}
    </div>
  )
}
