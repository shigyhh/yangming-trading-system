"use client"

import { Eye } from "lucide-react"
import { motion } from "framer-motion"
import { getHomeDailyInsightCard } from "@yangming/content/home-insight"

import { YangmingGlyph } from "@/components/brand/yangming-mark"
import { Badge } from "@/components/ui/badge"
import { KLineSpirit } from "@/components/home/kline-spirit"

const glyphKindByIndex = ["trade", "review", "train", "growth"] as const

const energyBars = [0.44, 0.28, 0.54, 0.34, 0.48]

export function InsightCard() {
  const dailyInsight = getHomeDailyInsightCard()
  const orbitItems = [
    { glyph: "review" as const, label: dailyInsight.stageLabel, value: dailyInsight.stageValue },
    { glyph: "train" as const, label: dailyInsight.actionLabel, value: dailyInsight.actionValue },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 34, rotateX: 3 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 2.1 }}
    >
      <motion.aside
        className="relative min-h-[300px] overflow-hidden rounded-[1.5rem] border border-[rgba(217,189,122,.125)] ink-surface p-4 shadow-[0_22px_72px_rgba(0,0,0,.24)] backdrop-blur-2xl md:rounded-[2rem] md:p-7 md:shadow-[0_32px_104px_rgba(0,0,0,.28)] lg:min-h-[560px]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2.55 }}
        style={{ animation: "border-breath 14s ease-in-out infinite" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(216,183,111,.118),transparent_36%),radial-gradient(circle_at_88%_52%,rgba(95,132,117,.065),transparent_24rem)] md:bg-[radial-gradient(circle_at_50%_12%,rgba(216,183,111,.13),transparent_36%),radial-gradient(circle_at_88%_52%,rgba(95,132,117,.07),transparent_24rem)]" />
        <div className="absolute inset-0 opacity-[.06] [background-image:radial-gradient(circle,rgba(216,183,111,.22)_1px,transparent_1px)] [background-size:58px_58px] md:opacity-10" />
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(216,183,111,.045)_48%,transparent_62%)] opacity-0 mix-blend-screen"
          animate={{ opacity: [0, 0.14, 0], x: ["-32%", "32%", "-32%"] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3.2 }}
        />
        <motion.div
          className="absolute inset-0 rounded-[inherit] border border-[rgba(216,183,111,.18)]"
          animate={{ opacity: [0.16, 0.32, 0.16] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3 md:gap-4">
            <Badge className="type-level-5 group relative w-fit overflow-hidden rounded-full border border-[rgba(217,189,122,.06)] bg-[rgba(216,183,111,.012)] px-3 py-1 text-[rgba(216,183,111,.46)] shadow-none transition duration-700 hover:border-[rgba(217,189,122,.14)]">
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgba(255,246,206,.14),transparent)] transition duration-1000 group-hover:translate-x-full" />
              <Eye data-icon="inline-start" />
              <span className="relative">临盘观心</span>
            </Badge>
            <div>
              <p className="type-level-4 opacity-62">今日心证</p>
              <h2 className="brand-card-title mt-2 md:mt-3">
                {dailyInsight.heartProof}
              </h2>
            </div>
          </div>
        </div>

        <motion.div
          className="instrument-pane relative z-10 mt-5 rounded-2xl border border-[rgba(244,235,221,.035)] bg-[rgba(0,0,0,.06)] p-4 md:mt-10 md:rounded-3xl md:p-5"
          animate={{ y: [0, -1, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="type-level-4 opacity-54">{dailyInsight.reflectionTitle}</p>
          <p className="font-story mt-2 text-[1.12rem] font-light leading-[1.9] text-[rgba(244,235,221,.68)] md:mt-3 md:text-[1.48rem]">
            {dailyInsight.reflectionText}
          </p>
        </motion.div>

        <div className="relative z-10 mt-3 grid grid-cols-2 gap-3 md:mt-5 md:gap-4">
          {orbitItems.map((item) => (
            <div
              key={item.label}
              className="instrument-pane rounded-2xl border border-[rgba(244,235,221,.03)] bg-[rgba(0,0,0,.052)] p-3 md:rounded-3xl md:p-5"
            >
              <p className="type-level-4 flex items-center gap-2 text-[0.66rem] opacity-52 md:text-[0.7rem]">
                <YangmingGlyph kind={item.glyph} className="size-4 text-[rgba(216,183,111,.62)]" />
                <span>{item.label}</span>
              </p>
              <strong className="brand-small-title mt-1.5 block text-lg md:mt-2 md:text-xl">{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="instrument-pane relative z-10 mt-5 hidden rounded-3xl border border-[rgba(217,189,122,.075)] bg-[linear-gradient(90deg,rgba(95,132,117,.07),rgba(216,183,111,.04))] p-5 opacity-78 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] md:block">
          <p className="type-level-4 text-[rgba(216,183,111,.58)]">触发 · 念头 · 动作 · 复测</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <motion.i
                key={item}
                className="flex h-7 items-center justify-center rounded-full text-[rgba(216,183,111,.62)] drop-shadow-[0_0_10px_rgba(216,183,111,.12)]"
                animate={{ opacity: [0.42, 0.82, 0.42], scaleX: [0.82, 1, 0.82] }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: item * 0.7,
                }}
              >
                <YangmingGlyph kind={glyphKindByIndex[item]} className="size-5" />
              </motion.i>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[1] flex h-12 items-end gap-3 opacity-24 md:inset-x-8 md:bottom-8 md:h-16">
          {energyBars.map((height, index) => (
            <motion.i
              key={height + index}
              className="w-full rounded-full bg-[linear-gradient(180deg,rgba(216,183,111,.22),rgba(95,132,117,.05))]"
              style={{ height: `${height * 100}%` }}
              animate={{ opacity: [0.12, 0.34, 0.12], scaleY: [0.76, 1, 0.76] }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2.2 + index * 0.38,
              }}
            />
          ))}
        </div>

        <KLineSpirit />
      </motion.aside>
    </motion.div>
  )
}
