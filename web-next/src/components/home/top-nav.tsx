"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import { FlowButton } from "@/components/home/flow-button"

const navLinks = [
  { label: "知行心卷", href: "/zhixing-scroll" },
  { label: "明镜止水", href: "/zhixing-still-water" },
  { label: "一念心湖", href: "/one-thought-lake" },
  { label: "照见实盘", href: "/review" },
  { label: "档案馆", href: "/mirror-archive" },
] as const

export function TopNav() {
  const pathname = usePathname()
  const [scrollFade, setScrollFade] = useState(1)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const viewportHeight = window.innerHeight || 1
      const nextFade = Math.max(0, Math.min(1, 1 - window.scrollY / (viewportHeight * 0.5)))

      setScrollFade((currentFade) => {
        if (Math.abs(currentFade - nextFade) < 0.01) return currentFade
        return nextFade
      })
    }

    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [])

  function isActive(href: string) {
    if (href === "/one-thought-lake") return pathname === "/lake" || pathname === "/one-thought-lake"
    if (href === "/review") return pathname === "/review" || pathname === "/trade-review"
    return pathname === href
  }

  return (
    <motion.header
      className="font-function fixed inset-x-0 top-0 z-40 border-b border-[rgba(217,189,122,.01)] bg-[#080807]/3 backdrop-blur-2xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: scrollFade * 0.52, y: -(1 - scrollFade) * 22 }}
      whileHover={scrollFade > 0.08 ? { opacity: Math.min(0.76, scrollFade * 0.76) } : undefined}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: scrollFade > 0.08 ? "auto" : "none" }}
    >
      <nav className="mx-auto flex min-h-16 w-full max-w-[1360px] items-center justify-between gap-6 px-5 md:min-h-[72px] md:px-8">
        <a href="#hero" className="group flex items-center gap-3 opacity-[.46] no-underline transition duration-700 hover:opacity-[.82]">
          <span className="home-nav-zhao" aria-hidden="true">
            <YangmingA1Mark className="home-nav-zhao-glyph" role="presentation" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <strong className="type-level-5 text-[rgba(216,183,111,.58)]">阳明心学交易系统</strong>
            <em className="type-level-4 mt-1 text-[0.62rem] not-italic text-muted-cream opacity-42">见行情 · 见心 · 见人格</em>
          </span>
        </a>
        <div className="hidden items-center gap-2 md:flex">
          <div className="hidden items-center gap-3 lg:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-2.5 py-2 font-function text-[0.64rem] font-semibold tracking-[.18em] no-underline transition duration-500 hover:bg-[rgba(217,189,122,.022)] hover:text-[rgba(244,235,221,.68)] ${
                  isActive(item.href)
                    ? "text-[rgba(216,183,111,.64)] after:absolute after:left-1/2 after:top-full after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-[rgba(216,183,111,.5)]"
                    : "text-[rgba(220,212,195,.44)]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <FlowButton href="/reflect" variant="ghost" className="min-h-10 px-5 opacity-[.4] hover:opacity-[.72]">
            照见一念
          </FlowButton>
        </div>
      </nav>
      <div className="one-thought-bottom-nav md:hidden" aria-label="底部轻导航">
        <a href="/zhixing-scroll">心卷</a>
        <a href="/one-thought-lake">心湖</a>
        <a href="/review">实盘</a>
        <a href="/reflect">一念</a>
      </div>
      <style jsx>{`
        :global(.home-nav-zhao) {
          position: relative;
          display: inline-flex;
          width: 2.35rem;
          height: 2.35rem;
          box-sizing: border-box;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(206, 228, 222, 0.2);
          border-radius: 999px;
          aspect-ratio: 1 / 1;
          color: rgba(206, 228, 222, 0.62);
          font-family: var(--font-yangming-title), "Songti SC", "STSong", serif;
          font-size: 1.02rem;
          font-weight: 300;
          line-height: 1;
          letter-spacing: 0.02em;
          opacity: 0.82;
          background:
            radial-gradient(circle at 50% 46%, rgba(238, 230, 210, 0.035), transparent 62%),
            rgba(7, 17, 18, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(206, 228, 222, 0.035),
            0 0 18px rgba(206, 228, 222, 0.035);
          text-shadow:
            0 0 12px rgba(238, 230, 210, 0.08),
            0 0 22px rgba(206, 228, 222, 0.055);
          transition:
            border-color 700ms ease,
            color 700ms ease,
            opacity 700ms ease,
            filter 700ms ease,
            box-shadow 700ms ease;
        }

        :global(.home-nav-zhao .home-nav-zhao-glyph) {
          width: 70%;
          height: 70%;
          color: currentColor;
          opacity: 0.78;
          filter:
            drop-shadow(0 0 10px rgba(238, 230, 210, 0.055))
            drop-shadow(0 0 18px rgba(206, 228, 222, 0.035));
        }

        :global(.home-nav-zhao)::after {
          content: "";
          position: absolute;
          inset: 9%;
          border: 1px solid rgba(206, 228, 222, 0.09);
          border-radius: inherit;
          opacity: 0.62;
        }

        .group:hover :global(.home-nav-zhao) {
          border-color: rgba(206, 228, 222, 0.34);
          color: rgba(238, 230, 210, 0.78);
          opacity: 0.95;
          filter: drop-shadow(0 0 18px rgba(206, 228, 222, 0.08));
          box-shadow:
            inset 0 0 0 1px rgba(206, 228, 222, 0.055),
            0 0 24px rgba(206, 228, 222, 0.065);
        }

        @media (min-width: 768px) {
          :global(.home-nav-zhao) {
            width: 2.65rem;
            height: 2.65rem;
            font-size: 1.14rem;
          }
        }

        .one-thought-bottom-nav {
          position: fixed;
          right: 4.8rem;
          bottom: max(0.85rem, env(safe-area-inset-bottom));
          left: 0.9rem;
          z-index: 42;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.28rem;
          border: 1px solid rgba(217, 189, 122, 0.1);
          border-radius: 999px;
          background: rgba(8, 8, 7, 0.42);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          padding: 0.28rem;
          backdrop-filter: blur(22px);
        }

        .one-thought-bottom-nav a {
          display: inline-flex;
          min-height: 2.25rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: rgba(220, 212, 195, 0.5);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-decoration: none;
          transition: background 500ms ease, color 500ms ease;
        }

        .one-thought-bottom-nav a:first-child {
          background: rgba(216, 183, 111, 0.08);
          color: rgba(216, 183, 111, 0.78);
        }

        .one-thought-bottom-nav a:hover {
          background: rgba(217, 189, 122, 0.08);
          color: rgba(244, 235, 221, 0.84);
        }

        @media (min-width: 768px) {
          .one-thought-bottom-nav {
            display: none;
          }
        }
      `}</style>
    </motion.header>
  )
}
