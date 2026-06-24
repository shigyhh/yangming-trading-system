"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"

import HeroRightWaitingMirror from "@/components/home/HeroRightWaitingMirror"

import styles from "./HomeStillWaterHero.module.css"

type DivePhase = "shore" | "descend"

const HOME_DIVE_DURATION_MS = 2400
const HOME_ROUTE_DELAY_MS = 2200
const REFLECT_ENTRY_HREF = "/assessment-entry"

export default function HomeStillWaterHero() {
  const router = useRouter()
  const rootRef = useRef<HTMLElement | null>(null)
  const diveRafRef = useRef<number | null>(null)
  const routeTimerRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<DivePhase>("shore")

  const dispatchHomeWaterDive = useCallback((dive: number) => {
    window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive } }))
  }, [])

  const dispatchHomeWaterRipple = useCallback(
    (detail: {
      clientX?: number
      clientY?: number
      life?: number
      max?: number
      strength?: number
      x?: number
      y?: number
    }) => {
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const x = detail.x ?? (detail.clientX ?? width * 0.5) / width
      const y = detail.y ?? (detail.clientY ?? height * 0.5) / height

      window.dispatchEvent(
        new CustomEvent("home-water-ripple", {
          detail: {
            life: detail.life,
            max: detail.max,
            strength: detail.strength,
            x,
            y,
          },
        }),
      )
    },
    [],
  )

  const tweenDive = useCallback((to: number, duration: number, after?: () => void) => {
    if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)

    const root = rootRef.current
    const from = Number.parseFloat(root?.style.getPropertyValue("--dive") || "0")
    const start = performance.now()

    function tick(now: number) {
      const raw = Math.min((now - start) / duration, 1)
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const nextDive = from + (to - from) * eased
      root?.style.setProperty("--dive", nextDive.toFixed(3))
      dispatchHomeWaterDive(nextDive)

      if (raw < 1) {
        diveRafRef.current = window.requestAnimationFrame(tick)
        return
      }

      after?.()
    }

    diveRafRef.current = window.requestAnimationFrame(tick)
  }, [dispatchHomeWaterDive])

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current)
      if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)
      dispatchHomeWaterDive(0)
    }
  }, [dispatchHomeWaterDive])

  const enterReflect = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return

    event.preventDefault()
    if (phase !== "shore") return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(REFLECT_ENTRY_HREF)
      return
    }

    dispatchHomeWaterRipple({
      clientX: event.clientX,
      clientY: event.clientY,
      life: 6800,
      max: Math.max(window.innerWidth, window.innerHeight) * 0.9,
      strength: 0.48,
    })

    setPhase("descend")
    routeTimerRef.current = window.setTimeout(() => {
      router.push(REFLECT_ENTRY_HREF)
    }, HOME_ROUTE_DELAY_MS)
    tweenDive(1, HOME_DIVE_DURATION_MS)
  }, [dispatchHomeWaterRipple, phase, router, tweenDive])

  return (
    <section
      ref={rootRef}
      id="hero"
      data-home-roll="hero"
      data-home-scene="1"
      data-phase={phase}
      aria-label="阳明心学交易系统首屏"
      className={styles.root}
    >
      <div className={styles.diveLayer} aria-hidden="true">
        <span className={styles.diveArc} />
        <span className={`${styles.diveMote} ${styles.moteA}`} />
        <span className={`${styles.diveMote} ${styles.moteB}`} />
        <span className={`${styles.diveMote} ${styles.moteC}`} />
        <span className={`${styles.diveMote} ${styles.moteD}`} />
        <span className={`${styles.diveMote} ${styles.moteE}`} />
        <span className={`${styles.diveMote} ${styles.moteF}`} />
      </div>

      <div data-home-roll-plane className={styles.content}>
        <div className={styles.copy}>
          <h1 className={styles.title} data-hero-title aria-label="心不静，交易必乱。">
            <span>心不静，</span>
            <span>交易必乱。</span>
          </h1>

          <p className={styles.couplet} aria-label="市场照见价格 · 心镜照见自己">
            <span className={`${styles.coupletPhrase} ${styles.coupletMarket}`}>市场照见价格</span>
            <span className={styles.coupletDot} aria-hidden="true">｜</span>
            <span className={`${styles.coupletPhrase} ${styles.coupletMirror}`}>心镜照见自己</span>
          </p>
          <div className={styles.entryGroup}>
            <p className={styles.subcopy}>今天，你起了哪一念？</p>

            <a href={REFLECT_ENTRY_HREF} className={styles.door} data-no-ripple="true" onClick={enterReflect}>
              <span className={styles.doorMain}>
                <span className={styles.doorSeal} aria-hidden="true">
                  <svg className={styles.doorSealSvg} viewBox="0 0 80 80" focusable="false" aria-hidden="true">
                    <circle className={styles.doorSealTrack} cx="40" cy="40" r="36" />
                    <circle className={styles.doorSealArc} cx="40" cy="40" r="36" />
                  </svg>
                  <span className={styles.doorSealMoon} />
                </span>
                <span className={styles.doorText}>
                  <span className={styles.doorLabelText}>照见一念</span>
                  <span className={styles.doorSubText}>入心镜</span>
                </span>
              </span>
            </a>
          </div>
        </div>

        <div className={styles.rightSealStage}>
          <HeroRightWaitingMirror className={styles.rightSealWatermark} />
        </div>
      </div>

    </section>
  )
}
