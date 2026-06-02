import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, ShieldAlert } from "lucide-react"

import { AssistantHandoffForm } from "@/features/admin/assistant-handoff-form"
import { FeishuSyncButton } from "@/features/admin/feishu-sync-button"
import { getAdminUserByIdForPage } from "@/features/admin/admin-data"

export const dynamic = "force-dynamic"

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

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, source } = await getAdminUserByIdForPage(id)

  if (!user) {
    notFound()
  }

  return (
    <main className="min-h-svh bg-[#080807] px-4 py-6 text-[#F4EBDD] md:px-8 md:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(216,183,111,.12),transparent_28rem),radial-gradient(circle_at_82%_18%,rgba(95,132,117,.12),transparent_28rem),linear-gradient(180deg,rgba(8,8,7,.68),#080807)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-[rgba(217,189,122,.16)] pb-6">
          <Link
            href="/admin"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-3 py-2 font-function text-sm text-[rgba(244,235,221,.72)] transition hover:border-[rgba(216,183,111,.38)] hover:text-[#F4EBDD]"
          >
            <ArrowLeft className="size-4" />
            返回列表
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-sm tracking-[.08em] text-[rgba(216,183,111,.72)]">{user.phone}</p>
              <h1 className="mt-3 font-story text-3xl font-semibold tracking-[.04em] md:text-5xl">
                {user.primaryType} · 测评详情
              </h1>
              <p className="mt-4 max-w-2xl font-function text-sm leading-7 text-[rgba(244,235,221,.6)]">
                展示测评报告、训练记录、复测变化与助教承接状态。当前来源：{source === "server-api" ? "server 数据绑定 API" : "本地 mock fallback"}。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:min-w-[320px]">
              <Meta label="测评时间" value={user.assessmentTime} />
              <Meta label="邀请来源" value={user.inviteSource} />
              <Meta label="副人格" value={user.secondaryType} />
              <Meta label="风险标签" value={user.riskLabel} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-[rgba(216,183,111,.82)]" />
              <h2 className="font-story text-xl tracking-[.04em]">{user.report.title}</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ReportField label="当前心贼" value={user.report.heartThief} />
              <ReportField label="训练方向" value={user.report.trainingDirection} />
            </div>
            <p className="mt-5 font-function text-sm leading-7 text-[rgba(244,235,221,.66)]">
              {user.report.summary}
            </p>
            <p className="mt-5 rounded-lg border border-[rgba(217,189,122,.14)] bg-[rgba(216,183,111,.06)] px-4 py-3 font-story text-base leading-8 text-[rgba(244,235,221,.78)]">
              {user.report.yangmingReminder}
            </p>
          </article>

          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[rgba(95,132,117,.9)]" />
              <h2 className="font-story text-xl tracking-[.04em]">助教承接</h2>
            </div>
            <div className="mt-5 space-y-3">
              <ReportField label="状态" value={user.assistant.status} />
              <ReportField label="负责人" value={user.assistant.owner} />
              <ReportField label="承接时间" value={user.assistant.handoffAt || "待分配"} />
            </div>
            <p className="mt-5 font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              {user.assistant.note}
            </p>
            {user.assistantSummary ? (
              <div className="mt-5 grid gap-3 rounded-lg border border-[rgba(217,189,122,.12)] bg-black/15 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <ReportField label="承接优先级" value={user.assistantSummary.priority} />
                  <ReportField label="训练营建议" value={user.assistantSummary.trainingCamp} />
                  <ReportField label="主副人格" value={`${user.assistantSummary.primaryType} / ${user.assistantSummary.secondaryType}`} />
                  <ReportField label="风险照见" value={`${user.assistantSummary.riskLabel} ${user.assistantSummary.riskValue}%`} />
                </div>
                <p className="font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
                  {user.assistantSummary.focus}
                </p>
                <div className="rounded-lg border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-3">
                  <p className="font-function text-xs text-[rgba(244,235,221,.44)]">话术建议</p>
                  <p className="mt-2 font-function text-sm leading-7 text-[rgba(244,235,221,.78)]">
                    {user.assistantSummary.script}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-[rgba(217,189,122,.1)] bg-black/15 px-4 py-3 font-function text-sm leading-7 text-[rgba(244,235,221,.54)]">
                完成测评报告同步后生成助教摘要。
              </p>
            )}
            <FeishuSyncButton userId={user.id} source={source} feishuSync={user.feishuSync ?? null} />
            <AssistantHandoffForm userId={user.id} source={source} assistant={user.assistant} />
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-story text-xl tracking-[.04em]">训练记录</h2>
              <span className="rounded-full border border-[rgba(217,189,122,.16)] px-3 py-1 font-function text-xs text-[rgba(244,235,221,.56)]">
                {user.trainingStatus}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {user.trainingRecords.length > 0 ? (
                user.trainingRecords.map((record) => (
                  <article
                    key={`${record.day}-${record.date}`}
                    className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <Clock3 className="size-4 text-[rgba(216,183,111,.72)]" />
                        <h3 className="font-function text-sm font-medium text-[#F4EBDD]">
                          {record.day} · {record.date}
                        </h3>
                      </div>
                      <span className="w-fit rounded-full border border-[rgba(95,132,117,.25)] bg-[rgba(95,132,117,.1)] px-2.5 py-1 font-function text-xs text-[rgba(174,205,191,.84)]">
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-3 font-function text-sm leading-7 text-[rgba(244,235,221,.68)]">
                      {record.action}
                    </p>
                    <p className="mt-2 font-function text-xs leading-6 text-[rgba(244,235,221,.48)]">
                      省察：{record.reflection}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(244,235,221,.56)]">
                  暂无训练记录。后续接入训练 API 后展示每日事上练、复盘与完成状态。
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-[rgba(217,189,122,.1)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-story text-lg tracking-[.04em]">K 线心念记录</h3>
                <span className="rounded-full border border-[rgba(217,189,122,.14)] px-3 py-1 font-function text-xs text-[rgba(244,235,221,.48)]">
                  {user.klineRecords?.length || 0} 条
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {user.klineRecords?.length ? (
                  user.klineRecords.map((record) => (
                    <article
                      key={`${record.day}-${record.date}-${record.scene}`}
                      className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h4 className="font-function text-sm font-medium text-[#F4EBDD]">
                          {record.day} · {record.date}
                        </h4>
                        <span className="w-fit rounded-full border border-[rgba(216,183,111,.18)] bg-[rgba(216,183,111,.08)] px-2.5 py-1 font-function text-xs text-[rgba(216,183,111,.78)]">
                          {record.scene}
                        </span>
                      </div>
                      <p className="mt-3 font-function text-sm leading-7 text-[rgba(244,235,221,.64)]">
                        心念反应：{record.reaction}
                      </p>
                      <p className="mt-2 font-function text-xs leading-6 text-[rgba(244,235,221,.48)]">
                        训练动作：{record.disciplineAction}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(244,235,221,.56)]">
                    暂无 K 线心念记录。后续会展示场景、第一念反应与纪律动作。
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5">
            <h2 className="font-story text-xl tracking-[.04em]">复测变化</h2>
            <div className="mt-5 grid gap-3">
              <ReportField label="训练前照见" value={user.retestChange.before} />
              <ReportField label="复测后变化" value={user.retestChange.after} />
            </div>
            <p className="mt-5 font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              {user.retestChange.changeNote}
            </p>
            <div className="mt-5 grid gap-3">
              {user.retestComparisons?.length ? (
                user.retestComparisons.map((item) => (
                  <div key={item.key} className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-function text-sm text-[rgba(244,235,221,.72)]">{item.label}</span>
                      <span className="font-mono text-xs text-[rgba(216,183,111,.72)]">
                        {formatDelta(item.delta)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <RadarLine label="初测" value={item.before} />
                      <RadarLine label="复测" value={item.after} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(244,235,221,.56)]">
                  暂无复测雷达明细。完成复测后展示风险项前后变化。
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-story text-xl tracking-[.04em]">活镜成长</h2>
              <span className="rounded-full border border-[rgba(217,189,122,.14)] px-3 py-1 font-function text-xs text-[rgba(244,235,221,.48)]">
                九镜强度
              </span>
            </div>
            {user.livingMirrorStats ? (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ReportField label="训练完成率" value={`${user.livingMirrorStats.trainingCompletionRate}%`} />
                  <ReportField label="良知成长值" value={`${user.livingMirrorStats.conscienceGrowth}`} />
                  <ReportField label="循环复发次数" value={`${user.livingMirrorStats.loopRelapseCount}`} />
                </div>
                <div className="mt-5 grid gap-3">
                  {getTopMirrorScores(user.livingMirrorStats.mirrorScores).map(([key, value]) => (
                    <RadarLine key={key} label={mirrorScoreLabels[key] || key} value={Number(value)} />
                  ))}
                </div>
                <div className="mt-5">
                  <p className="font-function text-xs text-[rgba(244,235,221,.44)]">心贼频次</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getTopThiefCounts(user.livingMirrorStats.thiefCounts).length ? (
                      getTopThiefCounts(user.livingMirrorStats.thiefCounts).map(([label, count]) => (
                        <span key={label} className="rounded-full border border-[rgba(216,183,111,.18)] bg-[rgba(216,183,111,.07)] px-3 py-1 font-function text-xs text-[rgba(216,183,111,.78)]">
                          {label} · {count}
                        </span>
                      ))
                    ) : (
                      <span className="font-function text-sm text-[rgba(244,235,221,.48)]">等待更多训练和复盘证据。</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-5 rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(244,235,221,.56)]">
                暂无活镜成长数据。完成训练或真实交易复盘后，这里展示九镜强度、心贼频次和良知成长值。
              </p>
            )}
          </article>

          <article className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-story text-xl tracking-[.04em]">真实交易复盘</h2>
              <span className="rounded-full border border-[rgba(217,189,122,.14)] px-3 py-1 font-function text-xs text-[rgba(244,235,221,.48)]">
                {user.tradeReviews?.length || 0} 条
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {user.tradeReviews?.length ? (
                user.tradeReviews.map((review) => (
                  <article key={review.id} className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="font-function text-sm font-medium text-[#F4EBDD]">
                        {review.detectedMirror} · {review.tradeDate}
                      </h3>
                      <span className="font-mono text-xs text-[rgba(244,235,221,.42)]">
                        {formatDetailTime(review.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 font-function text-sm leading-7 text-[rgba(244,235,221,.64)]">
                      第一念：{review.strongestThought}
                    </p>
                    <p className="mt-2 font-function text-xs leading-6 text-[rgba(244,235,221,.48)]">
                      {review.reviewText}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.behaviorTags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.08)] px-2.5 py-1 font-function text-[0.68rem] text-[rgba(174,205,191,.8)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(244,235,221,.56)]">
                  暂无真实交易复盘。用户上传截图并完成三问后，这里会出现心镜映射和行为证据。
                </p>
              )}
            </div>
          </article>
        </section>

        <p className="rounded-lg border border-[rgba(217,189,122,.14)] bg-black/20 px-4 py-3 text-center font-function text-xs leading-6 text-[rgba(244,235,221,.46)]">
          本后台仅用于交易认知、行为训练与风险教育的运营承接；不荐股、不喊单、不承诺收益。
        </p>
      </div>
    </main>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(217,189,122,.12)] bg-white/[.03] px-3 py-2">
      <p className="font-function text-xs text-[rgba(244,235,221,.44)]">{label}</p>
      <p className="mt-1 font-function text-sm text-[rgba(244,235,221,.82)]">{value}</p>
    </div>
  )
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(217,189,122,.12)] bg-black/15 px-4 py-3">
      <p className="font-function text-xs text-[rgba(244,235,221,.44)]">{label}</p>
      <p className="mt-2 font-function text-sm leading-6 text-[rgba(244,235,221,.82)]">{value}</p>
    </div>
  )
}

function RadarLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between font-function text-xs text-[rgba(244,235,221,.42)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.055]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#5f8475,#b49d5d)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function formatDelta(delta: number) {
  if (delta === 0) return "持平"
  return `${delta > 0 ? "上升" : "下降"} ${Math.abs(delta)}%`
}

function getTopMirrorScores(scores: Record<string, number>) {
  return Object.entries(scores)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5)
}

function getTopThiefCounts(counts: Record<string, number>) {
  return Object.entries(counts)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6)
}

function formatDetailTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || "待记录"
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
