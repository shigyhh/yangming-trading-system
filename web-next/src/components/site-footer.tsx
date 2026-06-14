"use client"

import { usePathname } from "next/navigation"

const PUBLIC_FOOTER_PATHS = new Set([
  "/",
  "/today-sealed",
  "/review",
  "/trade-review",
  "/mind-archive",
  "/archive",
  "/lake",
  "/one-thought-lake",
])

function shouldShowSiteFooter(pathname: string) {
  return PUBLIC_FOOTER_PATHS.has(pathname)
}

export function SiteFooter() {
  const pathname = usePathname()

  if (!shouldShowSiteFooter(pathname)) return null

  return (
    <footer className="font-function relative z-20 border-t border-[rgba(217,189,122,.12)] bg-[#050706] px-5 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))] text-center text-[11px] leading-5 text-[rgba(220,212,195,.42)] md:px-8 md:py-5 md:text-xs">
      <p className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 md:whitespace-nowrap">
        <span>本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。</span>
        <span className="hidden text-[rgba(217,189,122,.2)] md:inline" aria-hidden="true">
          ·
        </span>
      <a
        className="inline-flex text-[rgba(216,183,111,.58)] underline-offset-4 transition-colors duration-300 hover:text-[rgba(244,235,221,.72)] hover:underline"
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noreferrer"
      >
        湘ICP备2026021493号-1
      </a>
      </p>
    </footer>
  )
}
