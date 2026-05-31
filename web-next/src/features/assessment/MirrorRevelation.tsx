"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"

import type { AssessmentOption, AssessmentTag } from "./questions"
import { cn } from "@/lib/utils"

type MirrorProfile = {
  name: string
  verdict: string
}

const mirrorProfiles: Record<AssessmentTag, MirrorProfile> = {
  fomo_chaser: {
    name: "急心镜",
    verdict: "你不是看见机会，而是不愿让账户安静。",
  },
  panic_runner: {
    name: "惧心镜",
    verdict: "你不是谨慎，而是被上一笔亏损留下的影子牵住。",
  },
  hold_and_hope: {
    name: "痴心镜",
    verdict: "你不是在等行情回来，你是在等自己不用认错。",
  },
  prove_self: {
    name: "偏执镜",
    verdict: "你不是要赢这笔，你是在证明自己没有错。",
  },
  revenge_rescuer: {
    name: "贪心镜",
    verdict: "你不是在交易，你是在向上一笔亏损讨回说法。",
  },
  hesitant_watcher: {
    name: "慢心镜",
    verdict: "你不是没有看见机会，你是在等一个绝对安全的答案。",
  },
  over_control: {
    name: "疑心镜",
    verdict: "你不是缺信号，你是在寻找一个不会犯错的保证。",
  },
  numb_repeat: {
    name: "昧心镜",
    verdict: "你不是放下了，只是不愿再看见那一念。",
  },
  disciplined_observer: {
    name: "守心镜",
    verdict: "你能让手停下来，说明规则开始大过情绪。",
  },
}

type AssessmentMirror = {
  option: AssessmentOption
  profile: MirrorProfile
}

type MirrorRevelationProps = {
  questionId: string
  options: AssessmentOption[]
  selectedOptionId: string
  compact?: boolean
  onReveal: (optionId: string) => void
}

function getMirrorProfile(option: AssessmentOption) {
  return mirrorProfiles[option.tags[0]] ?? mirrorProfiles.disciplined_observer
}

function getRelativeIndex(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex

  if (offset > total / 2) offset -= total
  if (offset < total / 2 * -1) offset += total

  return offset
}

function getMirrorVisual(offset: number, compact?: boolean) {
  const distance = Math.abs(offset)
  const side = offset < 0 ? -1 : 1
  const spread = compact ? 92 : 128
  const maxOffset = compact ? 1.82 : 2.08
  const x = Math.max(maxOffset * -1, Math.min(offset, maxOffset)) * spread
  const y = distance === 0 ? -4 : distance === 1 ? 12 : 30
  const scale = Math.max(distance === 0 ? 1.16 : 0.94 - distance * 0.12, 0.68)
  const opacity = distance === 0 ? 1 : Math.max(0.72 - distance * 0.2, 0.2)
  const blur = distance === 0 ? 0 : Math.min(distance * 1.35, 3.6)
  const rotateY = distance === 0 ? 0 : side * -18

  return { x, y, scale, opacity, blur, rotateY, zIndex: 20 - distance }
}

export function MirrorRevelation({ questionId, options, selectedOptionId, compact, onReveal }: MirrorRevelationProps) {
  const mirrors = useMemo<AssessmentMirror[]>(
    () => options.map((option) => ({ option, profile: getMirrorProfile(option) })),
    [options],
  )
  const selectedIndex = Math.max(
    0,
    mirrors.findIndex((mirror) => mirror.option.id === selectedOptionId),
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const [revealedOptionId, setRevealedOptionId] = useState(selectedOptionId)
  const [paused, setPaused] = useState(Boolean(selectedOptionId))
  const touchStartXRef = useRef<number | null>(null)
  const releaseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (paused || revealedOptionId || mirrors.length <= 1) return

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % mirrors.length)
    }, 5200)

    return () => window.clearTimeout(timer)
  }, [activeIndex, mirrors.length, paused, revealedOptionId])

  useEffect(
    () => () => {
      if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current)
    },
    [],
  )

  const activeMirror = mirrors[activeIndex]
  const revealedMirror = mirrors.find((mirror) => mirror.option.id === revealedOptionId)

  const releasePauseSoon = () => {
    if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current)

    releaseTimerRef.current = window.setTimeout(() => {
      if (!revealedOptionId) setPaused(false)
    }, 1800)
  }

  const moveMirror = (direction: -1 | 1) => {
    setPaused(true)
    setActiveIndex((current) => (current + direction + mirrors.length) % mirrors.length)
    releasePauseSoon()
  }

  const revealMirror = (index: number, optionId: string) => {
    setPaused(true)
    setActiveIndex(index)
    setRevealedOptionId(optionId)
    onReveal(optionId)
  }

  return (
    <section
      className={cn("mirror-revelation", compact && "is-compact", revealedOptionId && "is-revealed")}
      aria-label="九面心镜 · 旋转观心"
      data-question-id={questionId}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!revealedOptionId) setPaused(false)
      }}
      onTouchStart={(event) => {
        touchStartXRef.current = event.touches[0]?.clientX ?? null
        setPaused(true)
      }}
      onTouchEnd={(event) => {
        const startX = touchStartXRef.current
        touchStartXRef.current = null
        if (startX === null) {
          releasePauseSoon()
          return
        }

        const endX = event.changedTouches[0]?.clientX ?? startX
        const deltaX = endX - startX
        if (Math.abs(deltaX) > 34) {
          moveMirror(deltaX > 0 ? -1 : 1)
          return
        }

        releasePauseSoon()
      }}
    >
      <div className="mirror-orbit" aria-hidden="true" />
      <p className="mirror-kicker">九面心镜 · 旋转观心</p>

      <div className="mirror-stage">
        {mirrors.map((mirror, index) => {
          const offset = getRelativeIndex(index, activeIndex, mirrors.length)
          const visual = getMirrorVisual(offset, compact)
          const isCurrent = index === activeIndex
          const isRevealed = mirror.option.id === revealedOptionId

          return (
            <motion.button
              key={mirror.option.id}
              type="button"
              aria-pressed={isRevealed}
              className={cn("mirror-card", isCurrent && "is-current", isRevealed && "is-card-revealed")}
              animate={{
                x: visual.x,
                y: visual.y,
                scale: visual.scale,
                opacity: visual.opacity,
                rotateY: visual.rotateY,
                filter: `blur(${visual.blur}px)`,
              }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              style={{ zIndex: visual.zIndex }}
              onClick={() => revealMirror(index, mirror.option.id)}
              onFocus={() => {
                setPaused(true)
                setActiveIndex(index)
              }}
              onBlur={() => {
                if (!revealedOptionId) setPaused(false)
              }}
            >
              <span className="mirror-sheen" aria-hidden="true" />
              <span className="mirror-name">{mirror.profile.name}</span>
              <span className="mirror-voice">{mirror.option.text}</span>
              <span className="mirror-action">{isRevealed ? "已照见" : "照见此念"}</span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={revealedMirror?.option.id ?? activeMirror?.option.id ?? "empty"}
          className="mirror-verdict"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {revealedMirror ? (
            <>
              <p className="mirror-verdict-label">心镜显现：{revealedMirror.profile.name}</p>
              <p className="mirror-verdict-text">{revealedMirror.profile.verdict}</p>
            </>
          ) : (
            <>
              <p className="mirror-verdict-label">等一面心镜靠近</p>
              <p className="mirror-verdict-text">{activeMirror?.option.text ?? "看见此念，再收下它。"}</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <style jsx>{`
        .mirror-revelation {
          position: relative;
          margin-top: 1.25rem;
          min-height: 386px;
          overflow: hidden;
          border-radius: 18px;
          perspective: 1000px;
        }

        .mirror-revelation::before {
          content: "";
          position: absolute;
          inset: 8% -22% 18%;
          background:
            radial-gradient(ellipse at 50% 48%, rgba(180, 157, 93, 0.12), transparent 48%),
            radial-gradient(circle at 40% 44%, rgba(220, 212, 195, 0.06), transparent 2px),
            radial-gradient(circle at 68% 36%, rgba(216, 183, 111, 0.075), transparent 1.5px);
          filter: blur(0.5px);
          opacity: 0.72;
          pointer-events: none;
        }

        .mirror-orbit {
          position: absolute;
          left: 50%;
          top: 46%;
          width: min(116%, 520px);
          height: 180px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 999px;
          background: radial-gradient(ellipse at 50% 50%, rgba(216, 183, 111, 0.055), transparent 63%);
          opacity: 0.82;
          pointer-events: none;
        }

        .mirror-kicker {
          position: relative;
          z-index: 22;
          margin: 0;
          text-align: center;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.62);
        }

        .mirror-stage {
          position: relative;
          z-index: 2;
          height: 292px;
          transform-style: preserve-3d;
        }

        .mirror-card {
          position: absolute;
          left: 50%;
          top: 50%;
          display: grid;
          width: clamp(138px, 42vw, 208px);
          height: clamp(208px, 58vw, 286px);
          transform-origin: center;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(172, 146, 83, 0.2);
          border-radius: 26px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.07), transparent 22%),
            radial-gradient(circle at 50% 38%, rgba(180, 157, 93, 0.11), transparent 54%),
            linear-gradient(180deg, rgba(18, 18, 15, 0.88), rgba(8, 8, 7, 0.72));
          box-shadow:
            0 28px 70px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -24px 40px rgba(0, 0, 0, 0.22);
          color: inherit;
          cursor: pointer;
          font: inherit;
          text-align: center;
          transform: translate(-50%, -50%);
          -webkit-tap-highlight-color: transparent;
        }

        .mirror-card::before {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(220, 212, 195, 0.06);
          border-radius: 20px;
          pointer-events: none;
        }

        .mirror-card::after {
          content: "";
          position: absolute;
          inset: 26px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.11), transparent 68%);
          opacity: 0;
          transform: scale(0.68);
          pointer-events: none;
        }

        .mirror-card.is-current {
          border-color: rgba(180, 157, 93, 0.42);
          box-shadow:
            0 34px 90px rgba(0, 0, 0, 0.46),
            0 0 46px rgba(180, 157, 93, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -26px 42px rgba(0, 0, 0, 0.24);
        }

        .mirror-card.is-current::after {
          opacity: 0.56;
          animation: mirror-breathe 6.8s ease-in-out infinite;
        }

        .mirror-card.is-card-revealed::after {
          animation: mirror-ripple 1.55s ease-out forwards;
        }

        .mirror-sheen {
          position: absolute;
          inset: -28% 50% 42% -24%;
          transform: rotate(21deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          opacity: 0.36;
          pointer-events: none;
        }

        .mirror-name,
        .mirror-voice,
        .mirror-action {
          position: relative;
          z-index: 2;
          display: block;
        }

        .mirror-name {
          align-self: end;
          font-family: var(--font-world);
          font-size: clamp(1rem, 4.2vw, 1.32rem);
          font-weight: 300;
          letter-spacing: 0.16em;
          color: rgba(216, 183, 111, 0.78);
          transform: translateX(0.08em);
        }

        .mirror-voice {
          width: 82%;
          align-self: center;
          font-family: var(--font-narrative);
          font-size: clamp(1rem, 4.8vw, 1.26rem);
          font-weight: 300;
          line-height: 1.62;
          letter-spacing: 0.05em;
          color: rgba(242, 235, 220, 0.82);
        }

        .mirror-action {
          align-self: start;
          font-family: var(--font-function);
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          color: rgba(220, 212, 195, 0.36);
        }

        .mirror-verdict {
          position: relative;
          z-index: 21;
          min-height: 92px;
          margin: -4px auto 0;
          text-align: center;
        }

        .mirror-verdict-label {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          color: rgba(180, 157, 93, 0.7);
        }

        .mirror-verdict-text {
          margin: 0.62rem auto 0;
          max-width: 22em;
          font-family: var(--font-narrative);
          font-size: clamp(1rem, 4.4vw, 1.18rem);
          font-weight: 300;
          line-height: 1.84;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.72);
        }

        .mirror-revelation.is-compact {
          min-height: 334px;
          margin-top: 1rem;
        }

        .mirror-revelation.is-compact .mirror-stage {
          height: 254px;
        }

        .mirror-revelation.is-compact .mirror-orbit {
          height: 142px;
          width: 108%;
        }

        .mirror-revelation.is-compact .mirror-verdict {
          min-height: 82px;
        }

        @keyframes mirror-breathe {
          0%,
          100% {
            opacity: 0.44;
            transform: scale(0.68);
          }

          50% {
            opacity: 0.74;
            transform: scale(0.86);
          }
        }

        @keyframes mirror-ripple {
          0% {
            opacity: 0.58;
            transform: scale(0.48);
          }

          100% {
            opacity: 0;
            transform: scale(1.72);
          }
        }

        @media (max-width: 380px) {
          .mirror-revelation {
            min-height: 326px;
          }

          .mirror-stage {
            height: 244px;
          }

          .mirror-card {
            width: 132px;
            height: 204px;
            border-radius: 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mirror-card,
          .mirror-card::after,
          .mirror-verdict {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  )
}
