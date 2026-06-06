"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { CSSProperties, MouseEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  getMirrorDefinition,
  getSealDefinition,
  mirrorDefinitions,
  type ZhixingNodeId,
  zhixingScrollNodes,
} from "./zhixingScrollDefinitions"
import {
  completeZhixingNode,
  getCurrentZhixingNodeIndex,
  getZhixingNodeStatus,
  getZhixingProgressLabel,
  loadDailyScroll,
  saveDailyScroll,
  type DailyScroll,
} from "./zhixingScrollStore"

function getBrowserStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function getNodeStyle(index: number, currentIndex: number, status: ReturnType<typeof getZhixingNodeStatus>): CSSProperties {
  const distance = index - currentIndex
  const absoluteDistance = Math.abs(distance)
  const isCurrent = status === "current"
  const scale = isCurrent ? 1 : status === "completed" ? Math.max(0.6, 0.74 - absoluteDistance * 0.045) : Math.max(0.3, 0.58 - absoluteDistance * 0.05)
  const opacity = isCurrent ? 1 : status === "completed" ? Math.max(0.44, 0.62 - absoluteDistance * 0.05) : Math.max(0.2, 0.34 - absoluteDistance * 0.03)
  const blur = isCurrent ? 0 : status === "completed" ? Math.min(9, 3 + absoluteDistance * 1.6) : Math.min(16, 7 + absoluteDistance * 2.2)
  const y = distance * 128
  const z = isCurrent ? 0 : -260 - absoluteDistance * 130

  return {
    "--node-scale": scale,
    "--node-opacity": opacity,
    "--node-blur": `${blur}px`,
    "--node-y": `${y}px`,
    "--node-z": `${z}px`,
    "--node-light": isCurrent ? 1 : status === "completed" ? 0.62 : 0.34,
  } as CSSProperties
}

function InkMistBackground() {
  return (
    <div className="zhixing-mist" aria-hidden="true">
      <span className="zhixing-mist__wash zhixing-mist__wash--left" />
      <span className="zhixing-mist__wash zhixing-mist__wash--right" />
      <span className="zhixing-mist__path" />
      <span className="zhixing-mist__void" />
    </div>
  )
}

function GoldenDustField() {
  const dust = useMemo(() => Array.from({ length: 56 }, (_, index) => ({
    id: index,
    left: 8 + ((index * 19) % 84),
    top: 12 + ((index * 31) % 76),
    delay: (index % 13) * 0.7,
    duration: 13 + (index % 9),
    size: 1 + (index % 4) * 0.45,
  })), [])

  return (
    <div className="zhixing-dust" aria-hidden="true">
      {dust.map((item) => (
        <span
          key={item.id}
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            width: `${item.size}px`,
            height: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        />
      ))}
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

function DailyVerdictCard({ scroll }: { scroll: DailyScroll }) {
  const mirror = getMirrorDefinition(scroll.primaryMirror)
  const seal = getSealDefinition(scroll.seal.id)

  return (
    <section className="zhixing-verdict" id="verdict" aria-label="今日判词">
      <p className="zhixing-verdict__label">今日判词</p>
      <blockquote>{scroll.verdict}</blockquote>
      <div className="zhixing-verdict__meta">
        <span>今日主镜：{mirror.name}</span>
        <span>今日所守：{seal.name}</span>
      </div>
    </section>
  )
}

export function ZhixingScrollHome() {
  const [scroll, setScroll] = useState<DailyScroll>(() => loadDailyScroll(null))
  const [entered, setEntered] = useState(false)
  const stageRef = useRef<HTMLElement | null>(null)
  const nodeStackRef = useRef<HTMLOListElement | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setScroll(loadDailyScroll(getBrowserStorage()))
  }, [])

  const currentIndex = getCurrentZhixingNodeIndex(scroll)
  const currentNode = zhixingScrollNodes[currentIndex]
  const mirror = getMirrorDefinition(scroll.primaryMirror)
  const seal = getSealDefinition(scroll.seal.id)
  const progressLabel = getZhixingProgressLabel(scroll)

  function enterScroll() {
    setEntered(true)
    window.setTimeout(() => {
      nodeStackRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "center" })
    }, 80)
  }

  function completeNode(nodeId: ZhixingNodeId) {
    const nextScroll = completeZhixingNode(scroll, nodeId)
    setScroll(nextScroll)
    saveDailyScroll(nextScroll, getBrowserStorage())
    return nextScroll
  }

  function handleNodeClick(event: MouseEvent<HTMLAnchorElement>, nodeId: ZhixingNodeId, href: string) {
    const status = getZhixingNodeStatus(nodeId, scroll)
    event.preventDefault()

    if (status === "locked") {
      return
    }

    completeNode(nodeId)
    window.setTimeout(() => {
      window.location.href = href
    }, 80)
  }

  function generateVerdict(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const nextScroll = completeNode("daily-verdict")
    setEntered(true)
    saveDailyScroll(nextScroll, getBrowserStorage())
    window.setTimeout(() => {
      document.getElementById("verdict")?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "center" })
    }, 80)
  }

  return (
    <main className={`zhixing-page ${entered ? "zhixing-page--entered" : ""}`}>
      <InkMistBackground />
      <GoldenDustField />

      <section className="zhixing-hero" aria-label="知行心卷首屏">
        <motion.div
          className="zhixing-hero__content"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="zhixing-heartfire" aria-hidden="true" />
          <h1>交易前，先展开一卷。</h1>
          <p>市场未动，心已先动。<br />一念不照，万法皆乱。</p>
          <button className="zhixing-start" type="button" onClick={enterScroll}>
            开始今日一卷
          </button>
        </motion.div>
        <div className="zhixing-hero__scroll" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section ref={stageRef} className="zhixing-stage" aria-label="今日知行心卷">
        <div className="zhixing-stage__intro">
          <p className="zhixing-stage__date">今日知行心卷 · {scroll.date}</p>
          <h2>{currentNode?.title || "今日已成卷"}</h2>
          <p>{progressLabel}。当前先照：{mirror.name}，今日所守：{seal.name}。</p>
        </div>

        <div className="zhixing-realm-strip" aria-label="三境">
          {["未发之中", "已发之念", "知行之印"].map((realm) => (
            <span key={realm}>{realm}</span>
          ))}
        </div>

        <ol ref={nodeStackRef} className="zhixing-node-stack">
          {zhixingScrollNodes.map((node, index) => {
            const status = getZhixingNodeStatus(node.id, scroll)
            const isVerdictNode = node.id === "daily-verdict"
            const href = isVerdictNode ? "#verdict" : node.href

            return (
              <li
                key={node.id}
                className={`zhixing-node zhixing-node--${status}`}
                style={getNodeStyle(index, currentIndex, status)}
              >
                <article>
                  <div className="zhixing-node__topline">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{node.realm}</span>
                    {status === "completed" ? <LiangzhiSeal sealed /> : null}
                  </div>
                  <h3>{node.title}</h3>
                  <p>{node.copy}</p>
                  <a
                    href={href}
                    aria-disabled={status === "locked"}
                    onClick={(event) => isVerdictNode ? generateVerdict(event) : handleNodeClick(event, node.id, node.href)}
                  >
                    {status === "locked" ? "待上一节点照见" : node.buttonLabel}
                  </a>
                </article>
              </li>
            )
          })}
        </ol>

        <DailyVerdictCard scroll={scroll} />

        <section className="zhixing-demo" aria-label="直播演示模式">
          <div>
            <p>LiveDemoMode</p>
            <h2>90 秒急镜案例</h2>
            <span>今日一念 → 心贼显影 → 行为风险 → 今日心证 → 不追印 → 良知落印 → 今日判词</span>
          </div>
          <a href="/zhixing-scroll#verdict" onClick={generateVerdict}>一键演示急镜</a>
          <div className="zhixing-demo__qrcode">小程序码 / 课程入口</div>
        </section>

        <section className="zhixing-mirror-row" aria-label="九镜">
          {mirrorDefinitions.map((item) => (
            <span key={item.id} className={item.id === scroll.primaryMirror ? "is-active" : ""}>{item.name}</span>
          ))}
        </section>

        <div className="zhixing-bottom-actions">
          <a href="/mirror-archive">查看心镜档案</a>
          <a href="/mirror-scroll">展开心镜长卷</a>
        </div>
        <p className="zhixing-compliance">本系统仅用于交易认知、纪律训练与复盘；不荐股、不喊单、不承诺收益。</p>
      </section>

      <style jsx>{`
        .zhixing-page {
          position: relative;
          min-height: 100svh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 50% 18%, rgba(95, 132, 117, 0.16), transparent 34rem),
            radial-gradient(circle at 50% 78%, rgba(216, 183, 111, 0.1), transparent 38rem),
            linear-gradient(180deg, #050807 0%, #07110e 46%, #030504 100%);
          color: var(--ym-text-primary);
        }

        .zhixing-mist,
        .zhixing-dust {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 0;
        }

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

        .zhixing-hero {
          position: relative;
          z-index: 1;
          display: grid;
          min-height: 100svh;
          place-items: center;
          padding: 8rem 1.25rem 5rem;
        }

        .zhixing-hero__content {
          position: relative;
          width: min(940px, 100%);
          text-align: center;
        }

        .zhixing-heartfire {
          position: absolute;
          left: 50%;
          top: -5.5rem;
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
          font-size: clamp(4.6rem, 10vw, 11rem);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: 0;
          color: rgba(244, 235, 221, 0.92);
          text-shadow: 0 22px 60px rgba(0, 0, 0, 0.52);
        }

        .zhixing-hero p {
          margin: clamp(1.45rem, 3vw, 2.4rem) auto 0;
          max-width: 720px;
          font-family: var(--font-yangming-hand);
          font-size: clamp(1.15rem, 2vw, 1.75rem);
          line-height: 1.9;
          color: rgba(220, 212, 195, 0.58);
        }

        .zhixing-start {
          position: relative;
          margin-top: clamp(2.2rem, 5vw, 4.2rem);
          min-width: min(82vw, 360px);
          min-height: 3.75rem;
          cursor: pointer;
          border: 1px solid rgba(216, 183, 111, 0.34);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(216, 183, 111, 0.72), rgba(151, 116, 52, 0.68));
          color: #16120b;
          font-family: var(--font-interface);
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          box-shadow: 0 20px 56px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.16);
          transition: transform 500ms var(--ym-motion-ease-out), filter 500ms var(--ym-motion-ease-out);
        }

        .zhixing-start:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .zhixing-hero__scroll {
          position: absolute;
          left: 50%;
          bottom: 4vh;
          width: min(74vw, 780px);
          height: 18vh;
          transform: translateX(-50%) perspective(720px) rotateX(64deg);
          opacity: 0.54;
        }

        .zhixing-hero__scroll span {
          position: absolute;
          inset-inline: 0;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.45), transparent);
          box-shadow: 0 0 40px rgba(216, 183, 111, 0.16);
        }

        .zhixing-hero__scroll span:nth-child(1) { top: 8%; opacity: 0.32; }
        .zhixing-hero__scroll span:nth-child(2) { top: 43%; opacity: 0.58; }
        .zhixing-hero__scroll span:nth-child(3) { top: 84%; opacity: 0.2; }

        .zhixing-page--entered .zhixing-hero__scroll {
          opacity: 0.78;
        }

        .zhixing-stage {
          position: relative;
          z-index: 1;
          min-height: 180svh;
          padding: 7rem 1.25rem 5rem;
          perspective: 1300px;
        }

        .zhixing-stage__intro {
          position: sticky;
          top: 6rem;
          z-index: 3;
          width: min(900px, 100%);
          margin: 0 auto 3rem;
          text-align: center;
        }

        .zhixing-stage__date,
        .zhixing-verdict__label,
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
          margin: 0.9rem 0 0;
          font-family: var(--font-yangming-title);
          font-size: clamp(3.2rem, 7.5vw, 7.6rem);
          font-weight: 400;
          line-height: 1;
          color: rgba(244, 235, 221, 0.9);
        }

        .zhixing-stage__intro > p:last-child {
          margin: 1rem auto 0;
          max-width: 720px;
          color: rgba(220, 212, 195, 0.5);
          font-family: var(--font-yangming-hand);
          font-size: clamp(1rem, 1.6vw, 1.35rem);
          line-height: 1.8;
        }

        .zhixing-realm-strip {
          position: sticky;
          top: 2rem;
          z-index: 4;
          display: flex;
          width: min(620px, calc(100vw - 2rem));
          margin: 0 auto 4rem;
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

        .zhixing-node-stack {
          position: relative;
          display: grid;
          min-height: 840px;
          width: min(880px, 100%);
          margin: 0 auto;
          list-style: none;
          padding: 0;
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

        .zhixing-node article {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(217, 189, 122, 0.09);
          border-radius: 1.6rem;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.04), transparent 58%),
            linear-gradient(180deg, rgba(244, 235, 221, 0.028), rgba(244, 235, 221, 0.006)),
            rgba(5, 8, 7, 0.26);
          padding: clamp(1.3rem, 3vw, 2.2rem);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.018);
          backdrop-filter: blur(18px);
        }

        .zhixing-node article::before {
          content: "";
          position: absolute;
          inset: auto 12% 0;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.26), transparent);
          opacity: 0.32;
        }

        .zhixing-node--current article {
          border-color: rgba(216, 183, 111, 0.34);
          background:
            radial-gradient(ellipse at 50% -12%, rgba(216, 183, 111, 0.22), transparent 48%),
            radial-gradient(ellipse at 50% 100%, rgba(95, 132, 117, 0.12), transparent 58%),
            rgba(7, 15, 12, 0.58);
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.46),
            0 0 86px rgba(216, 183, 111, 0.12),
            inset 0 1px 0 rgba(244, 235, 221, 0.04);
        }

        .zhixing-node--current article::before {
          inset-inline: 7%;
          background: linear-gradient(90deg, transparent, rgba(244, 223, 155, 0.64), transparent);
          opacity: 0.82;
          box-shadow: 0 0 24px rgba(216, 183, 111, 0.22);
        }

        .zhixing-node--locked article {
          border-color: rgba(217, 189, 122, 0.055);
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.012), rgba(244, 235, 221, 0.002)),
            rgba(5, 8, 7, 0.16);
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
          margin: 0.95rem 0 0;
          font-family: var(--font-yangming-title);
          font-size: clamp(2.8rem, 6vw, 5.4rem);
          font-weight: 400;
          line-height: 1.02;
          color: rgba(244, 235, 221, 0.9);
        }

        .zhixing-node p {
          margin: 1.1rem 0 0;
          max-width: 680px;
          color: rgba(220, 212, 195, 0.56);
          font-family: var(--font-yangming-hand);
          font-size: clamp(1rem, 1.7vw, 1.34rem);
          line-height: 1.85;
        }

        .zhixing-node a,
        .zhixing-bottom-actions a,
        .zhixing-demo a {
          display: inline-flex;
          min-height: 3.15rem;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(216, 183, 111, 0.22);
          border-radius: 999px;
          background: rgba(5, 8, 7, 0.34);
          padding: 0 1.45rem;
          color: rgba(244, 235, 221, 0.78);
          font-family: var(--font-interface);
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-decoration: none;
          transition: border-color 500ms ease, color 500ms ease, background 500ms ease, transform 500ms ease;
        }

        .zhixing-node a {
          margin-top: 1.35rem;
        }

        .zhixing-node--current a,
        .zhixing-demo a {
          background: linear-gradient(180deg, rgba(216, 183, 111, 0.7), rgba(151, 116, 52, 0.64));
          color: #151109;
        }

        .zhixing-node a[aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.42;
        }

        .zhixing-node a:hover,
        .zhixing-bottom-actions a:hover,
        .zhixing-demo a:hover {
          border-color: rgba(216, 183, 111, 0.38);
          transform: translateY(-1px);
        }

        .zhixing-seal {
          display: inline-grid;
          width: 2.7rem;
          aspect-ratio: 1;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.26);
          border-radius: 999px;
          color: rgba(216, 183, 111, 0.72);
          font-family: var(--font-yangming-hand);
          font-size: 0.8rem;
          letter-spacing: 0;
          transform: rotate(-7deg);
        }

        .zhixing-seal--sealed {
          box-shadow: 0 0 24px rgba(216, 183, 111, 0.08);
        }

        .zhixing-verdict,
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

        @media (max-width: 760px) {
          .zhixing-hero {
            padding-top: 7rem;
          }

          .zhixing-stage {
            padding-top: 5rem;
          }

          .zhixing-realm-strip {
            top: auto;
            position: relative;
            flex-direction: column;
            border-radius: 1.3rem;
          }

          .zhixing-node-stack {
            min-height: 760px;
          }

          .zhixing-node {
            top: 36%;
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
          .zhixing-mist__wash {
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
