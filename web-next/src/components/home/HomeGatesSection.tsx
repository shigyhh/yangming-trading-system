"use client"

import { useEffect, useRef } from "react"

import styles from "./HomeGatesSection.module.css"

type Gate = {
  href: string
  mark: string
  name: string
  line: string
  side: "left" | "right"
}

const gates: Gate[] = [
  {
    href: "/zhixing-scroll",
    mark: "卷",
    name: "知行心卷",
    line: "入今日一卷，照见、了断、再照。",
    side: "left",
  },
  {
    href: "/zhixing-still-water",
    mark: "镜",
    name: "明镜止水",
    line: "心如止水，物来则照，过而不留。",
    side: "right",
  },
  {
    href: "/one-thought-lake",
    mark: "湖",
    name: "一念心湖",
    line: "看见众人，也如你一般，被一念所牵。",
    side: "left",
  },
  {
    href: "/review",
    mark: "盘",
    name: "照见实盘",
    line: "不复盘行情对错，只复盘谁在下单。",
    side: "right",
  },
  {
    href: "/mirror-archive",
    mark: "藏",
    name: "档案馆",
    line: "日日所照，积成一径。这卷，是你。",
    side: "left",
  },
]

export function HomeGatesSection() {
  const rootRef = useRef<HTMLElement | null>(null)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const activeGateRef = useRef(-1)

  useEffect(() => {
    let frame = 0

    function updateGates() {
      frame = 0

      const viewportHeight = window.innerHeight || 1
      let closestIndex = -1
      let closestDistance = Number.POSITIVE_INFINITY

      sectionRefs.current.forEach((section, index) => {
        if (!section) return

        const rect = section.getBoundingClientRect()
        const sectionCenter = rect.top + rect.height / 2
        const distance = (sectionCenter - viewportHeight / 2) / viewportHeight
        const absDistance = Math.abs(distance)
        const progress = Math.min(absDistance / 0.78, 1)
        const inner = section.querySelector<HTMLElement>("[data-gate-inner]")
        const isGate = section.dataset.gate === "true"

        if (inner) {
          const minOpacity = isGate ? 0.14 : 0.22
          const opacity = Math.max(minOpacity, 1 - progress * 0.9)
          const blur = progress * (isGate ? 9 : 7)
          const brightness = 1.08 - progress * 0.34

          inner.style.opacity = opacity.toFixed(3)
          inner.style.filter = `blur(${blur.toFixed(1)}px) brightness(${brightness.toFixed(3)})`
          inner.style.transform = `translateY(${(distance * viewportHeight * 0.05).toFixed(1)}px) scale(${(1 - progress * 0.05).toFixed(3)})`
        }

        if (section.dataset.gate === "true" && absDistance < closestDistance) {
          closestDistance = absDistance
          closestIndex = index
        }
      })

      if (closestIndex !== activeGateRef.current && closestIndex >= 0 && closestDistance < 0.4) {
        activeGateRef.current = closestIndex
        sectionRefs.current.forEach((section) => section?.removeAttribute("data-here"))

        const current = sectionRefs.current[closestIndex]
        current?.setAttribute("data-here", "true")

        if (!current) return

        const isNarrow = window.innerWidth < 640
        const side = current.dataset.side
        const x = isNarrow ? 0.5 : side === "right" ? 0.7 : 0.3

        window.dispatchEvent(new CustomEvent("home-water-ripple", {
          detail: {
            life: 5200,
            max: Math.min(window.innerWidth, window.innerHeight) * 0.5,
            strength: 0.16,
            x,
            y: 0.52,
          },
        }))
      }
    }

    function requestUpdate() {
      if (frame) return
      frame = window.requestAnimationFrame(updateGates)
    }

    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", requestUpdate)
    updateGates()

    return () => {
      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const setSectionRef = (index: number) => (node: HTMLElement | null) => {
    sectionRefs.current[index] = node
  }

  return (
    <section
      ref={rootRef}
      data-home-roll="gates"
      aria-label="沿水而行，五处门"
      className={styles.root}
    >
      <svg className={styles.inkDefs} aria-hidden="true">
        <defs>
          <filter id="home-gates-ink" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="2" seed="9" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className={styles.content}>
        <section className={`${styles.section} ${styles.lead}`} ref={setSectionRef(0)}>
          <div className={styles.inner} data-gate-inner>
            <p className={styles.leadTitle}>顺这片水，往下走——</p>
            <p className={styles.leadLine}>五处，照见自己的五个去处。</p>
          </div>
        </section>

        {gates.map((gate, index) => (
          <section
            key={gate.name}
            className={`${styles.section} ${styles.gate}`}
            data-gate="true"
            data-side={gate.side}
            ref={setSectionRef(index + 1)}
          >
            <a href={gate.href} className={styles.inner} data-gate-inner>
              <span className={styles.seal}>{gate.mark}</span>
              <span className={styles.name}>{gate.name}</span>
              <span className={styles.gateLine} aria-hidden="true" />
              <span className={styles.line}>{gate.line}</span>
              <span className={styles.enter}>入　→</span>
            </a>
          </section>
        ))}

        <section className={`${styles.section} ${styles.coda}`} ref={setSectionRef(gates.length + 1)}>
          <div className={styles.inner} data-gate-inner>
            <p className={styles.codaLine}>见行情　·　见心　·　见人格</p>
            <a className={styles.codaDoor} href="/reflect">
              <span>照见一念　→</span>
              <i aria-hidden="true" />
            </a>
            <button type="button" className={styles.topLink} onClick={() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              ↑ 回到水面
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}
