"use client"

import { usePathname } from "next/navigation"

const appNavItems = [
  { label: "今日照见", href: "/reflect" },
  { label: "心镜长卷", href: "/scroll" },
  { label: "众念心湖", href: "/lake" },
  { label: "我的", href: "/me" },
] as const

function shouldShowBottomNav(pathname: string) {
  return (
    pathname === "/reflect" ||
    pathname.startsWith("/assessment-entry") ||
    pathname === "/scroll" ||
    pathname.startsWith("/mirror-scroll") ||
    pathname.startsWith("/zhixing-still-water") ||
    pathname === "/lake" ||
    pathname.startsWith("/one-thought-lake") ||
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname.startsWith("/mirror-archive")
  )
}

function isActiveNav(pathname: string, href: string) {
  if (href === "/reflect") return pathname === "/reflect" || pathname.startsWith("/assessment-entry")
  if (href === "/scroll") return pathname === "/scroll" || pathname.startsWith("/mirror-scroll") || pathname.startsWith("/zhixing-still-water")
  if (href === "/lake") return pathname === "/lake" || pathname.startsWith("/one-thought-lake")
  if (href === "/me") return pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/mirror-archive")
  return pathname === href
}

export function AppBottomNav() {
  const pathname = usePathname()

  if (!shouldShowBottomNav(pathname)) return null

  return (
    <nav
      aria-label="主导航"
      className="font-function fixed inset-x-4 bottom-[max(0.8rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-4 gap-1 rounded-full border border-[rgba(217,189,122,.12)] bg-[#050706]/70 p-1 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-2xl md:hidden"
    >
      {appNavItems.map((item) => {
        const active = isActiveNav(pathname, item.href)

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 items-center justify-center rounded-full text-[0.66rem] font-semibold tracking-[.06em] no-underline transition duration-500 ${
              active
                ? "bg-[rgba(216,183,111,.12)] text-[rgba(216,183,111,.88)]"
                : "text-[rgba(220,212,195,.48)] hover:bg-[rgba(217,189,122,.07)] hover:text-[rgba(244,235,221,.8)]"
            }`}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
