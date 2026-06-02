import { GlassPanel, SecondaryButton } from "@/features/assessment/components"
import { cn } from "@/lib/utils"

import { formatHeartProofDate } from "./heartProofEngine"
import type { HeartProof } from "./heartProofTypes"

export function HeartProofCard({
  heartProof,
  copied,
  className,
  onCopy,
}: {
  heartProof: HeartProof
  copied?: boolean
  className?: string
  onCopy?: () => void
}) {
  return (
    <GlassPanel className={cn("heart-proof-card", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日心证</p>
          <h2 className="mt-4 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
            {formatHeartProofDate(heartProof.createdAt)}
          </h2>
        </div>
        {onCopy ? (
          <SecondaryButton type="button" onClick={onCopy}>
            {copied ? "已复制" : "复制心证文字"}
          </SecondaryButton>
        ) : null}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <HeartProofLine label="今日一念" value={heartProof.thoughtLabel || heartProof.thoughtType} />
        <HeartProofLine label="今日动作" value={heartProof.nextActionText} />
        <HeartProofLine label="今日省察" value={heartProof.reflectionText} wide />
        <HeartProofLine label="今日所证" value={heartProof.proofText} wide />
      </div>
      <p className="mt-5 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
        {heartProof.complianceText}
      </p>
    </GlassPanel>
  )
}

function HeartProofLine({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3", wide && "md:col-span-2")}>
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(180,157,93,.72)]">{label}</p>
      <p className="mt-2 font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(242,235,220,.76)]">{value}</p>
    </div>
  )
}
