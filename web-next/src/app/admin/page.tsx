import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, ClipboardList, Handshake, Search, UserRoundCheck, UsersRound } from "lucide-react"

import {
  adminApiEndpoints,
  filterAdminUsers,
  getAdminFilterOptions,
  getAdminFollowUp,
  getAdminInviteSourcesForPage,
  getAdminSummary,
  getAdminUsersForPage,
  normalizeAdminFilters,
} from "@/features/admin/admin-data"

export const dynamic = "force-dynamic"

const columns = [
  "手机号",
  "测评时间",
  "主人格",
  "副人格",
  "风险标签",
  "训练营建议",
  "训练状态",
  "邀请码来源",
  "助教承接",
  "跟进建议",
]

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const sortOptions: Array<readonly [string, string]> = [
  ["assessment_desc", "测评时间由近到远"],
  ["assessment_asc", "测评时间由远到近"],
  ["assistant_priority", "按承接优先级"],
  ["training_progress", "按训练进度"],
]

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const filters = normalizeAdminFilters(await searchParams)
  const [{ users, source }, { inviteSources, source: inviteSourceDataSource }] = await Promise.all([
    getAdminUsersForPage(),
    getAdminInviteSourcesForPage(),
  ])
  const filterOptions = getAdminFilterOptions(users)
  const filteredUsers = filterAdminUsers(users, filters)
  const summary = getAdminSummary(users)
  const filteredSummary = getAdminSummary(filteredUsers)

  return (
    <main className="min-h-svh bg-[#080807] px-4 py-6 text-[#F4EBDD] md:px-8 md:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(216,183,111,.13),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(95,132,117,.12),transparent_30rem),linear-gradient(180deg,rgba(8,8,7,.72),#080807)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[rgba(217,189,122,.16)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-function text-xs tracking-[.22em] text-[rgba(216,183,111,.72)]">
              ADMIN MVP
            </p>
            <h1 className="mt-3 font-story text-3xl font-semibold tracking-[.04em] text-[#F4EBDD] md:text-5xl">
              运营照见台
            </h1>
            <p className="mt-4 max-w-2xl font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              查看测评用户、人格报告、训练状态与助教承接信息。优先读取 server 数据绑定 API，未启动时回退本地 mock；不包含投资建议、行情预测或买卖指令。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] hover:text-[#F4EBDD]"
          >
            返回首页
          </Link>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard icon={<UsersRound />} label="测评用户" value={summary.totalUsers} />
          <SummaryCard icon={<UserRoundCheck />} label="待承接" value={summary.pendingHandoff} />
          <SummaryCard icon={<ClipboardList />} label="有训练记录" value={summary.inTraining} />
          <SummaryCard icon={<Handshake />} label="待复盘" value={summary.pendingReview} />
        </section>

        <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-story text-xl tracking-[.04em]">邀请码渠道统计</h2>
              <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
                只看来源、测评、训练与承接，不做收益归因或裂变排行。
              </p>
            </div>
            <span className="w-fit rounded-full border border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.12)] px-3 py-1 font-function text-xs text-[rgba(174,205,191,.84)]">
              {inviteSourceDataSource === "server-api" ? "Server API" : "Mock fallback"}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(217,189,122,.1)] bg-white/[.025]">
                  {["来源", "测评", "已训练", "已承接", "分享卡", "主要人格", "最近测评"].map((column) => (
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
                {inviteSources.map((item) => (
                  <tr key={item.source} className="border-b border-[rgba(217,189,122,.08)]">
                    <td className="px-4 py-4 font-function text-sm text-[#F4EBDD]">{item.source}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.72)]">{item.assessmentCount}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.72)]">{item.trainingStartedCount}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.72)]">{item.assistantHandoffCount}</td>
                    <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.72)]">{item.shareCardCount}</td>
                    <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">
                      {item.topPrimaryTypes.map((type) => `${type.label} ${type.count}`).join(" / ") || "待观察"}
                    </td>
                    <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.56)]">
                      {formatAdminTime(item.lastAssessmentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(217,189,122,.16)] bg-[#11100D]/80 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-[rgba(217,189,122,.12)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div>
              <h2 className="font-story text-xl tracking-[.04em]">测评用户列表</h2>
              <p className="mt-1 font-function text-xs leading-5 text-[rgba(244,235,221,.48)]">
                列表字段按运营承接最小闭环设计，手机号为脱敏展示。当前筛选命中 {filteredSummary.totalUsers} 人。
              </p>
            </div>
            <span className="w-fit rounded-full border border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.12)] px-3 py-1 font-function text-xs text-[rgba(174,205,191,.84)]">
              {source === "server-api" ? "Server API" : "Mock fallback"}
            </span>
          </div>

          <form className="grid gap-3 border-b border-[rgba(217,189,122,.1)] px-4 py-4 md:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))_auto] md:px-5">
            <label className="grid gap-2">
              <span className="font-function text-xs text-[rgba(244,235,221,.44)]">搜索用户</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[rgba(216,183,111,.46)]" />
                <input
                  name="q"
                  defaultValue={filters.q}
                  placeholder="手机号、人格、风险、来源"
                  className="min-h-10 w-full rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] pl-9 pr-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)]"
                />
              </span>
            </label>

            <FilterSelect label="承接状态" name="assistant_status" value={filters.assistantStatus} options={filterOptions.assistantStatuses} />
            <FilterSelect label="训练状态" name="training_status" value={filters.trainingStatus} options={filterOptions.trainingStatuses} />
            <FilterSelect label="风险标签" name="risk_label" value={filters.riskLabel} options={filterOptions.riskLabels} />
            <FilterSelect label="邀请码来源" name="invite_source" value={filters.inviteSource} options={filterOptions.inviteSources} />
            <FilterSelect label="排序" name="sort" value={filters.sort} options={sortOptions} includeAll={false} />

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="min-h-10 rounded-lg border border-[rgba(217,189,122,.22)] bg-[rgba(216,183,111,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.82)] transition hover:border-[rgba(216,183,111,.42)]"
              >
                筛选
              </button>
              <Link
                href="/admin"
                className="inline-flex min-h-10 items-center rounded-lg border border-[rgba(217,189,122,.14)] px-4 font-function text-sm text-[rgba(244,235,221,.58)] transition hover:border-[rgba(216,183,111,.32)] hover:text-[rgba(244,235,221,.82)]"
              >
                重置
              </Link>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
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
                  <th className="px-4 py-3 text-right font-function text-xs font-medium tracking-[.08em] text-[rgba(244,235,221,.52)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length ? (
                  filteredUsers.map((user) => {
                    const followUp = getAdminFollowUp(user)
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-[rgba(217,189,122,.08)] transition hover:bg-white/[.035]"
                      >
                        <td className="px-4 py-4 font-mono text-sm text-[rgba(244,235,221,.86)]">{user.phone}</td>
                        <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">{user.assessmentTime}</td>
                        <td className="px-4 py-4 font-function text-sm text-[#F4EBDD]">{user.primaryType}</td>
                        <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.68)]">{user.secondaryType}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-[rgba(120,60,45,.28)] bg-[rgba(120,60,45,.16)] px-2.5 py-1 font-function text-xs text-[rgba(231,188,171,.86)]">
                            {user.riskLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.72)]">{user.campSuggestion}</td>
                        <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.72)]">{user.trainingStatus}</td>
                        <td className="px-4 py-4 font-function text-sm text-[rgba(244,235,221,.6)]">{user.inviteSource}</td>
                        <td className="px-4 py-4">
                          <AssistantStatusBadge status={user.assistant.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[210px]">
                            <span className="rounded-full border border-[rgba(95,132,117,.24)] bg-[rgba(95,132,117,.1)] px-2.5 py-1 font-function text-xs text-[rgba(174,205,191,.84)]">
                              {followUp.label}
                            </span>
                            <p className="mt-2 font-function text-xs leading-5 text-[rgba(244,235,221,.44)]">{followUp.reason}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/admin/${user.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[rgba(217,189,122,.18)] px-3 py-2 font-function text-xs text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.42)] hover:text-[#F4EBDD]"
                          >
                            查看详情
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-10 text-center font-function text-sm text-[rgba(244,235,221,.48)]">
                      暂无符合条件的用户。可重置筛选后继续查看承接队列。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[rgba(217,189,122,.14)] bg-white/[.03] p-5">
          <h2 className="font-story text-lg tracking-[.04em] text-[#F4EBDD]">当前数据绑定 API</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {adminApiEndpoints.map((item) => (
              <code
                key={item}
                className="rounded-md border border-[rgba(217,189,122,.1)] bg-black/20 px-3 py-2 font-mono text-xs text-[rgba(244,235,221,.58)]"
              >
                {item}
              </code>
            ))}
          </div>
        </section>

        <p className="rounded-lg border border-[rgba(217,189,122,.14)] bg-black/20 px-4 py-3 text-center font-function text-xs leading-6 text-[rgba(244,235,221,.46)]">
          本后台仅用于交易认知、行为训练与风险教育的运营承接；不荐股、不喊单、不承诺收益。
        </p>
      </div>
    </main>
  )
}

function FilterSelect({
  label,
  name,
  value,
  options,
  includeAll = true,
}: {
  label: string
  name: string
  value: string
  options: readonly string[] | readonly (readonly [string, string])[]
  includeAll?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="font-function text-xs text-[rgba(244,235,221,.44)]">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="min-h-10 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none"
      >
        {includeAll ? <option value="">全部</option> : null}
        {options.map((option) => {
          const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option]
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
      </select>
    </label>
  )
}

function AssistantStatusBadge({ status }: { status: string }) {
  const className = status === "待承接"
    ? "border-[rgba(120,60,45,.28)] bg-[rgba(120,60,45,.16)] text-[rgba(231,188,171,.86)]"
    : status === "待复盘"
      ? "border-[rgba(216,183,111,.22)] bg-[rgba(216,183,111,.1)] text-[rgba(216,183,111,.86)]"
      : status === "已完成"
        ? "border-[rgba(95,132,117,.26)] bg-[rgba(95,132,117,.12)] text-[rgba(174,205,191,.88)]"
        : "border-[rgba(216,183,111,.2)] bg-[rgba(216,183,111,.1)] text-[rgba(216,183,111,.86)]"

  return (
    <span className={`rounded-full border px-2.5 py-1 font-function text-xs ${className}`}>
      {status}
    </span>
  )
}

function formatAdminTime(value: string) {
  if (!value) return "暂无"
  const normalized = value.includes("T") ? value.slice(0, 16).replace("T", " ") : value
  return normalized
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="rounded-lg border border-[rgba(217,189,122,.14)] bg-[#11100D]/72 p-4 shadow-[0_18px_48px_rgba(0,0,0,.24)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg border border-[rgba(217,189,122,.16)] bg-[rgba(216,183,111,.08)] text-[rgba(216,183,111,.86)] [&_svg]:size-4">
          {icon}
        </span>
        <span className="font-mono text-2xl text-[#F4EBDD]">{value}</span>
      </div>
      <p className="mt-3 font-function text-sm text-[rgba(244,235,221,.58)]">{label}</p>
    </article>
  )
}
