"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { CSSProperties, MouseEvent, ReactNode, RefObject } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  getMirrorDefinition,
  getSealDefinition,
  type ZhixingNodeId,
  zhixingScrollNodes,
} from "./zhixingScrollDefinitions"
import {
  completeZhixingNode,
  getZhixingNodeStatus,
  getZhixingProgressLabel,
  loadDailyScroll,
  saveDailyScroll,
  type DailyScroll,
} from "./zhixingScrollStore"

type EntryStage = "hero" | "entering" | "entered"

const ENTRY_TRANSITION_MS = 2200

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function getDepthStyle(relativeDepth: number): CSSProperties {
  const d = Math.abs(relativeDepth)
  const opacity = d < 1
    ? lerp(1, 0.6, d)
    : d < 2
      ? lerp(0.6, 0.3, d - 1)
      : Math.max(0.12, 0.3 - (d - 2) * 0.14)
  const scale = d < 1
    ? lerp(1, 0.9, d)
    : d < 2
      ? lerp(0.9, 0.76, d - 1)
      : Math.max(0.64, 0.76 - (d - 2) * 0.1)
  const translateZ = -d * 210
  const translateY = relativeDepth * 22
  const blur = Math.min(12, d * 4)
  const brightness = clamp(opacity, 0.28, 1)

  return {
    opacity,
    transform: `translate3d(-50%, calc(-50% + ${translateY}vh), ${translateZ}px) scale(${scale})`,
    filter: `blur(${blur}px) brightness(${brightness})`,
    zIndex: Math.round(1000 - d * 100),
  }
}

function getDepthNodeCopy(node: (typeof zhixingScrollNodes)[number], scroll: DailyScroll) {
  const mirror = getMirrorDefinition(scroll.primaryMirror)
  const seal = getSealDefinition(scroll.seal.id)

  switch (node.id) {
    case "today-thought":
      return `今日浮现：「${scroll.currentThought}」。先不急着判断，只看见它。`
    case "heart-thief":
      return `这一念里，最重的是：${scroll.heartThief}。先照见，不压住。`
    case "nine-mirror":
      return `你最容易进入：${mirror.name}。它不是你，只是你常进入的房间。`
    case "daily-evidence":
      return scroll.dailyEvidence
    case "daily-practice":
      return scroll.dailyPractice
    case "liangzhi-seal":
      return scroll.seal.sealedAt
        ? `已落印：${seal.name}。致良知，是念起时知道是谁在下单。`
        : `今日所守：${seal.name}。${seal.practiceAction}`
    case "daily-verdict":
      return scroll.verdict
    case "heart-archive":
      return "今日一念、心贼、主镜、修行与判词，将归入心镜档案。"
    case "hundred-day-scroll":
      return "从一日一念，到百日一卷。久看长卷，才看见自己如何变清明。"
    case "course-live":
      return `今日主镜为${mirror.name}。课程只承接当前问题，不在首页硬推。`
    default:
      return node.copy
  }
}

function InkMistStage() {
  return (
    <div className="zhixing-mist" aria-hidden="true">
      <span className="zhixing-mist__wash zhixing-mist__wash--left" />
      <span className="zhixing-mist__wash zhixing-mist__wash--right" />
      <span className="zhixing-mist__wash zhixing-mist__wash--center" />
      <span className="zhixing-mist__path" />
      <span className="zhixing-mist__void" />
    </div>
  )
}

function GoldenDustField({ gathering = false }: { gathering?: boolean }) {
  const dust = useMemo(() => Array.from({ length: 80 }, (_, index) => ({
    id: index,
    left: 7 + ((index * 19) % 86),
    top: 10 + ((index * 31) % 78),
    delay: (index % 13) * 0.7,
    duration: 13 + (index % 9),
    size: 0.75 + (index % 5) * 0.34,
  })), [])

  return (
    <div className={`zhixing-dust ${gathering ? "zhixing-dust--gathering" : ""}`} aria-hidden="true">
      {dust.map((item) => (
        <span
          key={item.id}
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            width: `${item.size}px`,
            height: `${item.size}px`,
            "--dust-gather-x": `${50 - item.left}vw`,
            "--dust-gather-y": `${50 - item.top}vh`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function EntryGateHero({
  entryStage,
  onStart,
}: {
  entryStage: EntryStage
  onStart: () => void
}) {
  return (
    <section className="zhixing-hero" aria-label="心镜长卷首屏">
      <motion.div
        className="zhixing-hero__content"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="zhixing-heartfire" aria-hidden="true" />
        <h1>交易前，先展开一卷。</h1>
        <p>市场未动，心已先动。<br />一念不照，万法皆乱。</p>
        <div className="zhixing-hero__actions" aria-label="心镜长卷入口">
          <button className="zhixing-start" type="button" onClick={onStart} disabled={entryStage === "entering"}>
            开始今日一卷
          </button>
          <button className="zhixing-quiet-action" type="button" onClick={onStart} disabled={entryStage === "entering"}>
            90 秒看懂心镜长卷
          </button>
          <button className="zhixing-quiet-action zhixing-quiet-action--urgent" type="button" onClick={onStart} disabled={entryStage === "entering"}>
            临盘心乱，先急救
          </button>
        </div>
      </motion.div>
    </section>
  )
}

function EnterScrollTransition({ entryStage }: { entryStage: EntryStage }) {
  if (entryStage !== "entering") return null

  return (
    <div className="zhixing-enter-transition" aria-hidden="true">
      <span className="zhixing-enter-transition__fire" />
      <span className="zhixing-enter-transition__spine" />
      <span className="zhixing-enter-transition__mist" />
      <span className="zhixing-enter-transition__node">
        <em>01 · 未发之中</em>
        <strong>入照心</strong>
      </span>
      <span className="zhixing-enter-transition__future">今日一念</span>
    </div>
  )
}

function ScrollNarrativeContainer({
  children,
  stageRef,
}: {
  children: ReactNode
  stageRef: RefObject<HTMLElement | null>
}) {
  return (
    <section ref={stageRef} className="zhixing-stage" aria-label="今日心镜长卷">
      {children}
    </section>
  )
}

function InkPathSpine() {
  const spinePath = "M633 -80 C450 120 820 190 610 330 C400 470 780 540 594 690 C452 806 658 900 538 1010"

  return (
    <svg className="ink-path-spine" viewBox="0 0 1200 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="inkPathSoftBleed" x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="inkPathSpineBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(216, 183, 111, 0)" />
          <stop offset="20%" stopColor="rgba(216, 183, 111, 0.055)" />
          <stop offset="52%" stopColor="rgba(216, 183, 111, 0.12)" />
          <stop offset="78%" stopColor="rgba(216, 183, 111, 0.04)" />
          <stop offset="100%" stopColor="rgba(216, 183, 111, 0)" />
        </linearGradient>
        <linearGradient id="inkPathSpineCompleted" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(84, 69, 42, 0.02)" />
          <stop offset="26%" stopColor="rgba(94, 76, 45, 0.105)" />
          <stop offset="48%" stopColor="rgba(94, 76, 45, 0.055)" />
          <stop offset="100%" stopColor="rgba(94, 76, 45, 0)" />
        </linearGradient>
        <linearGradient id="inkPathSpineCurrent" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(244, 223, 155, 0)" />
          <stop offset="43%" stopColor="rgba(244, 223, 155, 0.02)" />
          <stop offset="49%" stopColor="rgba(244, 223, 155, 0.46)" />
          <stop offset="55%" stopColor="rgba(216, 183, 111, 0.2)" />
          <stop offset="100%" stopColor="rgba(244, 223, 155, 0)" />
        </linearGradient>
        <linearGradient id="inkPathSpineFutureMist" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(5, 8, 7, 0)" />
          <stop offset="66%" stopColor="rgba(5, 8, 7, 0.08)" />
          <stop offset="100%" stopColor="rgba(5, 8, 7, 0.56)" />
        </linearGradient>
      </defs>
      <path
        className="ink-path-spine__bleed"
        d={spinePath}
        fill="none"
        stroke="url(#inkPathSpineBase)"
        strokeLinecap="round"
        strokeWidth="34"
        filter="url(#inkPathSoftBleed)"
      />
      <path
        className="ink-path-spine__completed-shadow"
        d={spinePath}
        fill="none"
        stroke="url(#inkPathSpineCompleted)"
        strokeLinecap="round"
        strokeWidth="9"
      />
      <path
        className="ink-path-spine__thread"
        d={spinePath}
        fill="none"
        pathLength="1"
        stroke="rgba(216, 183, 111, 0.13)"
        strokeDasharray="0.018 0.044"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        className="ink-path-spine__current-light"
        d={spinePath}
        fill="none"
        pathLength="1"
        stroke="url(#inkPathSpineCurrent)"
        strokeDasharray="0.18 1"
        strokeDashoffset="-0.41"
        strokeLinecap="round"
        strokeWidth="4"
        filter="url(#inkPathSoftBleed)"
      />
      <path
        className="ink-path-spine__future-mist"
        d={spinePath}
        fill="none"
        stroke="url(#inkPathSpineFutureMist)"
        strokeLinecap="round"
        strokeWidth="48"
      />
    </svg>
  )
}

function MistDepthLayer() {
  return (
    <div className="mist-depth-layer" aria-hidden="true">
      <span className="mist-depth-layer__veil mist-depth-layer__veil--top" />
      <span className="mist-depth-layer__veil mist-depth-layer__veil--center" />
      <span className="mist-depth-layer__veil mist-depth-layer__veil--bottom" />
    </div>
  )
}

function DepthScrollStage({ children }: { children: ReactNode }) {
  return (
    <div className="depth-scroll-stage">
      <MistDepthLayer />
      <InkPathSpine />
      {children}
      <p className="depth-scroll-compliance">本系统仅用于交易认知、纪律训练与复盘；不荐股、不喊单、不承诺收益。</p>
    </div>
  )
}

function DepthScrollNode({
  node,
  index,
  status,
  relativeDepth,
  style,
  scroll,
  href,
  onClick,
}: {
  node: (typeof zhixingScrollNodes)[number]
  index: number
  status: ReturnType<typeof getZhixingNodeStatus>
  relativeDepth: number
  style: CSSProperties
  scroll: DailyScroll
  href: string
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const absoluteDepth = Math.abs(relativeDepth)
  const isFuture = status === "locked"
  const isNear = absoluteDepth < 0.52
  const visualState = isNear ? "active" : relativeDepth < 0 ? "past" : "future"
  const showBody = absoluteDepth < 0.78
  const copy = getDepthNodeCopy(node, scroll)

  return (
    <li
      className={`depth-scroll-node depth-scroll-node--${visualState} zhixing-node zhixing-node--${status} ${isNear ? "depth-scroll-node--near" : ""}`}
      style={style}
      aria-current={isNear ? "step" : undefined}
    >
      <article>
        <span className="zhixing-water-ripple" aria-hidden="true" />
        <span className="zhixing-water-shadow" aria-hidden="true" />
        {status === "completed" ? <LiangzhiSeal sealed /> : null}
        <h3>{node.title}</h3>
        {showBody && isFuture ? (
          <p className="zhixing-node__future-copy">雾中未至，待上一节点照见。</p>
        ) : showBody ? (
          <p>{copy}</p>
        ) : null}
        {showBody ? (
          <a
            href={href}
            aria-disabled={isFuture}
            onClick={onClick}
            className="zhixing-water-action"
          >
            {isFuture ? "待照见后开启" : status === "completed" ? "轻触回看这一面" : "轻触水面，继续照见"}
          </a>
        ) : (
          <span className="depth-scroll-node__glow" aria-hidden="true" />
        )}
      </article>
    </li>
  )
}

function PerspectiveScrollNarrative({
  scroll,
  scrollProgress,
  rootRef,
  onNodeLink,
  onVerdictLink,
}: {
  scroll: DailyScroll
  scrollProgress: number
  rootRef: RefObject<HTMLDivElement | null>
  onNodeLink: (event: MouseEvent<HTMLAnchorElement>, nodeId: ZhixingNodeId, href: string, index: number) => void
  onVerdictLink: (event: MouseEvent<HTMLAnchorElement>, index: number) => void
}) {
  const progressLabel = getZhixingProgressLabel(scroll)

  return (
    <div
      ref={rootRef}
      className="depth-scroll-root"
      style={{ minHeight: `${zhixingScrollNodes.length * 100}svh` }}
    >
      <div className="depth-scroll-track" aria-hidden="true">
        {zhixingScrollNodes.map((node) => (
          <section key={node.id} className="scroll-anchor" />
        ))}
      </div>
      <DepthScrollStage>
        <div className="depth-stage-kicker">
          <p>今日心镜长卷 · {scroll.date}</p>
          <span>{progressLabel}。沿心路入卷，只照今日一念。</span>
        </div>
        <div className="depth-node-layer">
          {zhixingScrollNodes.map((node, index) => {
            const status = getZhixingNodeStatus(node.id, scroll)
            const relativeDepth = index - scrollProgress
            const isVerdictNode = node.id === "daily-verdict"
            const href = isVerdictNode ? "#verdict" : node.href

            return (
              <DepthScrollNode
                key={node.id}
                node={node}
                index={index}
                status={status}
                relativeDepth={relativeDepth}
                style={getDepthStyle(relativeDepth)}
                scroll={scroll}
                href={href}
                onClick={(event) => isVerdictNode ? onVerdictLink(event, index) : onNodeLink(event, node.id, node.href, index)}
              />
            )
          })}
        </div>
      </DepthScrollStage>
    </div>
  )
}

function LiangzhiSeal({ sealed }: { sealed: boolean }) {
  return (
    <span className={`zhixing-seal ${sealed ? "zhixing-seal--sealed" : ""}`} aria-label={sealed ? "已落印" : "未落印"}>
      知行
    </span>
  )
}

export function ZhixingScrollHome() {
  const [scroll, setScroll] = useState<DailyScroll>(() => loadDailyScroll(null))
  const [entryStage, setEntryStage] = useState<EntryStage>("hero")
  const [scrollProgress, setScrollProgress] = useState(0)
  const stageRef = useRef<HTMLElement | null>(null)
  const depthRootRef = useRef<HTMLDivElement | null>(null)
  const snapTimerRef = useRef<number | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setScroll(loadDailyScroll(getBrowserStorage()))
  }, [])

  const isEntering = entryStage === "entering"
  const isEntered = entryStage === "entered"

  useEffect(() => {
    if (!isEntered) return undefined

    const root = depthRootRef.current
    if (!root) return undefined

    function updateProgress() {
      const target = depthRootRef.current
      if (!target) return

      const rect = target.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 1
      const maxProgress = Math.max(0, zhixingScrollNodes.length - 1)
      const nextProgress = clamp(-rect.top / viewportHeight, 0, maxProgress)
      setScrollProgress(nextProgress)

      if (shouldReduceMotion) return
      if (rect.top > 10 || rect.bottom < viewportHeight - 10) return

      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current)
      }
      snapTimerRef.current = window.setTimeout(() => {
        const latestTarget = depthRootRef.current
        if (!latestTarget) return
        const latestTop = window.scrollY + latestTarget.getBoundingClientRect().top
        const nearest = Math.round(nextProgress)
        window.scrollTo({
          top: latestTop + nearest * viewportHeight,
          behavior: "smooth",
        })
      }, 180)
    }

    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })
    window.addEventListener("resize", updateProgress)

    return () => {
      window.removeEventListener("scroll", updateProgress)
      window.removeEventListener("resize", updateProgress)
      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current)
      }
    }
  }, [isEntered, shouldReduceMotion])

  function scrollToDepthIndex(index: number) {
    const root = depthRootRef.current
    if (!root) return
    const viewportHeight = window.innerHeight || 1
    const rootTop = window.scrollY + root.getBoundingClientRect().top
    const nextIndex = clamp(index, 0, zhixingScrollNodes.length - 1)
    window.scrollTo({
      top: rootTop + nextIndex * viewportHeight,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    })
  }

  function enterScroll() {
    if (entryStage !== "hero") return

    setEntryStage("entering")
    window.setTimeout(() => {
      setEntryStage("entered")
    }, shouldReduceMotion ? 80 : ENTRY_TRANSITION_MS)
  }

  function completeNode(nodeId: ZhixingNodeId) {
    const nextScroll = completeZhixingNode(scroll, nodeId)
    setScroll(nextScroll)
    saveDailyScroll(nextScroll, getBrowserStorage())
    return nextScroll
  }

  function handleNodeClick(event: MouseEvent<HTMLAnchorElement>, nodeId: ZhixingNodeId, href: string, index: number) {
    const status = getZhixingNodeStatus(nodeId, scroll)
    event.preventDefault()

    if (status === "locked") {
      return
    }

    completeNode(nodeId)
    scrollToDepthIndex(index + 1)
    if (href.startsWith("#")) {
      window.history.replaceState(null, "", href)
      return
    }

    window.setTimeout(() => {
      window.location.href = href
    }, shouldReduceMotion ? 80 : 520)
  }

  function generateVerdict(event: MouseEvent<HTMLAnchorElement>, index = zhixingScrollNodes.findIndex((node) => node.id === "daily-verdict")) {
    event.preventDefault()
    const nextScroll = completeNode("daily-verdict")
    setEntryStage("entered")
    saveDailyScroll(nextScroll, getBrowserStorage())
    window.setTimeout(() => {
      scrollToDepthIndex(index)
      window.history.replaceState(null, "", "#daily-verdict")
    }, shouldReduceMotion ? 80 : 260)
  }

  return (
    <main className={`zhixing-page zhixing-page--${entryStage}`}>
      <InkMistStage />
      <GoldenDustField gathering={isEntering} />
      <EnterScrollTransition entryStage={entryStage} />
      <EntryGateHero entryStage={entryStage} onStart={enterScroll} />

      {isEntered ? (
        <ScrollNarrativeContainer stageRef={stageRef}>
          <PerspectiveScrollNarrative
            scroll={scroll}
            scrollProgress={scrollProgress}
            rootRef={depthRootRef}
            onNodeLink={handleNodeClick}
            onVerdictLink={generateVerdict}
          />
        </ScrollNarrativeContainer>
      ) : null}

      <style jsx global>{`
        .zhixing-page {
          position: relative;
          min-height: 100svh;
          overflow-x: clip;
          overflow-y: visible;
          --zhixing-ink: #050807;
          --zhixing-ink-deep: #020403;
          --zhixing-ivory: rgba(244, 235, 221, 0.9);
          --zhixing-muted: rgba(220, 212, 195, 0.56);
          --zhixing-gold: rgba(216, 183, 111, 0.72);
          background:
            radial-gradient(circle at 50% 18%, rgba(95, 132, 117, 0.16), transparent 34rem),
            radial-gradient(circle at 50% 78%, rgba(216, 183, 111, 0.1), transparent 38rem),
            linear-gradient(180deg, #050807 0%, #07110e 46%, #030504 100%);
          color: var(--ym-text-primary);
          transition: background 900ms var(--ym-motion-ease-out);
        }

        .zhixing-page--entering {
          background:
            radial-gradient(circle at 50% 42%, rgba(216, 183, 111, 0.08), transparent 26rem),
            radial-gradient(circle at 50% 76%, rgba(95, 132, 117, 0.08), transparent 34rem),
            linear-gradient(180deg, #020403 0%, #050b09 52%, #020403 100%);
        }

        .zhixing-mist,
        .zhixing-dust {
          pointer-events: none;
          position: fixed;
          inset: 0;
        }

        .zhixing-mist { z-index: 1; }
        .zhixing-dust { z-index: 2; }

        .zhixing-mist__wash,
        .zhixing-mist__path,
        .zhixing-mist__void {
          position: absolute;
          display: block;
        }

        .zhixing-mist__wash {
          width: 46vw;
          height: 58vh;
          border-radius: 50%;
          filter: blur(70px);
          opacity: 0.42;
          animation: zhixing-mist-breathe 18s ease-in-out infinite;
        }

        .zhixing-mist__wash--left {
          left: -12vw;
          top: 18vh;
          background: rgba(18, 35, 29, 0.36);
        }

        .zhixing-mist__wash--right {
          right: -10vw;
          bottom: 5vh;
          background: rgba(69, 55, 28, 0.22);
          animation-delay: -6s;
        }

        .zhixing-mist__wash--center {
          left: 50%;
          top: 48%;
          width: min(62vw, 920px);
          height: 42vh;
          transform: translate(-50%, -50%);
          background: rgba(18, 35, 29, 0.18);
          opacity: 0.22;
          animation-delay: -9s;
        }

        .zhixing-mist__path {
          left: 50%;
          top: 18vh;
          width: min(78vw, 920px);
          height: 140vh;
          transform: translateX(-50%) perspective(900px) rotateX(66deg);
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(216, 183, 111, 0.12), rgba(216, 183, 111, 0.025) 38%, transparent 68%),
            linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.11), transparent);
          filter: blur(2px);
          opacity: 0.46;
          transition: opacity 1200ms var(--ym-motion-ease-out), transform 1200ms var(--ym-motion-ease-out);
        }

        .zhixing-page--entered .zhixing-mist__path {
          opacity: 0.72;
          transform: translateX(-50%) perspective(980px) rotateX(69deg) translateY(-2vh);
        }

        .zhixing-mist__void {
          left: 50%;
          top: 48%;
          width: 36vw;
          max-width: 520px;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 0, 0, 0.55), transparent 68%);
          opacity: 0.7;
        }

        .zhixing-dust span {
          position: absolute;
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.74);
          box-shadow: 0 0 14px rgba(216, 183, 111, 0.32);
          opacity: 0.26;
          animation: zhixing-dust-drift 16s ease-in-out infinite;
        }

        .zhixing-dust--gathering span {
          animation: zhixing-dust-gather 2200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .zhixing-hero {
          position: relative;
          z-index: 4;
          display: grid;
          min-height: 100svh;
          place-items: center;
          padding: clamp(4rem, 8svh, 6.5rem) 1.25rem clamp(3rem, 7svh, 5rem);
          overflow: hidden;
        }

        .zhixing-page--entered .zhixing-hero {
          display: none;
        }

        .zhixing-page--entering .zhixing-hero__content {
          animation: heroFadeDown 280ms ease-out forwards;
        }

        .zhixing-hero__content {
          position: relative;
          width: min(1180px, 100%);
          text-align: center;
        }

        .zhixing-heartfire {
          position: absolute;
          left: 50%;
          top: clamp(-4rem, -5vw, -2.5rem);
          width: 0.55rem;
          aspect-ratio: 1;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #f4df9b;
          box-shadow: 0 0 42px rgba(244, 223, 155, 0.62), 0 0 120px rgba(216, 183, 111, 0.16);
          animation: zhixing-heartfire 6.6s ease-in-out infinite;
        }

        .zhixing-hero h1 {
          margin: 0;
          font-family: var(--font-yangming-title);
          font-size: clamp(3rem, 7vw, 6.4rem);
          font-weight: 400;
          line-height: 1.04;
          letter-spacing: 0.03em;
          color: var(--zhixing-ivory);
          text-wrap: balance;
          text-shadow: 0 22px 60px rgba(0, 0, 0, 0.52);
        }

        @media (min-width: 900px) {
          .zhixing-hero h1 {
            white-space: nowrap;
          }
        }

        .zhixing-hero p {
          margin: clamp(1.45rem, 3vw, 2.4rem) auto 0;
          max-width: 720px;
          font-family: var(--font-yangming-hand);
          font-size: clamp(1.15rem, 2vw, 1.75rem);
          line-height: 1.9;
          color: var(--zhixing-muted);
        }

        .zhixing-hero__actions {
          display: flex;
          width: min(720px, 100%);
          margin: clamp(2.1rem, 4vw, 3.4rem) auto 0;
          justify-content: center;
          gap: 0.72rem;
        }

        .zhixing-start,
        .zhixing-quiet-action {
          position: relative;
          min-width: min(82vw, 240px);
          min-height: 3.75rem;
          cursor: pointer;
          border: 1px solid rgba(216, 183, 111, 0.34);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.036), rgba(244, 235, 221, 0.01)),
            rgba(5, 8, 7, 0.32);
          color: rgba(244, 235, 221, 0.84);
          font-family: var(--font-interface);
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          box-shadow:
            0 20px 56px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition:
            border-color 500ms var(--ym-motion-ease-out),
            color 500ms var(--ym-motion-ease-out),
            transform 500ms var(--ym-motion-ease-out),
            filter 500ms var(--ym-motion-ease-out);
        }

        .zhixing-start {
          border-color: rgba(216, 183, 111, 0.46);
          color: rgba(216, 183, 111, 0.92);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.36),
            0 0 34px rgba(216, 183, 111, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .zhixing-quiet-action {
          min-width: min(82vw, 220px);
          color: rgba(220, 212, 195, 0.58);
          font-size: 0.82rem;
          letter-spacing: 0.1em;
        }

        .zhixing-start:hover,
        .zhixing-quiet-action:hover {
          border-color: rgba(216, 183, 111, 0.56);
          color: rgba(244, 235, 221, 0.9);
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .zhixing-enter-transition {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 5;
          overflow: hidden;
          background: radial-gradient(circle at 50% 44%, rgba(216, 183, 111, 0.045), transparent 22rem);
        }

        .zhixing-enter-transition__fire {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 0.56rem;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: #f4df9b;
          box-shadow: 0 0 46px rgba(244, 223, 155, 0.42), 0 0 128px rgba(216, 183, 111, 0.12);
          animation: heartFireAwaken 900ms ease-out forwards;
        }

        .zhixing-enter-transition__spine {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 1px;
          height: 0;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.74), transparent);
          box-shadow:
            0 0 22px rgba(216, 183, 111, 0.18),
            0 0 90px rgba(216, 183, 111, 0.08);
          filter: blur(8px);
          opacity: 0;
          animation: goldenSpineReveal 900ms cubic-bezier(0.16, 1, 0.3, 1) 250ms forwards;
        }

        .zhixing-enter-transition__mist {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(70vw, 900px);
          height: 76vh;
          transform: translate(-50%, -50%) perspective(900px) rotateX(66deg);
          border-radius: 50%;
          background: radial-gradient(ellipse at 50% 50%, rgba(216, 183, 111, 0.09), rgba(216, 183, 111, 0.018) 42%, transparent 70%);
          filter: blur(4px);
          opacity: 0;
          animation: mistRoadOpen 1200ms cubic-bezier(0.16, 1, 0.3, 1) 520ms forwards;
        }

        .zhixing-enter-transition__node {
          position: absolute;
          left: 50%;
          top: 58%;
          display: grid;
          width: min(720px, calc(100vw - 2rem));
          min-height: 14rem;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.24);
          border-radius: 1.8rem;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.14), transparent 52%),
            rgba(5, 8, 7, 0.5);
          box-shadow:
            0 36px 120px rgba(0, 0, 0, 0.48),
            0 0 88px rgba(216, 183, 111, 0.1),
            inset 0 1px 0 rgba(244, 235, 221, 0.04);
          opacity: 0;
          padding: 2rem;
          text-align: center;
          transform: translate(-50%, 36px) scale(0.94);
          filter: blur(12px);
          animation: transitionNodeFromMist 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards;
          backdrop-filter: blur(24px);
        }

        .zhixing-enter-transition__node em {
          color: rgba(216, 183, 111, 0.66);
          font-family: var(--font-interface);
          font-size: 0.74rem;
          font-style: normal;
          font-weight: 900;
          letter-spacing: 0.22em;
        }

        .zhixing-enter-transition__node strong {
          margin-top: 0.4rem;
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-yangming-title);
          font-size: clamp(3rem, 7vw, 6.4rem);
          font-weight: 400;
          letter-spacing: 0.02em;
        }

        .zhixing-enter-transition__future {
          position: absolute;
          left: 50%;
          top: 82%;
          transform: translateX(-50%);
          color: rgba(216, 183, 111, 0.28);
          font-family: var(--font-yangming-title);
          font-size: clamp(1.6rem, 4vw, 3rem);
          letter-spacing: 0.08em;
          opacity: 0;
          filter: blur(8px);
          animation: futureNodeBreath 5s ease-in-out 1500ms infinite;
        }

        .zhixing-stage {
          position: relative;
          z-index: 5;
          min-height: 160svh;
          padding: clamp(3rem, 7svh, 5rem) 1.25rem 5rem;
          animation: stageOpacityIn 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .zhixing-stage__intro {
          position: relative;
          z-index: 3;
          width: min(900px, 100%);
          margin: 0 auto 1.2rem;
          text-align: center;
        }

        .zhixing-stage__date,
        .zhixing-verdict__label,
        .zhixing-course__copy p,
        .zhixing-demo p {
          margin: 0;
          color: rgba(216, 183, 111, 0.76);
          font-family: var(--font-interface);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .zhixing-stage__intro h2 {
          margin: 0.55rem 0 0;
          font-family: var(--font-yangming-title);
          font-size: clamp(1.7rem, 3.4vw, 3.2rem);
          font-weight: 400;
          line-height: 1;
          color: rgba(244, 235, 221, 0.72);
        }

        .zhixing-stage__intro > p:last-child {
          margin: 0.72rem auto 0;
          max-width: 720px;
          color: rgba(220, 212, 195, 0.42);
          font-family: var(--font-yangming-hand);
          font-size: clamp(0.92rem, 1.3vw, 1.12rem);
          line-height: 1.8;
        }

        .zhixing-daily-lesson {
          position: relative;
          z-index: 2;
          width: min(980px, 100%);
          margin: 0 auto 4rem;
          border-block: 1px solid rgba(217, 189, 122, 0.12);
          background:
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.08), transparent 58%),
            linear-gradient(90deg, transparent, rgba(244, 235, 221, 0.028), transparent);
          padding: clamp(1.35rem, 3vw, 2.35rem) 0;
        }

        .zhixing-daily-lesson::before,
        .zhixing-daily-lesson::after {
          content: "";
          position: absolute;
          left: 50%;
          width: min(68vw, 680px);
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.28), transparent);
          opacity: 0.5;
        }

        .zhixing-daily-lesson::before {
          top: -1px;
        }

        .zhixing-daily-lesson::after {
          bottom: -1px;
        }

        .zhixing-daily-lesson__head {
          width: min(760px, calc(100% - 2rem));
          margin: 0 auto clamp(1.2rem, 3vw, 1.8rem);
          text-align: center;
        }

        .zhixing-daily-lesson__head p {
          margin: 0;
          color: rgba(216, 183, 111, 0.78);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.22em;
        }

        .zhixing-daily-lesson__head h3 {
          margin: 0.55rem 0 0;
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-yangming-title);
          font-size: clamp(2.2rem, 4.6vw, 4.6rem);
          font-weight: 400;
          line-height: 1.05;
        }

        .zhixing-daily-lesson__head span {
          display: block;
          margin-top: 0.7rem;
          color: rgba(220, 212, 195, 0.42);
          font-family: var(--font-yangming-hand);
          font-size: clamp(0.95rem, 1.5vw, 1.2rem);
          line-height: 1.7;
        }

        .zhixing-daily-lesson__items {
          display: grid;
          width: min(920px, calc(100% - 2rem));
          margin: 0 auto;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 1px solid rgba(217, 189, 122, 0.08);
          border-bottom: 1px solid rgba(217, 189, 122, 0.08);
        }

        .zhixing-daily-lesson__items div {
          min-height: 8rem;
          border-right: 1px solid rgba(217, 189, 122, 0.08);
          padding: 1rem clamp(0.85rem, 2vw, 1.35rem);
        }

        .zhixing-daily-lesson__items div:last-child {
          border-right: 0;
        }

        .zhixing-daily-lesson__items span {
          display: block;
          color: rgba(216, 183, 111, 0.72);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .zhixing-daily-lesson__items strong {
          display: block;
          margin-top: 0.78rem;
          color: rgba(244, 235, 221, 0.88);
          font-family: var(--font-yangming-title);
          font-size: clamp(1.35rem, 2.4vw, 2.2rem);
          font-weight: 400;
          line-height: 1.22;
        }

        .zhixing-daily-lesson__items em {
          display: block;
          margin-top: 0.7rem;
          color: rgba(220, 212, 195, 0.44);
          font-family: var(--font-yangming-hand);
          font-size: 0.95rem;
          font-style: normal;
          line-height: 1.6;
        }

        .zhixing-daily-lesson__verdict {
          width: min(820px, calc(100% - 2rem));
          margin: 1.3rem auto 0;
          text-align: center;
          color: rgba(220, 212, 195, 0.56);
          font-family: var(--font-yangming-hand);
          font-size: clamp(1rem, 1.7vw, 1.28rem);
          line-height: 1.8;
        }

        .zhixing-realm-strip {
          position: relative;
          z-index: 4;
          display: flex;
          width: min(620px, calc(100vw - 2rem));
          margin: 0 auto 1.2rem;
          justify-content: center;
          gap: 0.5rem;
          border: 1px solid rgba(217, 189, 122, 0.1);
          border-radius: 999px;
          background: rgba(5, 8, 7, 0.36);
          padding: 0.35rem;
          backdrop-filter: blur(22px);
        }

        .zhixing-realm-strip span {
          flex: 1;
          border-radius: 999px;
          padding: 0.6rem 0.8rem;
          text-align: center;
          color: rgba(220, 212, 195, 0.48);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .depth-scroll-root {
          position: relative;
          width: min(100%, 100vw);
          margin: 0 auto 4rem;
        }

        .depth-scroll-track {
          pointer-events: none;
          position: absolute;
          inset: 0;
        }

        .scroll-anchor {
          height: 100vh;
        }

        .depth-scroll-stage {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          perspective: 1200px;
          transform-style: preserve-3d;
          background-color: #050807;
          background:
            radial-gradient(circle at 50% 18%, rgba(95, 132, 117, 0.13), transparent 30rem),
            radial-gradient(circle at 50% 74%, rgba(216, 183, 111, 0.075), transparent 36rem),
            linear-gradient(180deg, rgba(2, 4, 3, 0.86), rgba(5, 11, 9, 0.72) 48%, rgba(2, 4, 3, 0.92));
        }

        .depth-node-layer {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 5;
          transform-style: preserve-3d;
        }

        .mist-depth-layer {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
        }

        .mist-depth-layer__veil {
          position: absolute;
          left: 50%;
          display: block;
          width: min(116vw, 1280px);
          transform: translateX(-50%);
          border-radius: 50%;
          filter: blur(54px);
        }

        .mist-depth-layer__veil--top {
          top: -18vh;
          height: 36vh;
          background: rgba(2, 4, 3, 0.72);
        }

        .mist-depth-layer__veil--center {
          top: 30vh;
          height: 42vh;
          background: rgba(18, 35, 29, 0.18);
          opacity: 0.5;
          animation: zhixing-mist-breathe 18s ease-in-out infinite;
        }

        .mist-depth-layer__veil--bottom {
          bottom: -20vh;
          height: 42vh;
          background: rgba(2, 4, 3, 0.82);
        }

        .ink-path-spine {
          pointer-events: none;
          position: absolute;
          inset: -8vh 0;
          z-index: 3;
          width: 100%;
          height: 116vh;
          opacity: 0.74;
          filter: blur(0.24px) saturate(0.92);
          mask-image: linear-gradient(180deg, transparent, black 14%, black 74%, transparent);
        }

        .ink-path-spine__bleed {
          opacity: 0.68;
        }

        .ink-path-spine__completed-shadow {
          opacity: 0.86;
          filter: blur(0.7px);
        }

        .ink-path-spine__thread {
          opacity: 0.48;
          animation: inkPathThreadDrift 18s ease-in-out infinite;
        }

        .ink-path-spine__current-light {
          opacity: 0.78;
          animation: inkPathCurrentBreathe 5.6s ease-in-out infinite;
        }

        .ink-path-spine__future-mist {
          opacity: 0.92;
        }

        .depth-stage-kicker {
          position: absolute;
          left: 50%;
          top: clamp(1.2rem, 4svh, 2.4rem);
          z-index: 7;
          display: grid;
          width: min(760px, calc(100vw - 2rem));
          gap: 0.34rem;
          text-align: center;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .depth-stage-kicker p {
          margin: 0;
          color: rgba(216, 183, 111, 0.7);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.22em;
        }

        .depth-stage-kicker span {
          color: rgba(220, 212, 195, 0.38);
          font-family: var(--font-yangming-hand);
          font-size: clamp(0.92rem, 1.4vw, 1.12rem);
          line-height: 1.6;
        }

        .depth-scroll-compliance {
          pointer-events: none;
          position: absolute;
          left: 50%;
          bottom: clamp(0.75rem, 2.6svh, 1.6rem);
          z-index: 7;
          width: min(760px, calc(100vw - 2rem));
          margin: 0;
          transform: translateX(-50%);
          color: rgba(220, 212, 195, 0.34);
          font-family: var(--font-interface);
          font-size: clamp(0.64rem, 1.35vw, 0.78rem);
          line-height: 1.7;
          text-align: center;
        }

        .zhixing-node-stack {
          position: relative;
          display: grid;
          min-height: clamp(620px, 74svh, 820px);
          width: min(880px, 100%);
          margin: 0 auto 4rem;
          list-style: none;
          overflow: hidden;
          padding: 0;
          perspective: 1200px;
          transform-style: preserve-3d;
        }

        .zhixing-node-stack::before,
        .zhixing-node-stack::after {
          content: "";
          pointer-events: none;
          position: absolute;
          z-index: 2;
          left: 50%;
          width: min(110vw, 1120px);
          height: 18rem;
          transform: translateX(-50%);
        }

        .zhixing-node-stack::before {
          top: -7rem;
          background: linear-gradient(180deg, rgba(5, 8, 7, 0.9), rgba(5, 8, 7, 0));
        }

        .zhixing-node-stack::after {
          bottom: -8rem;
          background: linear-gradient(0deg, rgba(3, 5, 4, 0.92), rgba(3, 5, 4, 0));
        }

        .zhixing-node {
          position: absolute;
          inset-inline: 0;
          top: 42%;
          opacity: var(--node-opacity);
          filter: blur(var(--node-blur)) brightness(var(--node-light));
          transform:
            translateY(var(--node-y))
            translateZ(var(--node-z))
            scale(var(--node-scale));
          transform-origin: center;
          transition:
            opacity 900ms var(--ym-motion-ease-out),
            filter 900ms var(--ym-motion-ease-out),
            transform 900ms var(--ym-motion-ease-out);
        }

        .depth-scroll-node {
          position: absolute;
          left: 50%;
          right: auto;
          top: 50%;
          width: min(860px, calc(100vw - 32px));
          animation: none;
          transform-style: preserve-3d;
          pointer-events: auto;
          will-change: transform, opacity, filter;
        }

        .zhixing-node article {
          position: relative;
          overflow: hidden;
          min-height: clamp(18rem, 42svh, 31rem);
          display: grid;
          place-items: center;
          align-content: center;
          padding: clamp(1.4rem, 5vw, 3.8rem);
          text-align: center;
          isolation: isolate;
        }

        .zhixing-node article::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 54%;
          z-index: -2;
          width: min(72vw, 760px);
          height: min(34vh, 360px);
          transform: translate(-50%, -50%) perspective(900px) rotateX(64deg);
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(244, 235, 221, 0.08), transparent 14%),
            radial-gradient(ellipse at 50% 50%, rgba(216, 183, 111, 0.12), rgba(216, 183, 111, 0.035) 42%, transparent 72%);
          opacity: 0.34;
          filter: blur(2px);
          transition: opacity 900ms var(--ym-motion-ease-out), transform 900ms var(--ym-motion-ease-out);
        }

        .zhixing-node--current article,
        .depth-scroll-node--active article {
          text-shadow: 0 24px 80px rgba(0, 0, 0, 0.62);
        }

        .zhixing-node--current {
          animation: nodeFromMist 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .depth-scroll-node.zhixing-node--current {
          animation: none;
        }

        .zhixing-node--current article::before,
        .depth-scroll-node--active article::before {
          opacity: 0.76;
          transform: translate(-50%, -50%) perspective(900px) rotateX(64deg) scale(1.04);
          box-shadow: 0 0 84px rgba(216, 183, 111, 0.1);
        }

        .depth-scroll-node--near article,
        .depth-scroll-node--active article {
          text-shadow: 0 24px 80px rgba(0, 0, 0, 0.62);
        }

        .depth-scroll-node--past article {
          opacity: 0.92;
        }

        .depth-scroll-node--future article {
          opacity: 0.76;
        }

        .depth-scroll-node:not(.depth-scroll-node--near).zhixing-node--current article {
          text-shadow: none;
        }

        .depth-scroll-node:not(.depth-scroll-node--near).zhixing-node--current article::before {
          opacity: 0.24;
          box-shadow: none;
        }

        .zhixing-node--locked article {
          opacity: 0.7;
        }

        .depth-scroll-node--future.zhixing-node--locked article {
          animation: futureNodeBreath 5s ease-in-out infinite;
        }

        .zhixing-node--locked p,
        .zhixing-node--locked a {
          display: none;
        }

        .depth-scroll-node--near.zhixing-node--locked p {
          display: block;
        }

        .depth-scroll-node--near.zhixing-node--locked a {
          display: inline-flex;
        }

        .depth-scroll-node__glow {
          display: block;
          width: min(18rem, 42vw);
          height: 1px;
          margin-top: 0.9rem;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.32), transparent);
          opacity: 0.5;
          filter: blur(1px);
        }

        .zhixing-water-ripple,
        .zhixing-water-shadow {
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: 54%;
          z-index: -1;
          display: block;
          transform: translate(-50%, -50%) perspective(900px) rotateX(64deg);
          border-radius: 50%;
        }

        .zhixing-water-ripple {
          width: min(66vw, 720px);
          height: min(30vh, 320px);
          border: 1px solid rgba(216, 183, 111, 0.12);
          box-shadow:
            0 0 0 1px rgba(244, 235, 221, 0.018) inset,
            0 0 78px rgba(95, 132, 117, 0.08);
          opacity: 0.52;
          animation: zhixing-water-breathe 7.2s ease-in-out infinite;
        }

        .zhixing-water-ripple::before,
        .zhixing-water-ripple::after {
          content: "";
          position: absolute;
          inset: 16%;
          border: 1px solid rgba(216, 183, 111, 0.07);
          border-radius: inherit;
        }

        .zhixing-water-ripple::after {
          inset: 31%;
          border-color: rgba(244, 235, 221, 0.035);
        }

        .zhixing-water-shadow {
          width: min(34vw, 380px);
          height: min(14vh, 160px);
          background: radial-gradient(ellipse at center, rgba(2, 4, 3, 0.74), transparent 68%);
          opacity: 0.46;
          filter: blur(12px);
          transform: translate(-50%, -26%) perspective(900px) rotateX(64deg);
        }

        .depth-scroll-node--near .zhixing-water-shadow {
          animation: zhixing-shadow-surface 4.8s ease-in-out infinite;
        }

        .zhixing-node__topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          color: rgba(216, 183, 111, 0.64);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .zhixing-node h3 {
          margin: 0;
          position: relative;
          z-index: 2;
          font-family: var(--font-yangming-title);
          font-size: clamp(3.4rem, 8vw, 7.4rem);
          font-weight: 400;
          line-height: 0.98;
          color: rgba(244, 235, 221, 0.9);
          letter-spacing: 0.04em;
        }

        .zhixing-node p {
          position: relative;
          z-index: 2;
          margin: clamp(1rem, 2.5vw, 1.8rem) auto 0;
          max-width: 720px;
          color: rgba(220, 212, 195, 0.56);
          font-family: var(--font-yangming-hand);
          font-size: clamp(1.08rem, 1.85vw, 1.48rem);
          line-height: 1.85;
        }

        .zhixing-node__future-copy {
          color: rgba(220, 212, 195, 0.24);
        }

        .zhixing-node a,
        .zhixing-bottom-actions a,
        .zhixing-course a,
        .zhixing-demo a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
          color: rgba(244, 235, 221, 0.78);
          font-family: var(--font-interface);
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-decoration: none;
          transition: color 500ms ease, opacity 500ms ease, transform 500ms ease;
        }

        .zhixing-node a {
          position: relative;
          z-index: 2;
          margin-top: clamp(1.15rem, 2.6vw, 1.9rem);
        }

        .zhixing-node--current a,
        .depth-scroll-node--active:not(.zhixing-node--locked) a,
        .zhixing-demo a {
          color: rgba(216, 183, 111, 0.9);
        }

        .zhixing-water-action::before,
        .zhixing-water-action::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -0.55rem;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.45), transparent);
        }

        .zhixing-water-action::before {
          width: min(16rem, 52vw);
          opacity: 0.32;
        }

        .zhixing-water-action::after {
          width: min(5rem, 24vw);
          opacity: 0.78;
          filter: blur(0.5px);
          animation: zhixing-water-action-light 4.8s ease-in-out infinite;
        }

        .zhixing-node a[aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.42;
        }

        .zhixing-node a:hover,
        .zhixing-bottom-actions a:hover,
        .zhixing-course a:hover,
        .zhixing-demo a:hover {
          transform: translateY(-1px);
        }

        .zhixing-seal {
          position: absolute;
          right: clamp(3rem, 9vw, 8rem);
          top: clamp(2rem, 8vw, 4.6rem);
          z-index: 3;
          display: inline-grid;
          width: 3rem;
          aspect-ratio: 1;
          place-items: center;
          border: 1px solid rgba(129, 55, 42, 0.48);
          border-radius: 999px;
          color: rgba(166, 76, 58, 0.84);
          font-family: var(--font-yangming-hand);
          font-size: 0.8rem;
          letter-spacing: 0;
          transform: rotate(-7deg);
          background: rgba(129, 55, 42, 0.035);
        }

        .zhixing-seal--sealed {
          box-shadow: 0 0 28px rgba(129, 55, 42, 0.16);
        }

        .zhixing-verdict,
        .zhixing-course,
        .zhixing-demo {
          position: relative;
          z-index: 2;
          width: min(880px, 100%);
          margin: 5rem auto 0;
          border: 1px solid rgba(217, 189, 122, 0.13);
          border-radius: 2rem;
          background: rgba(5, 8, 7, 0.46);
          padding: clamp(1.35rem, 3vw, 2.4rem);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(24px);
        }

        .zhixing-verdict blockquote {
          margin: 1.1rem 0 0;
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-yangming-title);
          font-size: clamp(1.8rem, 3.5vw, 3.6rem);
          line-height: 1.38;
        }

        .zhixing-verdict__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-top: 1.2rem;
        }

        .zhixing-verdict__meta span,
        .zhixing-mirror-row span {
          border: 1px solid rgba(217, 189, 122, 0.11);
          border-radius: 999px;
          padding: 0.56rem 0.82rem;
          color: rgba(220, 212, 195, 0.52);
          font-family: var(--font-interface);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .zhixing-course {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: clamp(1rem, 3vw, 2rem);
          margin-top: 1.4rem;
          border-color: rgba(217, 189, 122, 0.11);
          background:
            radial-gradient(ellipse at 12% 0%, rgba(216, 183, 111, 0.1), transparent 44%),
            rgba(5, 8, 7, 0.38);
        }

        .zhixing-course__copy h2 {
          margin: 0.65rem 0 0;
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-yangming-title);
          font-size: clamp(2rem, 4.2vw, 4rem);
          font-weight: 400;
          line-height: 1.12;
        }

        .zhixing-course__copy span {
          display: block;
          max-width: 680px;
          margin-top: 0.9rem;
          color: rgba(220, 212, 195, 0.54);
          font-family: var(--font-yangming-hand);
          font-size: clamp(1rem, 1.65vw, 1.28rem);
          line-height: 1.85;
        }

        .zhixing-course__action {
          display: grid;
          justify-items: end;
          gap: 0.75rem;
        }

        .zhixing-course__action em {
          color: rgba(216, 183, 111, 0.68);
          font-family: var(--font-interface);
          font-size: 0.74rem;
          font-style: normal;
          font-weight: 900;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        .zhixing-course a {
          background: rgba(5, 8, 7, 0.42);
          color: rgba(244, 235, 221, 0.78);
          white-space: nowrap;
        }

        .zhixing-demo {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(8rem, 12rem);
          align-items: center;
          gap: 1.2rem;
        }

        .zhixing-demo h2 {
          margin: 0.5rem 0 0;
          font-family: var(--font-yangming-title);
          font-size: clamp(2rem, 4vw, 4.2rem);
          font-weight: 400;
        }

        .zhixing-demo span {
          display: block;
          margin-top: 0.5rem;
          color: rgba(220, 212, 195, 0.5);
          font-family: var(--font-yangming-hand);
          font-size: 1rem;
          line-height: 1.7;
        }

        .zhixing-demo__qrcode {
          display: grid;
          min-height: 7.5rem;
          place-items: center;
          border: 1px dashed rgba(217, 189, 122, 0.18);
          border-radius: 1.2rem;
          color: rgba(220, 212, 195, 0.38);
          font-family: var(--font-interface);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-align: center;
        }

        .zhixing-mirror-row {
          position: relative;
          z-index: 2;
          display: flex;
          width: min(900px, 100%);
          margin: 2rem auto 0;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.55rem;
        }

        .zhixing-mirror-row span.is-active {
          border-color: rgba(216, 183, 111, 0.36);
          color: rgba(216, 183, 111, 0.86);
          box-shadow: 0 0 28px rgba(216, 183, 111, 0.08);
        }

        .zhixing-bottom-actions {
          position: relative;
          z-index: 2;
          display: flex;
          width: min(640px, 100%);
          margin: 2.4rem auto 0;
          gap: 0.8rem;
          justify-content: center;
        }

        .zhixing-bottom-actions a {
          flex: 1;
        }

        .zhixing-compliance {
          position: relative;
          z-index: 2;
          margin: 2rem auto 0;
          width: min(760px, 100%);
          text-align: center;
          color: rgba(220, 212, 195, 0.4);
          font-family: var(--font-interface);
          font-size: 0.78rem;
          line-height: 1.8;
        }

        @keyframes heroFadeDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(18px);
          }
        }

        @keyframes heartFireAwaken {
          0% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
          52% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1.18);
            filter: blur(1px);
          }
          100% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
        }

        @keyframes goldenSpineReveal {
          from {
            height: 0;
            opacity: 0;
            filter: blur(8px);
          }
          to {
            height: 68vh;
            opacity: 0.75;
            filter: blur(0);
          }
        }

        @keyframes mistRoadOpen {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) perspective(900px) rotateX(66deg) scale(0.82);
            filter: blur(12px);
          }
          to {
            opacity: 0.62;
            transform: translate(-50%, -50%) perspective(980px) rotateX(68deg) scale(1);
            filter: blur(3px);
          }
        }

        @keyframes nodeFromMist {
          from {
            opacity: 0;
            transform: translateY(36px) scale(0.94);
            filter: blur(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes stageOpacityIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes transitionNodeFromMist {
          from {
            opacity: 0;
            transform: translate(-50%, 36px) scale(0.94);
            filter: blur(12px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes futureNodeBreath {
          0%, 100% {
            opacity: 0.18;
          }
          50% {
            opacity: 0.32;
          }
        }

        @keyframes inkPathThreadDrift {
          0%, 100% {
            stroke-dashoffset: 0;
            opacity: 0.38;
          }
          50% {
            stroke-dashoffset: -0.08;
            opacity: 0.56;
          }
        }

        @keyframes inkPathCurrentBreathe {
          0%, 100% {
            opacity: 0.62;
            stroke-width: 3.2;
          }
          50% {
            opacity: 0.88;
            stroke-width: 4.8;
          }
        }

        @keyframes zhixing-heartfire {
          0%, 100% { opacity: 0.42; transform: translateX(-50%) scale(0.9); }
          50% { opacity: 0.95; transform: translateX(-50%) scale(1.18); }
        }

        @keyframes zhixing-mist-breathe {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.32; }
          50% { transform: translate3d(1.5vw, -1vh, 0) scale(1.08); opacity: 0.48; }
        }

        @keyframes zhixing-dust-drift {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.16; }
          45% { transform: translate3d(18px, -24px, 0); opacity: 0.44; }
          70% { transform: translate3d(-12px, 16px, 0); opacity: 0.24; }
        }

        @keyframes zhixing-dust-gather {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0.18;
          }
          62% {
            transform: translate3d(calc(var(--dust-gather-x) * 0.18), calc(var(--dust-gather-y) * 0.18), 0);
            opacity: 0.45;
          }
          100% {
            transform: translate3d(calc(var(--dust-gather-x) * 0.28), calc(var(--dust-gather-y) * 0.28), 0);
            opacity: 0.22;
          }
        }

        @media (max-width: 760px) {
          .zhixing-hero {
            min-height: 100svh;
            padding: 4.4rem 1rem 2.5rem;
          }

          .zhixing-hero h1 {
            font-size: clamp(2.25rem, 11vw, 4rem);
            line-height: 1.12;
          }

          .zhixing-hero p {
            margin-top: 1.1rem;
            font-size: clamp(1rem, 4.2vw, 1.28rem);
          }

          .zhixing-hero__actions {
            width: 100%;
            flex-direction: column;
            gap: 0.58rem;
            margin-top: 1.6rem;
          }

          .zhixing-start,
          .zhixing-quiet-action {
            width: 100%;
            min-width: 0;
            min-height: 3.35rem;
          }

          .zhixing-dust span:nth-child(n + 49) {
            display: none;
          }

          .zhixing-enter-transition__node {
            min-height: 12rem;
          }

          .zhixing-enter-transition__future {
            top: 84%;
          }

          .zhixing-stage {
            padding-top: 3rem;
          }

          .depth-stage-kicker {
            top: 1rem;
          }

          .depth-stage-kicker span {
            display: none;
          }

          .depth-scroll-node {
            top: 50%;
            width: min(860px, calc(100vw - 32px));
          }

          .depth-scroll-node .zhixing-node__topline {
            font-size: 0.64rem;
          }

          .depth-scroll-node h3 {
            font-size: clamp(2.45rem, 12vw, 4.4rem);
          }

          .depth-scroll-node p {
            font-size: clamp(1rem, 4.4vw, 1.2rem);
          }

          .zhixing-realm-strip {
            top: auto;
            position: relative;
            flex-direction: column;
            border-radius: 1.3rem;
          }

          .zhixing-daily-lesson {
            margin-bottom: 3rem;
          }

          .zhixing-daily-lesson__items {
            grid-template-columns: 1fr;
          }

          .zhixing-daily-lesson__items div {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid rgba(217, 189, 122, 0.08);
          }

          .zhixing-daily-lesson__items div:last-child {
            border-bottom: 0;
          }

          .zhixing-node-stack {
            min-height: 650px;
          }

          .zhixing-node {
            top: 36%;
          }

          .zhixing-course {
            grid-template-columns: 1fr;
          }

          .zhixing-course__action {
            justify-items: stretch;
          }

          .zhixing-course__action em {
            white-space: normal;
          }

          .zhixing-demo {
            grid-template-columns: 1fr;
          }

          .zhixing-bottom-actions {
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zhixing-dust span,
          .zhixing-heartfire,
          .zhixing-mist__wash,
          .zhixing-node--current,
          .zhixing-node--locked,
          .zhixing-enter-transition__fire,
          .zhixing-enter-transition__spine,
          .zhixing-enter-transition__mist,
          .zhixing-enter-transition__node,
          .zhixing-enter-transition__future,
          .ink-path-spine__thread,
          .ink-path-spine__current-light {
            animation: none;
          }

          .zhixing-node {
            transition: none;
          }
        }
      `}</style>
    </main>
  )
}
