"use client"

import { motion } from "framer-motion"
import type { MouseEvent } from "react"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import { FlowButton } from "@/components/home/flow-button"

const navLinks = [
  { label: "知行心卷", href: "/zhixing-scroll" },
  { label: "一念心湖", href: "/one-thought-lake" },
  { label: "成长谱", href: "/living-mirror-growth" },
  { label: "真实复盘", href: "/trade-review" },
  { label: "档案馆", href: "/mirror-archive" },
] as const

export function TopNav() {
  function enterWorldview(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("personality")
    if (!target) return

    event.preventDefault()
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", "#personality")
  }

  return (
    <motion.header
      className="font-function fixed inset-x-0 top-0 z-40 border-b border-[rgba(217,189,122,.025)] bg-[#080807]/10 backdrop-blur-2xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="mx-auto flex min-h-16 w-full max-w-[1360px] items-center justify-between gap-6 px-5 md:min-h-[72px] md:px-8">
        <a href="#hero" className="group flex items-center gap-3 opacity-68 no-underline transition duration-700 hover:opacity-95">
          <span className="grid size-9 place-items-center rounded-full border border-[rgba(217,189,122,.085)] bg-[rgba(217,189,122,.018)] text-[rgba(216,183,111,.72)] shadow-[0_0_20px_rgba(216,183,111,.018)] transition duration-700 group-hover:border-[rgba(217,189,122,.2)] group-hover:text-[rgba(244,235,221,.82)] group-hover:shadow-[0_0_24px_rgba(216,183,111,.055)] md:size-10">
            <YangmingA1Mark className="size-6 md:size-7" title="阳明照见主标" />
          </span>
          <span className="flex flex-col">
            <strong className="type-level-5 text-[rgba(216,183,111,.62)]">阳明心学交易系统</strong>
            <em className="type-level-4 mt-1 text-[0.62rem] not-italic text-muted-cream opacity-42">见行情 · 见心 · 见人格</em>
          </span>
        </a>
        <div className="hidden items-center gap-2 md:flex">
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 font-function text-xs font-semibold tracking-[.16em] text-[rgba(220,212,195,.42)] no-underline transition duration-500 hover:bg-[rgba(217,189,122,.035)] hover:text-[rgba(244,235,221,.78)]"
              >
                {item.label}
              </a>
            ))}
          </div>
          <FlowButton href="#personality" variant="ghost" className="min-h-10 px-5 opacity-58 hover:opacity-90" onClick={enterWorldview}>
            开始照见
          </FlowButton>
        </div>
      </nav>
      <div className="one-thought-bottom-nav md:hidden" aria-label="底部轻导航">
        <a href="/zhixing-scroll">心卷</a>
        <a href="/one-thought-lake">心湖</a>
        <a href="#personality" onClick={enterWorldview}>照见</a>
      </div>
      <style jsx>{`
        .one-thought-bottom-nav {
          position: fixed;
          right: 4.8rem;
          bottom: max(0.85rem, env(safe-area-inset-bottom));
          left: 0.9rem;
          z-index: 42;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
