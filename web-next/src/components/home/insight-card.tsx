"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

import { YangmingGlyph } from "@/components/brand/yangming-mark"

const waterSealEntries = [
  {
    href: "/reflect",
    glyph: "trade" as const,
    label: "照见一念",
    description: "从今日一念入照心。",
  },
  {
    href: "/review",
    glyph: "review" as const,
    label: "照见实盘",
    description: "只复盘谁在下单。",
  },
  {
    href: "/lake",
    glyph: "growth" as const,
    label: "一念心湖",
    description: "看见众人也如此。",
  },
]

export function InsightCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 34, rotateX: 3 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 2.1 }}
    >
      <motion.aside
        className="home-entry-dais relative min-h-[300px] overflow-visible px-1 py-3 md:px-2 md:py-4 lg:min-h-[470px]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2.55 }}
      >
        <div className="pointer-events-none absolute -inset-x-8 top-6 h-[72%] rounded-[55%] bg-[radial-gradient(ellipse_at_52%_38%,rgba(216,183,111,.052),transparent_58%),radial-gradient(ellipse_at_72%_64%,rgba(95,132,117,.085),transparent_66%)] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-2 top-[50%] h-28 bg-[radial-gradient(ellipse_at_center,rgba(238,230,210,.04),rgba(184,154,88,.035)_28%,transparent_72%)] opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-8 bottom-14 h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.11),rgba(244,235,221,.05),transparent)]" />
        <motion.div
          className="pointer-events-none absolute inset-x-3 top-[46%] h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.13),transparent)] opacity-0 mix-blend-screen"
          animate={{ opacity: [0, 0.18, 0], scaleX: [0.86, 1.08, 0.86] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3.2 }}
        />

        <div className="relative z-10">
          <p className="type-level-5 mb-5 w-fit rounded-full border border-[rgba(216,183,111,.055)] bg-[rgba(216,183,111,.012)] px-3 py-1 text-[rgba(216,183,111,.42)]">
            临盘观心
          </p>
          <p className="type-level-4 text-[rgba(216,183,111,.48)]">今日照见台</p>
          <h2 className="brand-card-title mt-2 md:mt-3">不急翻回</h2>
          <div className="mt-6 font-story text-[1.12rem] font-light leading-[1.95] text-[rgba(244,235,221,.66)] md:mt-8 md:text-[1.36rem]">
            <p>上一笔情绪</p>
            <p>不该替下一笔下单</p>
          </div>
        </div>

        <nav className="relative z-10 mt-10 grid gap-5 md:mt-12 md:gap-6" aria-label="今日照见入口">
          {waterSealEntries.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="home-water-seal group relative block overflow-hidden rounded-full px-5 py-4 transition duration-700 hover:bg-[rgba(216,183,111,.026)] hover:shadow-[0_0_34px_rgba(216,183,111,.055)] md:px-6 md:py-5"
            >
              <span className="pointer-events-none absolute inset-x-5 bottom-2 h-9 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(95,132,117,.13),transparent_70%)] opacity-50 blur-sm transition duration-700 group-hover:opacity-75" />
              <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.09),rgba(238,230,210,.035),transparent)] opacity-55 transition duration-700 group-hover:scale-x-105 group-hover:opacity-90" />
              <span className="pointer-events-none absolute inset-0 rounded-full border border-[rgba(216,183,111,.07)] transition duration-700 group-hover:border-[rgba(216,183,111,.18)]" />
              <span className="relative z-10 flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <YangmingGlyph kind={item.glyph} className="size-4 text-[rgba(216,183,111,.62)]" />
                  <span>
                    <strong className="brand-small-title block text-lg md:text-xl">{item.label}</strong>
                    <span className="mt-1 block font-story text-[0.82rem] leading-6 text-[rgba(220,212,195,.46)] md:text-[0.9rem]">
                      {item.description}
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-[rgba(216,183,111,.5)] transition duration-500 group-hover:translate-x-1 group-hover:text-[rgba(216,183,111,.82)]" />
              </span>
              {index === 2 ? (
                <span className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 font-story text-[0.78rem] tracking-[.12em] text-[rgba(238,230,210,.12)] blur-[1.5px] lg:block">
                  「再等等。」
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </motion.aside>
    </motion.div>
  )
}
