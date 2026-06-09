"use client"

import { motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import { FlowButton } from "@/components/home/flow-button"
import {
  assessmentStorageKeys,
  getSavedNickname,
  getSavedPhoneTail,
  setStorage,
} from "@/features/assessment/storage"

const navLinks = [
  { label: "知行心卷", href: "/reflect" },
  { label: "一念心湖", href: "/lake" },
  { label: "照见实盘", href: "/review" },
  { label: "档案馆", href: "/me/archive" },
] as const

const HOME_DIVE_DURATION_MS = 2400
const HOME_ROUTE_DELAY_MS = 2200

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const routeTimerRef = useRef<number | null>(null)
  const diveRafRef = useRef<number | null>(null)
  const isRoutingRef = useRef(false)
  const [scrollFade, setScrollFade] = useState(1)
  const [accountTail, setAccountTail] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountDraft, setAccountDraft] = useState("")
  const [isAccountOpen, setIsAccountOpen] = useState(false)

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

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current)
      if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)
      document.documentElement.removeAttribute("data-home-route-transition")
      window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive: 0 } }))
    }
  }, [])

  useEffect(() => {
    const savedName = getSavedNickname()
    setAccountTail(getSavedPhoneTail())
    setAccountName(savedName)
    setAccountDraft(savedName)
  }, [])

  function isActive(href: string) {
    if (href === "/reflect") return pathname === "/reflect" || pathname === "/assessment-entry"
    if (href === "/lake") return pathname === "/lake" || pathname === "/one-thought-lake"
    if (href === "/review") return pathname === "/review" || pathname === "/trade-review"
    if (href === "/me/archive") return pathname === "/me/archive" || pathname === "/mirror-archive"
    return pathname === href
  }

  const tweenHomeDive = useCallback((to: number, duration: number) => {
    if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)

    const start = performance.now()

    function tick(now: number) {
      const raw = Math.min((now - start) / duration, 1)
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const dive = to * eased

      window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive } }))

      if (raw < 1) {
        diveRafRef.current = window.requestAnimationFrame(tick)
      }
    }

    diveRafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const enterRouteThroughWater = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      if (isRoutingRef.current) return

      event.preventDefault()

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href)
        return
      }

      isRoutingRef.current = true
      document.documentElement.setAttribute("data-home-route-transition", "active")

      window.dispatchEvent(
        new CustomEvent("home-water-ripple", {
          detail: {
            life: 5600,
            max: Math.max(window.innerWidth, window.innerHeight) * 0.82,
            strength: 0.34,
            x: 0.24,
            y: 0.78,
          },
        }),
      )

      tweenHomeDive(1, HOME_DIVE_DURATION_MS)

      routeTimerRef.current = window.setTimeout(() => {
        router.push(href)
      }, HOME_ROUTE_DELAY_MS)
    },
    [router, tweenHomeDive],
  )

  const hasAccount = Boolean(accountTail || accountName)
  const accountLabel = accountName || (accountTail ? `尾号 ${accountTail}` : "")

  const saveAccountName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = accountDraft.trim().slice(0, 12)
    setAccountName(cleanName)
    setAccountDraft(cleanName)
    setStorage(assessmentStorageKeys.userNickname, cleanName)
  }

  return (
    <motion.header
      className="home-top-nav-shell font-function fixed inset-x-0 top-0 z-40 border-b border-[rgba(217,189,122,.01)] bg-[#080807]/3 backdrop-blur-2xl"
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
        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden items-center gap-3 lg:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => enterRouteThroughWater(event, item.href)}
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
          {hasAccount ? (
            <div className="home-account-area">
              <button
                type="button"
                className="home-account-chip"
                aria-expanded={isAccountOpen}
                aria-label={`照心账户，${accountLabel}`}
                onClick={() => setIsAccountOpen((current) => !current)}
              >
                <span>照</span>
                <span className="home-account-dot" aria-hidden="true">·</span>
                <span>{accountLabel}</span>
              </button>

              {isAccountOpen ? (
                <div className="home-account-panel">
                  <p className="home-account-title">照心账户</p>
                  <div className="home-account-meta">
                    <span>手机号尾号</span>
                    <strong>{accountTail || "未归档"}</strong>
                  </div>
                  <form className="home-account-form" onSubmit={saveAccountName}>
                    <label htmlFor="home-account-nickname">昵称</label>
                    <div>
                      <input
                        id="home-account-nickname"
                        value={accountDraft}
                        onChange={(event) => setAccountDraft(event.target.value.slice(0, 12))}
                        placeholder="给自己一个称呼"
                      />
                      <button type="submit">保存</button>
                    </div>
                  </form>
                  <p className="home-account-note">一个手机号归档测评、训练与复看记录。</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <FlowButton
            href="/reflect"
            variant="ghost"
            className="min-h-10 px-5 opacity-[.4] hover:opacity-[.72]"
            onClick={(event) => enterRouteThroughWater(event, "/reflect")}
          >
            照见一念
          </FlowButton>
        </div>
      </nav>
      <style jsx>{`
        .home-account-area {
          position: relative;
        }

        .home-account-chip {
          display: inline-flex;
          min-height: 2rem;
          align-items: center;
          gap: 0.48em;
          border: 0;
          background: transparent;
          padding: 0 0.15rem;
          color: rgba(220, 212, 195, 0.28);
          font-family: var(--font-interface);
          font-size: 0.62rem;
          font-weight: 400;
          letter-spacing: 0.16em;
          cursor: pointer;
          transition:
            color 500ms ease,
            opacity 500ms ease,
            text-shadow 500ms ease;
        }

        .home-account-chip:hover,
        .home-account-chip[aria-expanded="true"] {
          color: rgba(220, 212, 195, 0.5);
          text-shadow: 0 0 18px rgba(216, 183, 111, 0.08);
        }

        .home-account-dot {
          color: rgba(180, 157, 93, 0.26);
        }

        .home-account-panel {
          position: absolute;
          top: calc(100% + 0.55rem);
          right: 0;
          width: 240px;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 8px;
          background: rgba(5, 8, 7, 0.88);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(18px);
          padding: 0.9rem;
          color: rgba(220, 212, 195, 0.62);
        }

        .home-account-title {
          margin: 0 0 0.7rem;
          color: rgba(216, 183, 111, 0.66);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.16em;
        }

        .home-account-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.8rem;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
        }

        .home-account-meta strong {
          color: rgba(242, 235, 220, 0.74);
          font-weight: 500;
        }

        .home-account-form label {
          display: block;
          margin-bottom: 0.38rem;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
        }

        .home-account-form div {
          display: flex;
          gap: 0.42rem;
        }

        .home-account-form input {
          min-width: 0;
          flex: 1;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.18);
          padding: 0.42rem 0.65rem;
          color: rgba(242, 235, 220, 0.82);
          font-size: 0.74rem;
          outline: none;
        }

        .home-account-form input::placeholder {
          color: rgba(220, 212, 195, 0.28);
        }

        .home-account-form button {
          border: 1px solid rgba(172, 146, 83, 0.18);
          border-radius: 999px;
          background: rgba(169, 144, 82, 0.08);
          padding: 0.42rem 0.68rem;
          color: rgba(216, 183, 111, 0.74);
          font-size: 0.7rem;
          letter-spacing: 0.08em;
        }

        .home-account-note {
          margin: 0.78rem 0 0;
          color: rgba(220, 212, 195, 0.34);
          font-size: 0.66rem;
          line-height: 1.65;
          letter-spacing: 0.06em;
        }

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

        :global(html[data-home-route-transition="active"] .home-top-nav-shell) {
          opacity: 0.2 !important;
          filter: blur(2px);
          transition:
            opacity 900ms ease,
            filter 900ms ease;
        }

        @media (min-width: 768px) {
          :global(.home-nav-zhao) {
            width: 2.65rem;
            height: 2.65rem;
            font-size: 1.14rem;
          }
        }
      `}</style>
    </motion.header>
  )
}
