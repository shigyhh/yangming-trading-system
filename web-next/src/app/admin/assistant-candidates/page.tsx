import Link from "next/link"

import { getAdminUsersForPage } from "@/features/admin/admin-data"
import { buildAssistantCandidateDryRun } from "@/features/admin/assistant-candidate-dry-run"
import { AssistantCandidateExportActions } from "@/features/admin/assistant-candidate-export-actions"
import { exportAssistantCandidatesAsCsv, exportAssistantCandidatesAsJson } from "@/features/admin/assistant-candidate-export"

export const dynamic = "force-dynamic"

const columns = [
  "优先级",
  "脱敏手机号 phoneMasked",
  "承接状态",
  "跟进重点 focus",
  "候选原因 reasonText",
  "下一步 suggestedNextStep",
  "reason codes",
  "查看详情入口",
]

export default async function AssistantCandidatesPage() {
  const { users, source } = await getAdminUsersForPage()
  const candidateDryRun = buildAssistantCandidateDryRun(users, { limit: Math.max(users.length, 1) })
  const candidateDryRunJson = exportAssistantCandidatesAsJson(candidateDryRun)
  const candidateDryRunCsv = exportAssistantCandidatesAsCsv(candidateDryRun)

  return (
    <main className="min-h-svh bg-[#080807] px-4 py-6 text-[#F4EBDD] md:px-8 md:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(216,183,111,.12),transparent_28rem),radial-gradient(circle_at_86%_18%,rgba(95,132,117,.11),transparent_30rem),linear-gradient(180deg,rgba(8,8,7,.72),#080807)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[rgba(217,189,122,.16)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-function text-xs tracking-[.22em] text-[rgba(216,183,111,.72)]">
              ASSISTANT CANDIDATES
            </p>
            <h1 className="mt-3 font-story text-3xl font-semibold tracking-[.04em] text-[#F4EBDD] md:text-5xl">
              助教候选列表
            </h1>
            <p className="mt-4 max-w-2xl font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              基于助教承接候选 dry-run 生成，只供人工查看、筛选与复制导出，再由运营人工跟进。
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] hover:text-[#F4EBDD]"
          >
            返回运营照见台
          </Link>
        </header>

        <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/76 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="候选总数" value={candidateDryRun.totalCandidates} />
              <MetricCard label="数据源" value={source === "server-api" ? "server-api" : "local-mock"} />
            </div>
            <AssistantCandidateExportActions jsonText={candidateDryRunJson} csvText={candidateDryRunCsv} />
          </div>
          <p className="mt-5 rounded-lg border border-[rgba(217,189,122,.12)] bg-black/20 px-4 py-3 font-function text-xs leading-6 text-[rgba(244,235,221,.48)]">
            合规说明：{candidateDryRun.complianceText}
          </p>
        </section>

        <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/80 shadow-[0_30px_90px_rgba(0,0,0,.32)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(217,189,122,.1)] bg-white/[.025]">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left font-function text-xs font-medium tracking-[.08em] text-[rgba(244,235,221,.52)]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidateDryRun.candidates.length ? (
                  candidateDryRun.candidates.map((candidate) => (
                    <tr key={candidate.candidateId} className="border-b border-[rgba(217,189,122,.08)] align-top">
                      <td className="px-4 py-4">
                        <AssistantPriorityBadge priority={candidate.priority} />
                      </td>
                      <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.84)]">{candidate.phoneMasked}</td>
                      <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">{candidate.assistantStatus}</td>
                      <td className="max-w-[170px] px-4 py-4 font-function text-sm leading-6 text-[#F4EBDD]">{candidate.focus}</td>
                      <td className="max-w-[230px] px-4 py-4 font-function text-xs leading-6 text-[rgba(244,235,221,.58)]">
                        {candidate.reasonText}
                      </td>
                      <td className="max-w-[240px] px-4 py-4 font-function text-xs leading-6 text-[rgba(216,183,111,.72)]">
                        {candidate.suggestedNextStep}
                      </td>
                      <td className="px-4 py-4 font-mono text-[11px] leading-5 text-[rgba(244,235,221,.36)]">
                        {candidate.candidateReasonCodes.join(" / ")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/${candidate.userId}`}
                          className="inline-flex rounded-lg border border-[rgba(217,189,122,.16)] px-3 py-2 font-function text-xs text-[rgba(216,183,111,.82)] transition hover:border-[rgba(216,183,111,.34)] hover:text-[#F4EBDD]"
                        >
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 font-function text-sm text-[rgba(244,235,221,.54)]" colSpan={columns.length}>
                      暂无需要人工承接的候选。继续观察今日修行、训练记录与真实复盘即可。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[rgba(217,189,122,.12)] bg-black/20 px-4 py-3">
      <p className="font-function text-xs tracking-[.16em] text-[rgba(216,183,111,.62)]">{label}</p>
      <p className="mt-2 font-story text-2xl tracking-[.04em] text-[#F4EBDD]">{value}</p>
    </div>
  )
}

function AssistantPriorityBadge({ priority }: { priority: string }) {
  const label = priority === "high" ? "高优先级" : priority === "medium" ? "中优先级" : "低优先级"
  const className =
    priority === "high"
      ? "border-[rgba(120,60,45,.42)] bg-[rgba(120,60,45,.18)] text-[rgba(244,235,221,.86)]"
      : priority === "medium"
        ? "border-[rgba(216,183,111,.24)] bg-[rgba(216,183,111,.12)] text-[rgba(216,183,111,.86)]"
        : "border-[rgba(95,132,117,.22)] bg-[rgba(95,132,117,.12)] text-[rgba(174,205,191,.82)]"

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 font-function text-xs ${className}`}>
      {label}
    </span>
  )
}
