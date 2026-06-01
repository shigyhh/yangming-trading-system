export type SupportedLocaleCode = "zh-CN" | "en" | "zh-TW" | "ja" | "ko" | "es"

export type I18nRolloutState = "core-ready" | "foundation"

export type SupportedLocale = {
  code: SupportedLocaleCode
  label: string
  nativeLabel: string
  direction: "ltr" | "rtl"
  rollout: I18nRolloutState
  note: string
}

export type I18nRouteLabels = {
  assessment: string
  report: string
  training: string
  retest: string
  userCenter: string
  globalReflection: string
}

export type I18nGlossary = {
  observeHeart: string
  awareness: string
  train: string
  review: string
  unity: string
  practiceInAction: string
}

export type I18nCoreWorldview = {
  title: string
  positioning: string
  principle: string
  trainingLoop: string
  compliance: string
  translationPolicy: string
  glossary: I18nGlossary
}

export type I18nGlobalReflectionCopy = {
  title: string
  subtitle: string
  voteTitle: string
  mirrorTitle: string
  scrollTitle: string
}

export type I18nBundle = {
  locale: SupportedLocaleCode
  version: string
  common: {
    productName: string
    sprintName: string
    routes: I18nRouteLabels
  }
  coreWorldview: I18nCoreWorldview
  globalReflection: I18nGlobalReflectionCopy
}

export type I18nBundleResponse = {
  locale: SupportedLocaleCode
  fallbackLocale: SupportedLocaleCode
  isFallback: boolean
  supportedLocales: SupportedLocale[]
  bundle: I18nBundle
}

export type I18nLocalesResponse = {
  defaultLocale: SupportedLocaleCode
  supportedLocales: SupportedLocale[]
}
