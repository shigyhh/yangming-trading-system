"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import {
  assessmentStorageKeys,
  getSavedNickname,
  getSavedPhoneTail,
  removeStorage,
  setStorage,
} from "@/features/assessment/storage"
import { STORAGE_KEYS } from "@/lib/user-flow/visitor-state"

const privateNavLinks = [
  { label: "今日所照", href: "/today-sealed" },
  { label: "真实复盘", href: "/trade-review" },
  { label: "档案馆", href: "/mind-archive" },
] as const

const publicNavLinks = [
  { label: "众念心湖", href: "/lake" },
] as const

export function TopNav() {
  const pathname = usePathname()
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
    const timer = window.setTimeout(() => {
      const savedName = getSavedNickname()
      setAccountTail(getSavedPhoneTail())
      setAccountName(savedName)
      setAccountDraft(savedName)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function isActive(href: string) {
    if (href === "/today-sealed") return pathname === "/today-sealed"
    if (href === "/lake") return pathname === "/lake" || pathname === "/one-thought-lake"
    if (href === "/trade-review") return pathname === "/review" || pathname === "/trade-review"
    if (href === "/mind-archive") {
      return pathname === "/mind-archive" || pathname === "/me/archive" || pathname === "/mirror-archive"
    }
    return pathname === href
  }

  const hasAccount = Boolean(accountTail || accountName)
  const accountLabel = accountName || (accountTail ? `尾号 ${accountTail}` : "")
  const navOpacity = Math.max(0.22, scrollFade * 0.82)
  const navLinkClass = (active: boolean) => `home-nav-link${active ? " is-active" : ""}`

  const saveAccountName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = accountDraft.trim().slice(0, 12)
    setAccountName(cleanName)
    setAccountDraft(cleanName)
    setStorage(assessmentStorageKeys.userNickname, cleanName)
  }

  const signOutAccount = () => {
    removeStorage(assessmentStorageKeys.userPhone)
    removeStorage(assessmentStorageKeys.phoneTail)
    removeStorage(assessmentStorageKeys.userNickname)
    removeStorage(assessmentStorageKeys.userCreatedAt)
    removeStorage(assessmentStorageKeys.skipEntryOpeningRitualOnce)
    removeStorage(assessmentStorageKeys.assessmentGatewayOnce)

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.homeIntroSeen)
      window.localStorage.removeItem(STORAGE_KEYS.firstReflectEntered)
      window.localStorage.removeItem(STORAGE_KEYS.draftInsightRecord)
    }

    setAccountTail("")
    setAccountName("")
    setAccountDraft("")
    setIsAccountOpen(false)
  }

  return (
    <motion.header
      className="home-top-nav-shell font-function fixed inset-x-0 top-0 z-40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: navOpacity, y: -(1 - scrollFade) * 12 }}
      whileHover={{ opacity: Math.max(0.62, navOpacity) }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: "auto" }}
    >
      <nav className="mx-auto flex min-h-16 w-full max-w-[1360px] items-center justify-between gap-6 px-5 md:min-h-[72px] md:px-8">
        <a href="#hero" className="home-nav-brand group flex items-center opacity-100 no-underline transition duration-700 hover:opacity-[.96]">
          <span className="home-nav-zhao" aria-hidden="true">
            <YangmingA1Mark className="home-nav-zhao-glyph" role="presentation" aria-hidden="true" />
            <span className="home-nav-zhao-water" />
          </span>
          <span className="home-nav-copy flex flex-col">
            <strong className="home-nav-title type-level-5">阳明心学交易系统</strong>
            <em className="home-nav-subtitle type-level-4 not-italic">见行情 · 见心 · 见人格</em>
          </span>
        </a>
        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden items-center gap-4 lg:flex" aria-label="首页辅助导航">
            {privateNavLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={navLinkClass(isActive(item.href))}
              >
                {item.label}
              </a>
            ))}
            <span className="home-nav-divider" aria-hidden="true" />
            {publicNavLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={navLinkClass(isActive(item.href))}
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
                  <button type="button" className="home-account-logout" onClick={signOutAccount}>
                    退出照心账户
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </nav>
      <style jsx>{`
        .home-top-nav-shell {
          border-bottom: 1px solid rgba(216, 183, 111, 0.035);
          background:
            linear-gradient(180deg, rgba(8, 8, 7, 0.2), rgba(8, 8, 7, 0.055)),
            linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.045) 18%, rgba(216, 183, 111, 0.06) 50%, rgba(216, 183, 111, 0.045) 82%, transparent);
          backdrop-filter: blur(22px);
          box-shadow:
            inset 0 -1px 0 rgba(216, 183, 111, 0.028),
            0 18px 60px rgba(0, 0, 0, 0.05);
        }

        .home-top-nav-shell::after {
          content: "";
          position: absolute;
          left: max(1.25rem, calc((100vw - 1360px) / 2 + 2rem));
          right: max(1.25rem, calc((100vw - 1360px) / 2 + 2rem));
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.1), rgba(216, 183, 111, 0.16), rgba(216, 183, 111, 0.1), transparent);
          opacity: 0.72;
          pointer-events: none;
        }

        .home-nav-brand {
          gap: 0.86rem;
        }

        .home-nav-copy {
          gap: 0.34rem;
          transform: translateY(0.02rem);
        }

        .home-nav-title {
          color: rgba(216, 183, 111, 0.9);
          font-weight: 560;
          letter-spacing: 0.075em;
          text-shadow:
            0 0 18px rgba(216, 183, 111, 0.055),
            0 0 28px rgba(0, 0, 0, 0.18);
        }

        .home-nav-subtitle {
          color: rgba(220, 215, 200, 0.72);
          font-size: 0.66rem;
          font-weight: 360;
          letter-spacing: 0.16em;
          line-height: 1;
          text-shadow: 0 0 18px rgba(0, 0, 0, 0.28);
        }

        .home-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 0.72rem 0.42rem;
          color: rgba(220, 212, 195, 0.76);
          font-family: var(--font-interface);
          font-size: 0.64rem;
          font-weight: 620;
          letter-spacing: 0.19em;
          text-decoration: none;
          transition:
            color 520ms ease,
            opacity 520ms ease,
            text-shadow 520ms ease,
            transform 520ms ease;
        }

        .home-nav-link::after {
          content: "";
          position: absolute;
          left: 0.42rem;
          right: 0.58rem;
          bottom: 0.38rem;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.38), transparent);
          opacity: 0;
          transform: scaleX(0.36);
          transform-origin: center;
          transition:
            opacity 520ms ease,
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .home-nav-link:hover,
        .home-nav-link.is-active {
          color: rgba(235, 218, 171, 0.9);
          text-shadow:
            0 0 16px rgba(216, 183, 111, 0.12),
            0 0 26px rgba(0, 0, 0, 0.22);
          transform: translateY(-0.5px);
        }

        .home-nav-link:hover::after,
        .home-nav-link.is-active::after {
          opacity: 0.72;
          transform: scaleX(1);
        }

        .home-account-area {
          position: relative;
        }

        .home-nav-divider {
          display: inline-block;
          width: 1px;
          height: 1.18rem;
          margin-inline: 0.62rem 0.4rem;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(216, 183, 111, 0.1) 16%,
            rgba(216, 183, 111, 0.28),
            rgba(216, 183, 111, 0.1) 84%,
            transparent
          );
          opacity: 0.72;
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

        .home-account-logout {
          width: 100%;
          margin-top: 0.72rem;
          border: 0;
          border-top: 1px solid rgba(172, 146, 83, 0.1);
          background: transparent;
          padding: 0.7rem 0 0;
          color: rgba(220, 212, 195, 0.38);
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-align: left;
          cursor: pointer;
          transition:
            color 360ms ease,
            border-color 360ms ease;
        }

        .home-account-logout:hover {
          border-color: rgba(172, 146, 83, 0.18);
          color: rgba(216, 183, 111, 0.7);
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
          border: 1px solid rgba(216, 183, 111, 0.24);
          border-radius: 999px;
          aspect-ratio: 1 / 1;
          color: rgba(216, 183, 111, 0.82);
          font-family: var(--font-yangming-title), "Songti SC", "STSong", serif;
          font-size: 1.02rem;
          font-weight: 300;
          line-height: 1;
          letter-spacing: 0.02em;
          opacity: 0.82;
          background:
            radial-gradient(circle at 50% 42%, rgba(230, 200, 134, 0.08), transparent 62%),
            rgba(7, 17, 18, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(216, 183, 111, 0.045),
            0 0 18px rgba(216, 183, 111, 0.04);
          text-shadow:
            0 0 12px rgba(230, 200, 134, 0.1),
            0 0 22px rgba(216, 183, 111, 0.07);
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
          opacity: 0.82;
          filter:
            drop-shadow(0 0 10px rgba(230, 200, 134, 0.08))
            drop-shadow(0 0 18px rgba(216, 183, 111, 0.05));
        }

        :global(.home-nav-zhao .home-nav-zhao-water) {
          position: absolute;
          left: 29%;
          right: 29%;
          bottom: 23%;
          height: 0.48rem;
          opacity: 0.72;
          background:
            linear-gradient(rgba(216, 183, 111, 0.34), rgba(216, 183, 111, 0.34)) center 0 / 100% 1px no-repeat,
            linear-gradient(rgba(216, 183, 111, 0.24), rgba(216, 183, 111, 0.24)) center 0.22rem / 72% 1px no-repeat,
            linear-gradient(rgba(216, 183, 111, 0.16), rgba(216, 183, 111, 0.16)) center 0.44rem / 44% 1px no-repeat;
          pointer-events: none;
        }

        :global(.home-nav-zhao)::after {
          content: "";
          position: absolute;
          inset: 9%;
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: inherit;
          opacity: 0.62;
        }

        .group:hover :global(.home-nav-zhao) {
          border-color: rgba(216, 183, 111, 0.38);
          color: rgba(242, 209, 132, 0.92);
          opacity: 0.95;
          filter: drop-shadow(0 0 18px rgba(216, 183, 111, 0.1));
          box-shadow:
            inset 0 0 0 1px rgba(216, 183, 111, 0.07),
            0 0 24px rgba(216, 183, 111, 0.08);
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
