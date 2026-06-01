"use client"

import type {
  I18nBundle,
  I18nBundleResponse,
  I18nLocalesResponse,
  SupportedLocale,
  SupportedLocaleCode,
} from "../../../../packages/contracts/i18n"

type I18nResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const localeStorageKey = "ym_i18n_locale"
const defaultApiBaseUrl = process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787"

export const fallbackSupportedLocales: SupportedLocale[] = [
  { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文", direction: "ltr", rollout: "core-ready", note: "当前主语言，世界观与功能文案优先维护。" },
  { code: "en", label: "English", nativeLabel: "English", direction: "ltr", rollout: "foundation", note: "Core worldview ready; feature copy can be expanded later." },
  { code: "zh-TW", label: "繁体中文", nativeLabel: "繁體中文", direction: "ltr", rollout: "foundation", note: "核心世界觀已打底，功能文案可後續補齊。" },
  { code: "ja", label: "日语", nativeLabel: "日本語", direction: "ltr", rollout: "foundation", note: "核心世界観を先に整え、機能文言は段階的に補います。" },
  { code: "ko", label: "韩语", nativeLabel: "한국어", direction: "ltr", rollout: "foundation", note: "핵심 세계관을 먼저 정리하고, 기능 문구는 이후 보완합니다." },
  { code: "es", label: "西班牙语", nativeLabel: "Español", direction: "ltr", rollout: "foundation", note: "La visión central está preparada; los textos de producto se ampliarán después." },
]

export const fallbackI18nBundle: I18nBundle = {
  locale: "zh-CN",
  version: "2026-06-sprint15",
  common: {
    productName: "阳明心学交易系统",
    sprintName: "Sprint15 多语言基础架构",
    routes: {
      assessment: "交易人格测评",
      report: "结果报告卡",
      training: "七日训练",
      retest: "复测变化",
      userCenter: "观心档案",
      globalReflection: "全球照见层",
    },
  },
  coreWorldview: {
    title: "以交易照人心",
    positioning: "通过交易行为、情绪触发与念头模式，照见自己的交易人格。",
    principle: "系统记录的是反应模式，不给行情结论。",
    trainingLoop: "照见、觉察、训练、复盘，再复测。",
    compliance: "本系统仅用于交易认知、行为训练与风险教育；不构成投资建议。",
    translationPolicy: "核心世界观先人工翻译，功能文案可后续补。",
    glossary: {
      observeHeart: "照见此心",
      awareness: "觉察",
      train: "训练",
      review: "复盘",
      unity: "知行合一",
      practiceInAction: "事上练心",
    },
  },
  globalReflection: {
    title: "全球照见层",
    subtitle: "不比较，不评判，只共同照见交易时最先浮上的那一念。",
    voteTitle: "今日一念投票",
    mirrorTitle: "匿名人格镜像",
    scrollTitle: "全球修行长卷",
  },
}

export function getStoredLocale(): SupportedLocaleCode {
  if (typeof window === "undefined") return "zh-CN"
  const value = window.localStorage.getItem(localeStorageKey)
  return normalizeLocaleCode(value)
}

export function storeLocale(locale: SupportedLocaleCode) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(localeStorageKey, locale)
}

export function normalizeLocaleCode(value: string | null | undefined): SupportedLocaleCode {
  const raw = String(value || "").trim().toLowerCase()
  if (raw === "en" || raw.startsWith("en-")) return "en"
  if (raw === "ja" || raw.startsWith("ja-")) return "ja"
  if (raw === "ko" || raw.startsWith("ko-")) return "ko"
  if (raw === "es" || raw.startsWith("es-")) return "es"
  if (raw === "zh-tw" || raw === "zh-hk" || raw.startsWith("zh-hant")) return "zh-TW"
  return "zh-CN"
}

export async function fetchI18nLocales() {
  return requestGetJson<I18nLocalesResponse>("/api/v1/i18n/locales")
}

export async function fetchI18nBundle(locale: SupportedLocaleCode) {
  return requestGetJson<I18nBundleResponse>(`/api/v1/i18n/bundle?locale=${encodeURIComponent(locale)}`)
}

async function requestGetJson<TResponse>(path: string): Promise<I18nResult<TResponse>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch(`${defaultApiBaseUrl}${path}`, {
      method: "GET",
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data?.ok === false) {
      return { ok: false, error: String(data?.error || "多语言内容读取失败") }
    }

    return { ok: true, data: data as TResponse }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "多语言内容读取超时"
      : "server 未启动，使用本地中文预览"
    return { ok: false, error: message }
  } finally {
    window.clearTimeout(timer)
  }
}
