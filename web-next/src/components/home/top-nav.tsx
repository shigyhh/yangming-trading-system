"use client"

import { motion } from "framer-motion"

import { FlowButton } from "@/components/home/flow-button"

const navItems = [
  ["心性长卷", "#personality"],
  ["观心之路", "#ai-focus"],
  ["风险教育", "#compliance"],
]

export function TopNav() {
  return (
    <motion.header
      className="font-function fixed inset-x-0 top-0 z-40 border-b border-[rgba(217,189,122,.025)] bg-[#080807]/10 backdrop-blur-2xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="mx-auto flex min-h-16 w-full max-w-[1240px] items-center justify-between gap-6 px-4 md:min-h-[72px] md:px-8">
        <a href="#hero" className="group flex items-center gap-3 opacity-68 no-underline transition duration-700 hover:opacity-95">
          <span className="font-worldview grid size-9 place-items-center rounded-full border border-[rgba(217,189,122,.085)] bg-[rgba(217,189,122,.018)] text-lg text-[rgba(216,183,111,.66)] shadow-[0_0_20px_rgba(216,183,111,.018)] transition duration-700 group-hover:border-[rgba(217,189,122,.2)] group-hover:shadow-[0_0_24px_rgba(216,183,111,.055)] md:size-10 md:text-xl">
            心
          </span>
          <span className="flex flex-col">
            <strong className="type-level-5 text-[rgba(216,183,111,.62)]">阳明心学交易系统</strong>
            <em className="type-level-4 mt-1 text-[0.62rem] not-italic text-muted-cream opacity-42">见行情 · 见心 · 见人格</em>
          </span>
        </a>
        <div className="hidden items-center gap-7 text-[rgba(244,235,221,.44)] md:flex">
          {navItems.map(([label, href], index) => (
            <a
              key={href}
              href={href}
              className="type-level-5 group relative py-3 opacity-48 transition duration-700 hover:text-[rgba(216,183,111,.72)] hover:opacity-88"
            >
              {label}
              <span
                className={[
                  "absolute inset-x-0 bottom-1 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,transparent,#d8b76f,transparent)] opacity-0 transition duration-700 group-hover:scale-x-100 group-hover:opacity-56",
                  index === 0 ? "scale-x-100 opacity-24" : "",
                ].join(" ")}
              />
              {index === 0 ? (
                <span className="absolute inset-x-1 bottom-1 h-px bg-[#d8b76f]/12 blur-[2px]" />
              ) : null}
            </a>
          ))}
        </div>
        <div className="hidden sm:block">
          <FlowButton href="#personality" variant="ghost" className="min-h-10 px-5 opacity-58 hover:opacity-90">
            进入照心
          </FlowButton>
        </div>
      </nav>
    </motion.header>
  )
}
