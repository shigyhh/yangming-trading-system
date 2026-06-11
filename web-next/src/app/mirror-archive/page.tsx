"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import {
  formatArchiveTime,
  loadMirrorArchiveData,
} from "@/features/mirror-archive/archiveEngine"
import type { ArchiveItem, MirrorArchiveData } from "@/features/mirror-archive/archiveTypes"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type { GrowthProfile } from "@/features/living-mirror-growth/growthProfileTypes"
import { LivingMirrorLoopDiagram } from "@/features/reflection-loop/LivingMirrorLoopDiagram"
import {
  buildLivingMirrorLoopInputFromArchive,
  getLivingMirrorLoopStatus,
} from "@/features/reflection-loop/reflectionLoopEngine"

export default function MirrorArchivePage() {
  const [archiveData, setArchiveData] = useState<MirrorArchiveData | null>(null)
  const [growthProfile, setGrowthProfile] = useState<GrowthProfile | null>(null)
  const [behaviorLoops, setBehaviorLoops] = useState<BehaviorLoop[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const growthResult = recomputeAndSaveGrowthProfile()

      setGrowthProfile(growthResult.growthProfile)
      setBehaviorLoops(growthResult.behaviorLoops)
      setArchiveData(loadMirrorArchiveData())
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  if (!loaded || !archiveData) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在整理心镜档案</StatusPill>
      </AssessmentShell>
    )
  }

  const { summary, sections } = archiveData
  const loopNodes = getLivingMirrorLoopStatus(buildLivingMirrorLoopInputFromArchive(archiveData))

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="mirror-archive-page mx-auto w-full max-w-[1440px]">
        <section className="mirror-archive-hero">
          <div>
            <StatusPill>心镜档案 · 归档中心</StatusPill>
            <h1 className="mt-8 font-story text-[clamp(3rem,7.4vw,7rem)] font-light leading-[1.12] tracking-[.08em]">
              心镜档案
            </h1>
            <p className="mt-6 max-w-[42rem] font-story text-xl font-light leading-10 tracking-[.05em] text-[rgba(220,212,195,.62)]">
              报告、心证、修行、复盘、复测，全部归档。
            </p>
            <p className="mt-5 max-w-[46rem] font-function text-sm leading-7 text-[rgba(220,212,195,.48)]">
              日课路线和真实复盘路线的证据都会留在这里；系统底层会把它们送入循环识别，反向生成更针对性的训练。绑定手机号后可长期保存心镜档案；未绑定时，先保存在本设备，不阻断继续训练。
            </p>
          </div>

          <GlassPanel className="mirror-archive-profile">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">当前档案</p>
            <div className="mt-5 grid gap-3">
              <ArchiveMeta label="当前人格" value={summary.currentPersona} />
              <ArchiveMeta label="训练天数" value={`${summary.completedDays} 日`} />
              <ArchiveMeta label="心证数量" value={`${summary.heartProofCount} 枚`} />
              <ArchiveMeta label="最近复测状态" value={summary.retestStatus} />
            </div>
          </GlassPanel>
        </section>

        <section className="mt-6">
          <LivingMirrorLoopDiagram nodes={loopNodes} />
        </section>

        <section className="archive-insight-grid mt-6">
          <GrowthProfileArchiveCard growthProfile={growthProfile} />
          <BehaviorLoopArchiveCard behaviorLoops={behaviorLoops} />
          <RetestArchiveCard growthProfile={growthProfile} />
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <ArchiveStat label="心镜报告数量" value={`${summary.reportCount}`} />
          <ArchiveStat label="成长谱数量" value={`${summary.growthProfileCount}`} />
          <ArchiveStat label="已训练天数" value={`${summary.completedDays}`} />
          <ArchiveStat label="心证数量" value={`${summary.heartProofCount}`} />
          <ArchiveStat label="一念记录数" value={`${summary.oneThoughtRecordCount}`} />
          <ArchiveStat label="真实复盘数量" value={`${summary.tradeReviewCount}`} />
          <ArchiveStat label="循环识别数" value={`${summary.behaviorLoopCount}`} />
        </section>

        <section className="mirror-archive-sections mt-6">
          <ArchiveSection title="我的心镜报告" items={sections.reports} emptyText="完成入照心后，心镜报告会留在这里。" />
          <ArchiveSection title="我的活镜成长谱" items={sections.growthProfiles} emptyText="心镜报告、今日修行、心证、真实复盘和复测变化会汇成成长谱。" />
          <ArchiveSection title="循环识别记录" items={sections.behaviorLoops} emptyText="完成日课或真实交易复盘后，系统底层会识别触发、一念、动作与结果的重复模式。" />
          <ArchiveSection title="我的活镜成长" items={sections.growthRecords} emptyText="完成今日修行后，活镜成长记录会留在这里。" />
          <ArchiveSection title="我的真实复盘" items={sections.tradeReviews} emptyText="完成真实交易复盘后，复盘记录会留在这里。" />
          <ArchiveSection title="我的今日心证" items={sections.heartProofs} emptyText="每日落印或复盘完成后，心证会留在这里。" />
          <ArchiveSection title="我的一念记录" items={sections.oneThoughtRecords} emptyText="完成今日落印后，这一念会按日期留在这里。" />
          <ArchiveSection title="我的复测变化" items={sections.retests} emptyText="完成七日复测后，复测变化会留在这里。" />
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <PrimaryLink href="/mirror-scroll" className="w-full">
            展开心镜长卷 →
          </PrimaryLink>
          <SecondaryLink href="/living-mirror-growth" className="w-full">
            查看成长谱 →
          </SecondaryLink>
          <SecondaryLink href="/trade-review" className="w-full">
            真实交易复盘 →
          </SecondaryLink>
        </div>

        <ComplianceNote>
          本页仅用于汇总交易心理训练、行为复盘与心证记录；不预测行情，不提供买卖建议，不构成任何投资建议。
        </ComplianceNote>
      </div>

      <style jsx>{`
        .mirror-archive-page {
          animation: archive-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-archive-hero {
          display: grid;
          gap: 1.25rem;
          align-items: end;
        }

        .mirror-archive-profile {
          position: relative;
          overflow: hidden;
        }

        .mirror-archive-profile::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.07), transparent 15rem),
            radial-gradient(circle at 86% 10%, rgba(95, 132, 117, 0.07), transparent 15rem);
          pointer-events: none;
        }

        .mirror-archive-sections {
          display: grid;
          gap: 1rem;
        }

        .archive-insight-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }

        @media (min-width: 920px) {
          .mirror-archive-hero {
            grid-template-columns: minmax(0, 1fr) minmax(360px, 0.34fr);
            min-height: min(42vh, 500px);
          }

          .archive-insight-grid {
            grid-template-columns: repeat(3, minmax(240px, 1fr));
          }

          .mirror-archive-sections {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @keyframes archive-in {
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

function ArchiveStat({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">{label}</p>
      <p className="mt-4 font-story text-5xl font-light tracking-[.08em] text-[rgba(242,235,220,.88)]">{value}</p>
    </GlassPanel>
  )
}

function GrowthProfileArchiveCard({ growthProfile }: { growthProfile: GrowthProfile | null }) {
  const topThought = growthProfile?.highFrequencyThoughts[0]?.label || "待照见"

  return (
    <ArchiveInsightCard
      eyebrow="活镜成长谱"
      title="成长摘要可查、可读、可管理"
      href="/living-mirror-growth"
      actionText="查看成长谱"
    >
      <ArchiveMeta label="当前阶段" value={growthProfile?.mirrorLifeStage.label || "未入照"} />
      <ArchiveMeta label="已修行天数" value={`${growthProfile?.trainingContinuity.completedGrowthDays || 0} 日`} />
      <ArchiveMeta label="心证数量" value={`${growthProfile?.heartProofCount || 0} 枚`} />
      <ArchiveMeta label="高频一念" value={topThought} />
      <ArchiveMeta label="下一轮照见重点" value={growthProfile?.nextCycleFocus.nextActionText || "继续完成今日修行"} />
    </ArchiveInsightCard>
  )
}

function BehaviorLoopArchiveCard({ behaviorLoops }: { behaviorLoops: BehaviorLoop[] }) {
  const topLoop = [...behaviorLoops]
    .sort((left, right) => riskRank(right.riskLevel) - riskRank(left.riskLevel) || (right.repeatCount || 1) - (left.repeatCount || 1))
    .at(0)

  return (
    <ArchiveInsightCard
      eyebrow="底层循环识别"
      title="重复动作会反向生成训练"
      href="/trade-review"
      actionText="补真实复盘"
    >
      <ArchiveMeta label="已识别循环数量" value={`${behaviorLoops.length} 条`} />
      <ArchiveMeta label="最高风险循环" value={topLoop ? `${topLoop.trigger} → ${topLoop.thought}` : "循环还未显影"} />
      <ArchiveMeta label="风险等级" value={getRiskLabel(topLoop?.riskLevel)} />
      <ArchiveMeta label="破环动作" value={topLoop?.loopBreakAction || "完成真实交易复盘后开始识别"} />
    </ArchiveInsightCard>
  )
}

function RetestArchiveCard({ growthProfile }: { growthProfile: GrowthProfile | null }) {
  const retestSummary = growthProfile?.retestSummary
  const hasRetest = Boolean(retestSummary?.retestCount)
  const improvedDimensions = retestSummary?.improvedDimensions.map((item) => item.label).slice(0, 3)

  return (
    <ArchiveInsightCard
      eyebrow="复测变化"
      title="变化证明可查、可读、可管理"
      href="/practice-change?preview=1"
      actionText="查看复测变化"
    >
      <ArchiveMeta label="是否已复测" value={hasRetest ? "已复测" : "待复测"} />
      <ArchiveMeta label="已改善维度" value={improvedDimensions?.length ? improvedDimensions.join("、") : "等待七日复照"} />
      <ArchiveMeta label="下一轮重点" value={retestSummary?.nextCycleFocus.nextActionText || growthProfile?.nextCycleFocus.nextActionText || "继续完成今日修行"} />
    </ArchiveInsightCard>
  )
}

function ArchiveInsightCard({
  eyebrow,
  title,
  href,
  actionText,
  children,
}: {
  eyebrow: string
  title: string
  href: string
  actionText: string
  children: ReactNode
}) {
  return (
    <GlassPanel className="archive-insight-card min-w-[240px]">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">{eyebrow}</p>
      <h2 className="mt-4 line-clamp-2 font-story text-3xl font-light leading-[1.35] tracking-[.08em] text-[rgba(242,235,220,.88)]">
        {title}
      </h2>
      <div className="mt-5 grid gap-3">{children}</div>
      <SecondaryLink href={href} className="mt-5 w-full">
        {actionText} →
      </SecondaryLink>
    </GlassPanel>
  )
}

function getRiskLabel(riskLevel?: BehaviorLoop["riskLevel"]) {
  if (riskLevel === "high") return "高"
  if (riskLevel === "medium") return "中"
  if (riskLevel === "low") return "低"
  return "待分级"
}

function riskRank(value?: BehaviorLoop["riskLevel"]) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}

function ArchiveSection({ title, items, emptyText }: { title: string; items: ArchiveItem[]; emptyText: string }) {
  return (
    <GlassPanel className="archive-section">
      <div className="flex items-center justify-between gap-4">
        <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">{title}</p>
        <span className="font-function text-xs tracking-[.12em] text-[rgba(220,212,195,.42)]">{items.length} 条</span>
      </div>
      {items.length ? (
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <ArchiveRecordCard key={item.archiveItemId} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">
          {emptyText}
        </p>
      )}
    </GlassPanel>
  )
}

function ArchiveRecordCard({ item }: { item: ArchiveItem }) {
  const href = item.detailHref || "/mirror-archive"

  return (
    <Link href={href} className="block rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3 transition hover:border-[rgba(216,183,111,.36)] hover:bg-white/[.04]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-story text-xl font-light tracking-[.06em] text-[rgba(242,235,220,.82)]">{item.title}</h2>
          <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">{item.summary}</p>
        </div>
        <time className="shrink-0 font-function text-xs leading-6 text-[rgba(180,157,93,.62)]">{formatArchiveTime(item.createdAt)}</time>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={`${item.archiveItemId}-${tag}`} className="rounded-full border border-[rgba(180,157,93,.18)] bg-[rgba(180,157,93,.07)] px-3 py-1 font-function text-xs text-[rgba(216,183,111,.78)]">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  )
}

function ArchiveMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="min-w-0 break-words text-left font-function text-sm text-[rgba(242,235,220,.72)] sm:text-right">{value}</span>
    </div>
  )
}
