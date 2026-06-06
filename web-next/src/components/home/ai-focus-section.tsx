"use client"

import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const ORBIT_MIN_WIDTH = 560
const ORBIT_MAX_WIDTH = 1180
const ORBIT_MIN_HEIGHT = 340
const ORBIT_MAX_HEIGHT = 620
const COMPACT_BREAKPOINT = 640
const ORBIT_COMPACT_MIN_WIDTH = 252
const ORBIT_COMPACT_MAX_WIDTH = 348
const ORBIT_COMPACT_MIN_HEIGHT = 176
const ORBIT_COMPACT_MAX_HEIGHT = 222

type OrbitMetrics = {
  width: number
  height: number
  scale: number
}

const orbitNodes = [
  {
    key: "trigger",
    label: "触发",
    angle: -90,
    emphasis: "weak",
    offsetX: 0,
    offsetY: -8,
  },
  {
    key: "thought",
    label: "念头",
    angle: -28,
    emphasis: "normal",
    offsetX: 16,
    offsetY: 0,
  },
  {
    key: "action",
    label: "动作",
    angle: 45,
    emphasis: "normal",
    offsetX: 14,
    offsetY: 8,
  },
  {
    key: "result",
    label: "结果",
    angle: 132,
    emphasis: "strong",
    offsetX: -12,
    offsetY: 8,
  },
  {
    key: "retrigger",
    label: "再次触发",
    angle: 196,
    emphasis: "strong",
    offsetX: -20,
    offsetY: 0,
  },
] as const

const loopPresets = [
  {
    key: "hold_loss",
    title: "扛单之镜",
    stages: [
      { stage: "触发", shortText: "跌破计划。", longText: "价格跌破原本计划的位置。" },
      { stage: "念头", shortText: "再等等，\n也许会回来。", longText: "明知该止损，却还在等反弹。" },
      { stage: "动作", shortText: "补一笔，\n摊低成本。", longText: "用补仓降低成本，试图证明自己没错。" },
      { stage: "结果", shortText: "仓更重，\n心更乱。", longText: "补仓之后，仓位更重，心也更乱。" },
      { stage: "再次触发", shortText: "再跌一点，\n还想证明。", longText: "只要继续下跌，又想继续证明自己。" },
    ],
  },
  {
    key: "chase_rise",
    title: "追涨之镜",
    stages: [
      { stage: "触发", shortText: "连续三天\n上涨。", longText: "市场连续上涨，情绪被快速拉起。" },
      { stage: "念头", shortText: "再不上车，\n又错过了？", longText: "再不上车，是不是又错过机会了？" },
      { stage: "动作", shortText: "先进去，\n再说。", longText: "看到拉升后，先买进去，后面再看。" },
      { stage: "结果", shortText: "一回调，\n心就乱了。", longText: "一回调，心就开始乱了。" },
      { stage: "再次触发", shortText: "下一次拉升，\n还是会点。", longText: "下一次拉升，还是忍不住点进去。" },
    ],
  },
  {
    key: "empty_anxiety",
    title: "空仓焦虑之镜",
    stages: [
      { stage: "触发", shortText: "市场在涨，\n我还空着。", longText: "市场上涨，而自己仍然空仓。" },
      { stage: "念头", shortText: "是不是又\n错过了？", longText: "是不是又错过机会了？" },
      { stage: "动作", shortText: "先找机会，\n进去再说。", longText: "降低标准，临时寻找机会进场。" },
      { stage: "结果", shortText: "计划外，\n又进场。", longText: "做了计划外交易，开始怀疑自己。" },
      { stage: "再次触发", shortText: "一上涨，\n又坐不住。", longText: "下一次上涨，还是坐不住。" },
    ],
  },
  {
    key: "revenge_trade",
    title: "报复交易之镜",
    stages: [
      { stage: "触发", shortText: "刚亏一笔。", longText: "刚刚亏了一笔，心里开始不甘。" },
      { stage: "念头", shortText: "必须马上\n赢回来。", longText: "必须马上把亏损赢回来。" },
      { stage: "动作", shortText: "仓位加重，\n下得更快。", longText: "加快下单，加大仓位。" },
      { stage: "结果", shortText: "越急，\n亏得越快。", longText: "越急，亏得越快。" },
      { stage: "再次触发", shortText: "越不甘心，\n越想再来。", longText: "越不甘心，越想再来一次。" },
    ],
  },
  {
    key: "early_profit",
    title: "止盈过早之镜",
    stages: [
      { stage: "触发", shortText: "刚有浮盈。", longText: "刚有一点浮盈，心里开始紧。" },
      { stage: "念头", shortText: "先落袋，\n别亏回去。", longText: "先落袋吧，别再亏回去。" },
      { stage: "动作", shortText: "卖了，\n才踏实。", longText: "卖出之后，心里才踏实。" },
      { stage: "结果", shortText: "继续上涨，\n又怀疑自己。", longText: "行情继续走强，又开始怀疑自己。" },
      { stage: "再次触发", shortText: "下次赚钱，\n还是想跑。", longText: "下次刚一赚钱，还是想先跑。" },
    ],
  },
]

const personalityMirrorLibrary = [
  { persona: "冲动型", title: "追涨之镜", homeMirrorKeys: ["chase_rise"] },
  { persona: "扛单型", title: "扛单之镜", homeMirrorKeys: ["hold_loss"] },
  { persona: "完美型", title: "等完美点位之镜", homeMirrorKeys: [] },
  { persona: "赌徒型", title: "报复交易之镜", homeMirrorKeys: ["revenge_trade"] },
  { persona: "从众型", title: "跟风之镜", homeMirrorKeys: [] },
  { persona: "偏执型", title: "证明之镜", homeMirrorKeys: [] },
  { persona: "拖延型", title: "不复盘之镜", homeMirrorKeys: [] },
  { persona: "焦虑型", title: "空仓焦虑之镜", homeMirrorKeys: ["empty_anxiety", "early_profit"] },
  { persona: "平衡型", title: "守心之镜", homeMirrorKeys: [] },
] as const

const homeMirrorKeys = personalityMirrorLibrary.flatMap((mirror) => mirror.homeMirrorKeys)
const homeMirrorPresets = homeMirrorKeys
  .map((key) => loopPresets.find((preset) => preset.key === key))
  .filter((preset): preset is (typeof loopPresets)[number] => Boolean(preset))

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function getRandomLoopIndex() {
  return Math.floor(Math.random() * homeMirrorPresets.length)
}

function getNextLoopIndex(current: number) {
  return (current + 1) % homeMirrorPresets.length
}

function getOrbitMetrics(): OrbitMetrics {
  if (typeof window === "undefined") {
    return { width: 360, height: 360, scale: 360 }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isCompact = viewportWidth <= COMPACT_BREAKPOINT
  const verticalPadding = 24 + 28
  const stageHeight = viewportHeight - verticalPadding
  const sizeByHeight = stageHeight * (isCompact ? 0.58 : 0.68)

  if (isCompact) {
    const width = clamp(ORBIT_COMPACT_MIN_WIDTH, Math.min(viewportWidth * 0.78, sizeByHeight * 1.48), ORBIT_COMPACT_MAX_WIDTH)
    const height = clamp(ORBIT_COMPACT_MIN_HEIGHT, width * 0.58, ORBIT_COMPACT_MAX_HEIGHT)

    return { width, height, scale: height }
  }

  const width = clamp(ORBIT_MIN_WIDTH, Math.min(viewportWidth * 0.68, stageHeight * 1.58), ORBIT_MAX_WIDTH)
  const height = clamp(ORBIT_MIN_HEIGHT, Math.min(sizeByHeight, width * 0.54), ORBIT_MAX_HEIGHT)

  return { width, height, scale: height }
}

function getNodePosition(node: (typeof orbitNodes)[number], orbit: OrbitMetrics): CSSProperties {
  const centerX = orbit.width / 2
  const centerY = orbit.height / 2
  const isCompact = orbit.width <= ORBIT_COMPACT_MAX_WIDTH
  const radiusX = orbit.width * (isCompact ? 0.36 : 0.42)
  const radiusY = orbit.height * (isCompact ? 0.37 : 0.43)
  const offsetScale = isCompact ? 0.45 : 1
  const rad = (node.angle * Math.PI) / 180
  const x = centerX + Math.cos(rad) * radiusX + node.offsetX * offsetScale
  const y = centerY + Math.sin(rad) * radiusY + node.offsetY * offsetScale

  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: "translate(-50%, -50%)",
  }
}

function smartBreakChineseText(text: string, targetLength = 13) {
  if (!text) {
    return ""
  }

  const clean = String(text).trim()

  if (clean.length <= targetLength) {
    return clean
  }

  const punctuations = ["，", "。", "；", "、", ",", ";"]
  let bestIndex = -1
  let bestDistance = Infinity

  for (let i = 0; i < clean.length; i += 1) {
    if (punctuations.includes(clean[i])) {
      const indexAfterPunctuation = i + 1
      const distance = Math.abs(indexAfterPunctuation - targetLength)
      const leftLength = indexAfterPunctuation
      const rightLength = clean.length - indexAfterPunctuation

      if (rightLength >= 4 && leftLength >= 6 && distance < bestDistance) {
        bestIndex = indexAfterPunctuation
        bestDistance = distance
      }
    }
  }

  if (bestIndex === -1) {
    bestIndex = targetLength

    const rightLength = clean.length - bestIndex
    if (rightLength <= 2) {
      bestIndex = Math.max(6, clean.length - 5)
    }
  }

  const first = clean.slice(0, bestIndex)
  const second = clean.slice(bestIndex)

  if (second.length <= 2) {
    return clean
  }

  return `${first}\n${second}`
}

function formatCenterText(text: string) {
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join("\n")
  }

  const manualMap: Record<string, string> = {
    "价格跌破计划。": "价格跌破计划。",
    "再等等，也许会回来。": "再等等，\n也许会回来。",
    "补一笔，把成本摊低。": "补一笔，\n把成本摊低。",
    "仓位更重，心更乱。": "仓位更重，\n心更乱。",
    "只要再跌一点，又想继续证明自己。": "只要再跌一点，\n又想继续证明自己。",
    "你不是偶尔失控。你是在重复同一种反应。": "你不是偶尔失控。\n你是在重复同一种反应。",
    "而你，最常停在哪里？": "而你，\n最常停在哪里？",
    "连续三天上涨。": "连续三天上涨。",
    "又拉起来了，好像真要启动。": "又拉起来了，\n好像真要启动。",
    "再不上车，是不是又错过了？": "再不上车，\n是不是又错过了？",
    "一回调，心就开始乱了。": "一回调，\n心就开始乱了。",
    "下一次拉升，还是忍不住点进去。": "下一次拉升，\n还是忍不住点进去。",
    "先落袋吧，别再亏回去。": "先落袋吧，\n别再亏回去。",
    "卖了，心里才踏实。": "卖了，\n心里才踏实。",
    "它继续往上走，我又开始怀疑自己。": "它继续往上走，\n我又开始怀疑自己。",
    "下次刚一赚钱，我还是想先跑。": "下次刚一赚钱，\n我还是想先跑。",
    "不行，我得马上赢回来。": "不行，\n我得马上赢回来。",
    "这次重一点，一把扳回来。": "这次重一点，\n一把扳回来。",
    "越急，亏得越快。": "越急，\n亏得越快。",
    "越不甘心，越想再来一次。": "越不甘心，\n越想再来一次。",
    "它又涨了，可我还空着。": "它又涨了，\n可我还空着。",
    "标准先放低一点，进去再看。": "标准先放低一点，\n进去再看。",
    "进去了，却不是计划里的交易。": "进去了，\n却不是计划里的交易。",
    "下一次上涨，我还是坐不住。": "下一次上涨，\n我还是坐不住。",
  }

  return manualMap[text] ?? smartBreakChineseText(text, 13)
}

export function AiFocusSection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [orbitMetrics, setOrbitMetrics] = useState<OrbitMetrics>({ width: 360, height: 360, scale: 360 })
  const [hasEntered, setHasEntered] = useState(false)
  const [showMirror, setShowMirror] = useState(false)
  const [mirrorStage, setMirrorStage] = useState<"loop" | "ring" | "question" | "shifting">("loop")
  const activeCase = homeMirrorPresets[activeCaseIndex] ?? homeMirrorPresets[0]
  const activeStage = activeCase.stages[activeStep] ?? activeCase.stages[0]
  const centerText = mirrorStage === "question" ? "而你，\n最常停在哪里？" : activeStage.shortText
  const centerHint =
    mirrorStage === "ring" ? "循环" : mirrorStage === "question" ? "省察" : mirrorStage === "shifting" ? "变相" : orbitNodes[activeStep].label

  useLayoutEffect(() => {
    const updateOrbitSize = () => setOrbitMetrics(getOrbitMetrics())

    updateOrbitSize()
    window.addEventListener("resize", updateOrbitSize)
    return () => window.removeEventListener("resize", updateOrbitSize)
  }, [])

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    let isInView = false
    let frame = 0
    const updateVisibility = (nextIsVisible: boolean) => {
      if (nextIsVisible && !isInView) {
        isInView = true
        setActiveCaseIndex(getRandomLoopIndex())
        setActiveStep(0)
        setMirrorStage("loop")
        setShowMirror(false)
        setHasEntered(true)
      }

      if (!nextIsVisible && isInView) {
        isInView = false
        setHasEntered(false)
        setShowMirror(false)
        setMirrorStage("loop")
        setActiveStep(0)
      }
    }

    const measureVisibility = () => {
      const rect = element.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.28

      updateVisibility(isVisible)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        updateVisibility(entry.isIntersecting && entry.intersectionRatio >= 0.28)
      },
      { threshold: [0, 0.28, 0.5, 0.72] }
    )

    observer.observe(element)
    frame = window.requestAnimationFrame(measureVisibility)
    window.addEventListener("scroll", measureVisibility, { passive: true })
    window.addEventListener("resize", measureVisibility)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", measureVisibility)
      window.removeEventListener("resize", measureVisibility)
    }
  }, [])

  useEffect(() => {
    if (!hasEntered) return

    const timer = window.setTimeout(() => setShowMirror(true), 160)

    return () => window.clearTimeout(timer)
  }, [hasEntered])

  useEffect(() => {
    if (!showMirror || mirrorStage !== "loop") return

    const timer = window.setTimeout(() => {
      setActiveStep((current) => {
        if (current >= orbitNodes.length - 1) {
          setMirrorStage("ring")
          return current
        }

        return current + 1
      })
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [activeStep, mirrorStage, showMirror])

  useEffect(() => {
    if (mirrorStage !== "ring") return

    const timer = window.setTimeout(() => setMirrorStage("question"), 1500)

    return () => window.clearTimeout(timer)
  }, [mirrorStage])

  useEffect(() => {
    if (mirrorStage !== "question") return

    const timer = window.setTimeout(() => setMirrorStage("shifting"), 2300)

    return () => window.clearTimeout(timer)
  }, [mirrorStage])

  useEffect(() => {
    if (mirrorStage !== "shifting") return

    const timer = window.setTimeout(() => {
      setActiveCaseIndex((current) => getNextLoopIndex(current))
      setActiveStep(0)
      setMirrorStage("loop")
    }, 900)

    return () => window.clearTimeout(timer)
  }, [mirrorStage])

  const focusMirrorStep = (index: number) => {
    setMirrorStage("loop")
    setActiveStep(index)
  }

  const nudgeMirror = () => {
    setMirrorStage("loop")
    setActiveStep((current) => (current + 1) % orbitNodes.length)
  }

  return (
    <section
      ref={sectionRef}
      id="ai-focus"
      data-home-roll="ai-focus"
      aria-label="循环之镜交易心理回路"
      className={`loop-page relative z-10 ${showMirror ? "is-mirror-ready" : ""}`}
    >
      <main data-home-roll-plane className={`loop-stage ${showMirror ? "is-mirror-ready" : ""}`}>
        {showMirror ? (
          <motion.div
            className={`loop-orbit ${mirrorStage === "ring" || mirrorStage === "question" ? "is-ring-lit" : ""} ${
              mirrorStage === "shifting" ? "is-mirror-shifting" : ""
            }`}
            style={
              {
                "--orbit-width": `${orbitMetrics.width}px`,
                "--orbit-height": `${orbitMetrics.height}px`,
                "--orbit-scale": `${orbitMetrics.scale}px`,
              } as CSSProperties
            }
            initial={{ opacity: 0, filter: "blur(12px)", scale: 0.96 }}
            animate={{
              opacity: mirrorStage === "shifting" ? 0.52 : 1,
              filter: mirrorStage === "shifting" ? "blur(9px)" : "blur(0px)",
              scale: mirrorStage === "shifting" ? 0.965 : 1,
            }}
            transition={{
              opacity: { duration: mirrorStage === "shifting" ? 0.72 : 1.2, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: mirrorStage === "shifting" ? 0.72 : 1.2, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: mirrorStage === "shifting" ? 0.72 : 1.2, ease: [0.22, 1, 0.36, 1] },
            }}
            onClick={nudgeMirror}
            role="presentation"
          >
            <span className="orbit-outer-ring" />
            <span className="orbit-glow" />
            <span className="orbit-inner-ring" />
            <span className="orbit-axis" />

            <div className="orbit-center-title">{activeCase.title}</div>
            <motion.div
              key={`${activeCase.key}-${mirrorStage}-${activeStep}`}
              className="orbit-center-quote font-story"
              initial={{ opacity: 0, filter: "blur(5px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              {formatCenterText(centerText)}
            </motion.div>
            <div className="orbit-center-hint">{centerHint}</div>

            {orbitNodes.map((node, index) => {
              const isActive = mirrorStage === "ring" || (activeStep === index && mirrorStage === "loop")

              return (
                <button
                  key={node.key}
                  type="button"
                  className={`orbit-node orbit-node-${node.emphasis} ${isActive ? "is-active" : ""}`}
                  style={getNodePosition(node, orbitMetrics)}
                  onClick={(event) => {
                    event.stopPropagation()
                    focusMirrorStep(index)
                  }}
                  onMouseEnter={() => focusMirrorStep(index)}
                  onFocus={() => focusMirrorStep(index)}
                  aria-label={`照见${node.label}阶段`}
                >
                  <span className="orbit-node-dot" />
                  <span className="orbit-node-label">{node.label}</span>
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </main>

      <style jsx global>{`
        .loop-page {
          min-height: 100dvh;
          width: 100%;
          overflow: hidden;
          position: relative;
          --orbit-min-width: ${ORBIT_MIN_WIDTH}px;
          --orbit-max-width: ${ORBIT_MAX_WIDTH}px;
          --orbit-min-height: ${ORBIT_MIN_HEIGHT}px;
          --orbit-max-height: ${ORBIT_MAX_HEIGHT}px;
          --orbit-compact-min-width: ${ORBIT_COMPACT_MIN_WIDTH}px;
          --orbit-compact-max-width: ${ORBIT_COMPACT_MAX_WIDTH}px;
          background: transparent;
        }

        .loop-page::before {
          content: "";
          position: absolute;
          inset: -18svh 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 50% 48%, rgba(148, 118, 62, 0.1), transparent 42%),
            radial-gradient(ellipse at 18% 46%, rgba(127, 108, 62, 0.055), transparent 34%),
            radial-gradient(ellipse at 78% 48%, rgba(91, 72, 46, 0.05), transparent 38%);
          mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
        }

        .loop-page::after {
          content: none;
        }

        .loop-stage {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          padding: 24px 16px 28px;
          box-sizing: border-box;
        }

        .loop-orbit {
          width: var(--orbit-width);
          height: var(--orbit-height);
          position: relative;
          border-radius: 50%;
          transform: translateY(-10px);
          flex: 0 0 auto;
        }

        .loop-orbit.is-mirror-shifting .orbit-outer-ring {
          border-color: rgba(216, 183, 111, 0.12);
          box-shadow:
            0 0 42px rgba(216, 183, 111, 0.06),
            inset 0 0 38px rgba(216, 183, 111, 0.04);
          transition:
            border-color 720ms ease,
            box-shadow 720ms ease;
        }

        .loop-orbit.is-mirror-shifting .orbit-glow {
          inset: 15%;
          opacity: 0.46;
          transition:
            inset 720ms ease,
            opacity 720ms ease;
        }

        .orbit-outer-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(177, 148, 76, 0.16);
          box-shadow:
            0 0 80px rgba(165, 132, 66, 0.05),
            inset 0 0 60px rgba(165, 132, 66, 0.035);
          pointer-events: none;
        }

        .orbit-glow {
          position: absolute;
          inset: 7%;
          border-radius: 50%;
          background: radial-gradient(circle, transparent 54%, rgba(154, 122, 62, 0.055) 66%, transparent 78%);
          filter: blur(0.2px);
          animation: orbitBreath 8s ease-in-out infinite;
          pointer-events: none;
        }

        .orbit-inner-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: calc(var(--orbit-width) * 0.62);
          height: calc(var(--orbit-height) * 0.62);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 1px dashed rgba(185, 163, 119, 0.18);
          pointer-events: none;
        }

        .orbit-axis {
          position: absolute;
          left: 50%;
          top: 8%;
          width: 1px;
          height: 84%;
          transform: translateX(-50%);
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(178, 149, 82, 0.08) 20%,
            rgba(178, 149, 82, 0.16) 50%,
            rgba(178, 149, 82, 0.08) 80%,
            transparent
          );
          pointer-events: none;
        }

        .orbit-node {
          position: absolute;
          z-index: 6;
          border: 0;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          pointer-events: auto;
          cursor: pointer;
          background: transparent;
          font-family: var(--font-world);
          font-size: clamp(22px, calc(var(--orbit-scale) * 0.07), 32px);
          line-height: 1;
          letter-spacing: 0.06em;
          font-weight: 300;
          color: rgba(226, 219, 202, 0.58);
          transition:
            color 520ms ease,
            opacity 520ms ease,
            text-shadow 520ms ease;
        }

        .orbit-node-weak {
          color: rgba(232, 226, 211, 0.4);
        }

        .orbit-node-normal {
          color: rgba(226, 219, 202, 0.58);
        }

        .orbit-node-strong {
          color: rgba(232, 226, 211, 0.72);
        }

        .orbit-node.is-active {
          color: rgba(238, 232, 216, 0.86);
          text-shadow: 0 0 16px rgba(214, 184, 108, 0.14);
        }

        .loop-orbit.is-ring-lit .orbit-outer-ring {
          border-color: rgba(216, 183, 111, 0.3);
          box-shadow:
            0 0 96px rgba(216, 183, 111, 0.12),
            inset 0 0 72px rgba(216, 183, 111, 0.075);
          transition:
            border-color 1800ms ease,
            box-shadow 1800ms ease;
        }

        .loop-orbit.is-ring-lit .orbit-glow {
          opacity: 1;
          background: radial-gradient(ellipse, transparent 50%, rgba(216, 183, 111, 0.095) 66%, transparent 80%);
          transition:
            opacity 1800ms ease,
            background 1800ms ease;
        }

        .loop-orbit.is-ring-lit .orbit-inner-ring {
          border-color: rgba(216, 183, 111, 0.24);
          transition: border-color 1800ms ease;
        }

        .loop-orbit.is-ring-lit .orbit-node {
          color: rgba(238, 232, 216, 0.76);
          text-shadow: 0 0 14px rgba(214, 184, 108, 0.12);
        }

        .orbit-node-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(154, 122, 62, 0.75);
          box-shadow: 0 0 14px rgba(154, 122, 62, 0.35);
          flex: 0 0 auto;
          opacity: 0;
          transform: scale(0.64);
          transition:
            opacity 420ms ease,
            transform 420ms ease;
        }

        .orbit-node.is-active .orbit-node-dot {
          opacity: 1;
          transform: scale(1);
        }

        .orbit-node:hover,
        .orbit-node:focus-visible {
          color: rgba(238, 232, 216, 0.84);
          text-shadow: 0 0 14px rgba(214, 184, 108, 0.12);
        }

        .orbit-node:hover .orbit-node-dot,
        .orbit-node:focus-visible .orbit-node-dot {
          opacity: 1;
          transform: scale(1);
        }

        .orbit-node:focus-visible {
          outline: 1px solid rgba(216, 183, 111, 0.24);
          outline-offset: 6px;
          border-radius: 999px;
        }

        .orbit-center-title {
          position: absolute;
          z-index: 8;
          left: 50%;
          top: 35%;
          transform: translate(-50%, -50%);
          font-family: var(--font-world);
          font-size: clamp(16px, calc(var(--orbit-scale) * 0.048), 22px);
          line-height: 1;
          letter-spacing: 0.08em;
          font-weight: 500;
          color: rgba(175, 139, 67, 0.72);
          white-space: nowrap;
          pointer-events: none;
        }

        .orbit-center-quote {
          position: absolute;
          z-index: 8;
          left: 50%;
          top: 49%;
          transform: translate(-50%, -50%);
          width: calc(var(--orbit-width) * 0.62);
          text-align: center;
          white-space: pre-line;
          font-size: clamp(24px, calc(var(--orbit-scale) * 0.075), 34px);
          line-height: 1.62;
          letter-spacing: 0.04em;
          font-weight: 300;
          color: rgba(232, 226, 211, 0.78);
          text-shadow: 0 0 20px rgba(214, 184, 108, 0.08);
          pointer-events: none;
        }

        .orbit-center-hint {
          position: absolute;
          z-index: 8;
          left: 50%;
          top: 68%;
          transform: translate(-50%, -50%);
          font-family: var(--font-world);
          font-size: clamp(18px, calc(var(--orbit-scale) * 0.052), 24px);
          line-height: 1;
          letter-spacing: 0.08em;
          font-weight: 300;
          color: rgba(232, 226, 211, 0.36);
          white-space: nowrap;
          pointer-events: none;
        }

        @keyframes orbitBreath {
          0%,
          100% {
            opacity: 0.72;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: ${COMPACT_BREAKPOINT}px) {
          .loop-page {
            overflow-x: hidden;
          }

          .loop-page.is-mirror-ready {
            min-height: 74dvh;
          }

          .loop-stage {
            align-items: center;
            min-height: 100dvh;
            padding: 26px 18px max(30px, env(safe-area-inset-bottom));
          }

          .loop-stage.is-mirror-ready {
            align-items: flex-start;
            min-height: 74dvh;
            padding-top: clamp(66px, 9svh, 92px);
            padding-bottom: 22px;
          }

          .loop-orbit {
            transform: translateY(-6px);
            border-radius: 50%;
          }

          .orbit-outer-ring {
            border-color: rgba(177, 148, 76, 0.11);
            box-shadow:
              0 0 46px rgba(165, 132, 66, 0.035),
              inset 0 0 34px rgba(165, 132, 66, 0.025);
          }

          .orbit-glow {
            inset: 10%;
            opacity: 0.56;
            background: radial-gradient(circle, transparent 58%, rgba(154, 122, 62, 0.038) 68%, transparent 80%);
          }

          .orbit-inner-ring {
            width: calc(var(--orbit-width) * 0.58);
            height: calc(var(--orbit-height) * 0.58);
            border-color: rgba(185, 163, 119, 0.12);
          }

          .orbit-axis {
            top: 12%;
            height: 76%;
            opacity: 0.64;
          }

          .orbit-node {
            gap: 4px;
            font-size: clamp(11px, calc(var(--orbit-scale) * 0.047), 13px);
            letter-spacing: 0.04em;
            opacity: 0.48;
          }

          .orbit-node.is-active {
            opacity: 0.92;
            text-shadow: 0 0 10px rgba(214, 184, 108, 0.12);
          }

          .orbit-node-dot {
            width: 6px;
            height: 6px;
            box-shadow: 0 0 9px rgba(154, 122, 62, 0.26);
          }

          .orbit-center-title {
            top: 25%;
            font-size: clamp(12px, calc(var(--orbit-scale) * 0.048), 15px);
            letter-spacing: 0.1em;
            color: rgba(175, 139, 67, 0.58);
          }

          .orbit-center-quote {
            top: 52%;
            width: calc(var(--orbit-width) * 0.86);
            font-size: clamp(24px, calc(var(--orbit-scale) * 0.122), 29px);
            line-height: 1.46;
            letter-spacing: 0.035em;
            color: rgba(238, 232, 216, 0.86);
            text-shadow: 0 0 18px rgba(214, 184, 108, 0.07);
          }

          .orbit-center-hint {
            top: 76%;
            font-size: clamp(12px, calc(var(--orbit-scale) * 0.046), 15px);
            letter-spacing: 0.09em;
            color: rgba(232, 226, 211, 0.28);
          }
        }
      `}</style>
    </section>
  )
}
