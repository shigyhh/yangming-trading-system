"use client"

import { useEffect, useMemo, useState } from "react"

import { AssessmentShell, ComplianceNote, GlassPanel, PrimaryLink, SecondaryLink, StatusPill } from "@/features/assessment/components"
import {
  fallbackI18nBundle,
  fallbackSupportedLocales,
  fetchI18nBundle,
  fetchI18nLocales,
  getStoredLocale,
  storeLocale,
} from "@/features/i18n/api-client"
import type { I18nBundle, SupportedLocale, SupportedLocaleCode } from "../../../../packages/contracts/i18n"

export default function LanguagePage() {
  const [locale, setLocale] = useState<SupportedLocaleCode>("zh-CN")
  const [locales, setLocales] = useState<SupportedLocale[]>(fallbackSupportedLocales)
  const [bundle, setBundle] = useState<I18nBundle>(fallbackI18nBundle)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const initialLocale = getStoredLocale()
      setLocale(initialLocale)

      void fetchI18nLocales().then((result) => {
        if (result.ok) setLocales(result.data.supportedLocales)
      })
      void fetchI18nBundle(initialLocale).then((result) => {
        if (result.ok) {
          setBundle(result.data.bundle)
          setMessage(result.data.isFallback ? "暂未开放该语言，已回到中文核心文案。" : "")
        } else {
          setBundle(fallbackI18nBundle)
          setMessage(result.error)
        }
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  async function loadBundle(nextLocale: SupportedLocaleCode) {
    setLocale(nextLocale)
    storeLocale(nextLocale)
    setMessage("")

    const result = await fetchI18nBundle(nextLocale)
    if (result.ok) {
      setBundle(result.data.bundle)
      setMessage(result.data.isFallback ? "暂未开放该语言，已回到中文核心文案。" : "")
    } else {
      setBundle(fallbackI18nBundle)
      setMessage(result.error)
    }
  }

  const glossary = useMemo(() => Object.entries(bundle.coreWorldview.glossary), [bundle])
  const routeLabels = useMemo(() => Object.entries(bundle.common.routes), [bundle])

  return (
    <AssessmentShell className="py-5" contentWidth="wide">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <StatusPill>{bundle.common.sprintName}</StatusPill>
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="font-function text-xs font-semibold tracking-[.22em] text-[#b49d5d]">{bundle.common.productName}</p>
            <h1 className="mt-5 max-w-3xl font-story text-[clamp(2.35rem,8vw,5rem)] font-light leading-[1.18] tracking-[.08em] text-[rgba(242,235,220,.92)]">
              {bundle.coreWorldview.title}
            </h1>
            <p className="mt-6 max-w-2xl font-story text-[1.08rem] font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.62)]">
              {bundle.coreWorldview.positioning}
            </p>
          </div>

          <GlassPanel>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">语言底座</p>
            <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.54)]">
              核心世界观先人工翻译，功能文案可后续补。当前页面只验证语言包、API 与 Web client 的连接。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {locales.map((item) => {
                const active = item.code === locale
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => void loadBundle(item.code)}
                    className={`min-h-14 rounded-[8px] border px-3 text-left transition duration-300 ${
                      active
                        ? "border-[rgba(180,157,93,.48)] bg-[rgba(180,157,93,.13)] text-[rgba(242,235,220,.9)]"
                        : "border-[rgba(172,146,83,.12)] bg-white/[.025] text-[rgba(220,212,195,.56)] hover:border-[rgba(180,157,93,.3)]"
                    }`}
                  >
                    <span className="block font-function text-sm">{item.nativeLabel}</span>
                    <span className="mt-1 block font-mono text-[11px] opacity-60">{item.code}</span>
                  </button>
                )
              })}
            </div>
            {message ? (
              <p className="mt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">{message}</p>
            ) : null}
          </GlassPanel>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <GlassPanel className="lg:col-span-2">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">核心世界观</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <WorldviewItem label="定位" value={bundle.coreWorldview.positioning} />
              <WorldviewItem label="边界" value={bundle.coreWorldview.principle} />
              <WorldviewItem label="训练闭环" value={bundle.coreWorldview.trainingLoop} />
              <WorldviewItem label="翻译策略" value={bundle.coreWorldview.translationPolicy} />
            </div>
          </GlassPanel>

          <GlassPanel>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">功能标签</p>
            <div className="mt-5 grid gap-2">
              {routeLabels.map(([key, label]) => (
                <div
                  key={key}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-3"
                >
                  <span className="font-mono text-[11px] text-[rgba(220,212,195,.34)]">{key}</span>
                  <span className="text-right font-function text-sm text-[rgba(242,235,220,.68)]">{label}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="mt-4">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">心学词库</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {glossary.map(([key, value]) => (
              <div key={key} className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3">
                <p className="font-mono text-[11px] text-[rgba(220,212,195,.34)]">{key}</p>
                <p className="mt-2 font-story text-xl font-light tracking-[.06em] text-[rgba(242,235,220,.78)]">{value}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PrimaryLink href="/global-reflection" className="w-full">
            查看全球照见层 →
          </PrimaryLink>
          <SecondaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </SecondaryLink>
        </div>

        <ComplianceNote>{bundle.coreWorldview.compliance}</ComplianceNote>
      </div>
    </AssessmentShell>
  )
}

function WorldviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4">
      <p className="font-function text-xs tracking-[.16em] text-[rgba(180,157,93,.78)]">{label}</p>
      <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">{value}</p>
    </div>
  )
}
