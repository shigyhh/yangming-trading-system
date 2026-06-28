import Link from "next/link"

import { KlineSegmentAdmin } from "@/features/admin/kline-segment-admin"

export const dynamic = "force-dynamic"

export default function AdminKlineSegmentsPage() {
  return (
    <main className="min-h-svh bg-[#080807] px-4 py-6 text-[#F4EBDD] md:px-8 md:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(216,183,111,.12),transparent_28rem),radial-gradient(circle_at_86%_18%,rgba(95,132,117,.11),transparent_30rem),linear-gradient(180deg,rgba(8,8,7,.72),#080807)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[rgba(217,189,122,.16)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-function text-xs tracking-[.22em] text-[rgba(216,183,111,.72)]">
              KLINE SEGMENTS
            </p>
            <h1 className="mt-3 font-story text-3xl font-semibold tracking-[.04em] text-[#F4EBDD] md:text-5xl">
              K线片段标注
            </h1>
            <p className="mt-4 max-w-2xl font-function text-sm leading-7 text-[rgba(244,235,221,.62)]">
              片段管理用于维护 K 线训练素材的边界、场景标签、错题类型与训练包绑定。此页只调用 kline-service KlineSegment API 和 Training Pack API，不复制 K线数据源。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/training-packs"
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] hover:text-[#F4EBDD]"
            >
              训练包管理
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.38)] hover:text-[#F4EBDD]"
            >
              返回运营照见台
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[rgba(217,189,122,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.58)] transition hover:border-[rgba(216,183,111,.32)] hover:text-[#F4EBDD]"
            >
              返回首页
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-[rgba(217,189,122,.14)] bg-white/[.03] p-5">
          <h2 className="font-story text-lg tracking-[.04em] text-[#F4EBDD]">片段管理</h2>
          <p className="mt-2 font-function text-sm leading-7 text-[rgba(244,235,221,.58)]">
            当前页面只做网页后台标注：查看、新增、编辑、启用或停用 KlineSegment，并绑定 sceneTags、errorTypes 与 trainingPackIds。
          </p>
        </section>

        <KlineSegmentAdmin />

        <p className="rounded-lg border border-[rgba(217,189,122,.14)] bg-black/20 px-4 py-3 text-center font-function text-xs leading-6 text-[rgba(244,235,221,.46)]">
          本后台仅用于交易认知、行为训练与风险教育的运营承接；不提供具体操作指令，不承诺结果。
        </p>
      </div>
    </main>
  )
}
