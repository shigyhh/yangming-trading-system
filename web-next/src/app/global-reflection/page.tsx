"use client"

import { AssessmentShell, ComplianceNote, GlassPanel, PrimaryLink, SecondaryLink, StatusPill } from "@/features/assessment/components"

const reflectionSignals = [
  ["怕错过", "正在牵动最多人的第一念。"],
  ["不甘心", "亏损后最容易变成证明。"],
  ["再等等", "常常藏在扛单与犹豫之间。"],
]

export default function GlobalReflectionPage() {
  return (
    <AssessmentShell className="py-5">
      <div className="global-reflection flex flex-col">
        <StatusPill>全球照见层 · 预览</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(2.35rem,10.5vw,3.65rem)] font-light leading-[1.32] tracking-[.1em]">
          不是只有你，
          <br />
          会被那一念牵动。
        </h1>
        <p className="mt-6 font-story text-[1.08rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
          未来这里会汇聚全球交易者匿名落下的一念。
          <br />
          不比较，不评判，只共同照见。
        </p>

        <GlassPanel className="mt-8">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日共修长卷</p>
          <div className="mt-5 grid gap-4">
            {reflectionSignals.map(([title, note]) => (
              <div key={title} className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-4">
                <p className="font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.82)]">{title}</p>
                <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">{note}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">后续预留</p>
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
            今日一念投票、匿名人格镜像、全球人格热力图、分享心证卡片会在这里逐步展开。它不是论坛，也不是聊天社区，而是一层全球共修的照见记录。
          </p>
        </GlassPanel>

        <div className="mt-6 grid gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <PrimaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </PrimaryLink>
          <SecondaryLink href="/" className="w-full">
            回到心性长卷
          </SecondaryLink>
        </div>

        <ComplianceNote>
          全球照见层仅用于匿名交易心理观察与风险教育；不构成投资建议，不荐股，不喊单，不承诺收益。
        </ComplianceNote>
      </div>
      <style jsx>{`
        .global-reflection {
          animation: global-reflection-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes global-reflection-in {
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
