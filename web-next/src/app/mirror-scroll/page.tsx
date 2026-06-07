"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  SecondaryLink,
} from "@/features/assessment/components"
import { loadMirrorScrollData } from "@/features/mirror-scroll/scrollEngine"
import type { MirrorScrollData, MirrorScrollDayGroup, MirrorScrollNode } from "@/features/mirror-scroll/scrollTypes"

type FilterValue = "all" | string

interface RiverDay {
  id: string
  dateLabel: string
  dayIndex: number
  nodes: MirrorScrollNode[]
  primaryNode: MirrorScrollNode
  tradeMoment: string
  os: string
  reflection: string
  thief: string
  mirrorId: string
  mirrorName: string
  sceneName: string
  evidence: string
  practice: string
  sealedAt: string
  completed: boolean
  repeatCount: number
}

const FOG_PARALLAX = [0.08, 0.15, 0.24]
const DEFAULT_THIEF = "待显影"
const DEFAULT_MIRROR = "心镜待显影"

export default function MirrorScrollPage() {
  const [scrollData, setScrollData] = useState<MirrorScrollData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [releasedIds, setReleasedIds] = useState<Set<string>>(() => new Set())
  const [thiefFilter, setThiefFilter] = useState<FilterValue>("all")
  const [mirrorFilter, setMirrorFilter] = useState<FilterValue>("all")
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const stationRefs = useRef<Array<HTMLElement | null>>([])
  const fogRefs = useRef<Array<HTMLSpanElement | null>>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setScrollData(loadMirrorScrollData())
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const riverDays = useMemo(() => buildRiverDays(scrollData?.groups ?? []), [scrollData])
  const thiefOptions = useMemo(() => uniqueOptions(riverDays.map((day) => day.thief)), [riverDays])
  const mirrorOptions = useMemo(() => uniqueOptions(riverDays.map((day) => day.mirrorName)), [riverDays])
  const filteredDays = useMemo(
    () =>
      riverDays.filter((day) => {
        const matchesThief = thiefFilter === "all" || day.thief === thiefFilter
        const matchesMirror = mirrorFilter === "all" || day.mirrorName === mirrorFilter
        return matchesThief && matchesMirror
      }),
    [mirrorFilter, riverDays, thiefFilter],
  )
  const topThought = useMemo(() => getTopThought(riverDays), [riverDays])
  const timeTone = getTimeToneClass()

  const measureStations = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const viewport = scroller.clientHeight || 1
    const center = scroller.scrollTop + viewport / 2
    let nextActiveIndex = 0
    let smallestDistance = Number.POSITIVE_INFINITY

    fogRefs.current.forEach((fog, index) => {
      if (!fog) return
      fog.style.transform = `translate3d(0, ${scroller.scrollTop * FOG_PARALLAX[index]}px, 0)`
    })

    stationRefs.current.forEach((station, index) => {
      if (!station) return
      const stationCenter = station.offsetTop + station.offsetHeight / 2
      const relative = (stationCenter - center) / viewport
      const distance = Math.abs(relative)
      const opacity = distance < 1 ? lerp(1, 0.42, distance) : Math.max(0.16, 0.42 - (distance - 1) * 0.22)
      const scale = distance < 1 ? lerp(1, 0.9, distance) : Math.max(0.74, 0.9 - (distance - 1) * 0.12)
      const blur = Math.min(14, distance * 7)
      const translateY = relative * 64
      const brightness = Math.max(0.42, 1 - distance * 0.22)
      const saturate = Math.max(0.58, 1 - distance * 0.16)

      station.style.setProperty("--station-opacity", String(opacity))
      station.style.setProperty("--station-scale", String(scale))
      station.style.setProperty("--station-blur", `${blur}px`)
      station.style.setProperty("--station-y", `${translateY}px`)
      station.style.setProperty("--station-bright", String(brightness))
      station.style.setProperty("--station-saturate", String(saturate))
      station.style.setProperty("--station-depth", String(Math.min(1, distance)))

      if (distance < smallestDistance) {
        smallestDistance = distance
        nextActiveIndex = index
      }
    })

    setActiveIndex(nextActiveIndex)
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onScroll = () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(measureStations)
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    window.requestAnimationFrame(measureStations)

    return () => {
      scroller.removeEventListener("scroll", onScroll)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [filteredDays.length, measureStations])

  useEffect(() => {
    setActiveIndex(0)
    setExpandedId(null)
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [mirrorFilter, thiefFilter])

  const scrollToStation = useCallback((index: number) => {
    const station = stationRefs.current[index]
    const scroller = scrollerRef.current
    if (!station || !scroller) return
    scroller.scrollTo({ top: station.offsetTop, behavior: "smooth" })
  }, [])

  const releaseThought = useCallback((dayId: string) => {
    setReleasedIds((current) => {
      const next = new Set(current)
      next.add(dayId)
      return next
    })
    setExpandedId(dayId)
  }, [])

  if (!loaded || !scrollData) {
    return (
      <AssessmentShell contentWidth="wide">
        <div className="river-loading">正在展开心镜长卷</div>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-0" contentWidth="wide">
      <main className={`mirror-river-page ${timeTone}`}>
        <section className="river-hero">
          <p className="river-kicker">明镜止水 · 照见长卷</p>
          <h1>心镜长卷</h1>
          <p className="river-subtitle">
            不是记录你做过什么。
            <br />
            而是记录你一次次看见了谁在下单。
          </p>

          <ol className="four-teaching-flow" aria-label="四句教动线">
            <li><span>入照心</span>无善无恶心之体</li>
            <li><span>今日一念</span>有善有恶意之动</li>
            <li><span>心贼显影</span>知善知恶是良知</li>
            <li><span>照回落印</span>为善去恶是格物</li>
          </ol>

          {riverDays.length ? (
            <div className="river-summary" aria-label="长卷摘要">
              <span>你已经照见 {riverDays.length} 念。</span>
              <strong>其中，最常出现的是：「{topThought || "待照见"}」</strong>
              <em>你不是没有变化。是有些念头，已经不再那么重。</em>
            </div>
          ) : (
            <div className="river-summary is-empty">
              <span>长卷尚未展开。</span>
              <strong>今日照见第一念，长卷便有了第一笔。</strong>
            </div>
          )}
        </section>

        <section className="river-filter-bar" aria-label="长卷筛选">
          <button type="button" onClick={() => scrollToStation(Math.max(0, filteredDays.length - 1))}>
            回到今日
          </button>
          <FilterGroup label="只看心贼" options={thiefOptions} value={thiefFilter} onChange={setThiefFilter} />
          <FilterGroup label="只看镜" options={mirrorOptions} value={mirrorFilter} onChange={setMirrorFilter} />
        </section>

        {filteredDays.length ? (
          <section className="heart-river" aria-label="心镜长卷时间长河">
            <div className="river-scroller" ref={scrollerRef}>
              <div className="river-mist" aria-hidden="true">
                {[0, 1, 2].map((layer) => (
                  <span
                    key={layer}
                    ref={(element) => {
                      fogRefs.current[layer] = element
                    }}
                  />
                ))}
              </div>
              <div className="river-gold-line" aria-hidden="true" />
              {filteredDays.length >= 7 ? <div className="river-seven-line" aria-hidden="true" /> : null}

              {filteredDays.map((day, index) => (
                <RiverStation
                  key={day.id}
                  active={index === activeIndex}
                  day={day}
                  expanded={expandedId === day.id}
                  released={releasedIds.has(day.id)}
                  onRelease={() => releaseThought(day.id)}
                  onToggle={() => setExpandedId((current) => (current === day.id ? null : day.id))}
                  setRef={(element) => {
                    stationRefs.current[index] = element
                  }}
                />
              ))}
            </div>

            <nav className="river-progress" aria-label="长卷进度">
              {filteredDays.map((day, index) => (
                <button
                  key={day.id}
                  type="button"
                  className={index === activeIndex ? "is-active" : ""}
                  onClick={() => scrollToStation(index)}
                  aria-label={`回到 ${formatDayNumber(day.dayIndex)} ${day.os}`}
                >
                  <span />
                </button>
              ))}
            </nav>
          </section>
        ) : (
          <section className="river-empty">
            <p>这道筛选下，长卷暂时没有显影。</p>
            <button
              type="button"
              onClick={() => {
                setThiefFilter("all")
                setMirrorFilter("all")
              }}
            >
              看全部心证印记
            </button>
          </section>
        )}

        {riverDays.length ? (
          <section className="backlight-reflection" aria-label="回光返照">
            <p>回光返照</p>
            <h2>原来，我一直照的，是自己的心。</h2>
            <div className="sunken-proofs">
              {riverDays.slice(-3).map((day) => (
                <span key={day.id}>{day.evidence}</span>
              ))}
            </div>
            <strong>明日再照。</strong>
          </section>
        ) : null}

        <section className="river-footnote" aria-label="长卷归处">
          <div>
            <p>复测变化</p>
            <span>
              {scrollData.summary.retestCount
                ? `已有 ${scrollData.summary.retestCount} 次复照，继续看这一念是否变轻。`
                : "复测不是证明完美，而是看见自己是否比过去更清明。"}
            </span>
          </div>
          <div className="river-links">
            <SecondaryLink href="/mirror-archive">心镜档案馆 →</SecondaryLink>
            <SecondaryLink href="/assessment">今日照见 →</SecondaryLink>
            <SecondaryLink href="/practice-change?preview=1">今日修行 →</SecondaryLink>
          </div>
        </section>

        <ComplianceNote>
          本页仅用于展示交易心理训练与行为复盘的成长叙事；不预测行情，不提供买卖建议，不构成任何投资建议。
        </ComplianceNote>
      </main>

      <style jsx>{`
        .mirror-river-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 18%, rgba(181, 151, 80, 0.08), transparent 24rem),
            radial-gradient(circle at 50% 64%, rgba(42, 74, 63, 0.2), transparent 34rem),
            linear-gradient(180deg, #030806 0%, #07100d 48%, #020403 100%);
          color: rgba(243, 236, 219, 0.92);
        }

        .mirror-river-page::before,
        .mirror-river-page::after {
          content: "";
          position: fixed;
          inset: -12vh -8vw;
          pointer-events: none;
          z-index: 0;
        }

        .mirror-river-page::before {
          background:
            radial-gradient(ellipse at 24% 26%, rgba(213, 188, 116, 0.04), transparent 24rem),
            radial-gradient(ellipse at 76% 68%, rgba(95, 132, 117, 0.08), transparent 28rem);
          filter: blur(12px);
          animation: river-breathe 18s ease-in-out infinite alternate;
        }

        .mirror-river-page::after {
          opacity: 0.35;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.014) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(circle at center, black, transparent 72%);
        }

        .mirror-river-page.is-morning {
          background:
            radial-gradient(circle at 50% 18%, rgba(210, 196, 150, 0.07), transparent 24rem),
            radial-gradient(circle at 52% 58%, rgba(54, 84, 76, 0.22), transparent 34rem),
            linear-gradient(180deg, #06100e 0%, #091612 48%, #020403 100%);
        }

        .mirror-river-page.is-afternoon {
          background:
            radial-gradient(circle at 50% 18%, rgba(213, 188, 116, 0.09), transparent 24rem),
            radial-gradient(circle at 50% 64%, rgba(45, 78, 66, 0.2), transparent 34rem),
            linear-gradient(180deg, #040907 0%, #07110e 48%, #020403 100%);
        }

        .mirror-river-page.is-dusk {
          background:
            radial-gradient(circle at 50% 18%, rgba(158, 101, 64, 0.1), transparent 24rem),
            radial-gradient(circle at 50% 64%, rgba(43, 64, 56, 0.22), transparent 34rem),
            linear-gradient(180deg, #050706 0%, #0b100d 48%, #020403 100%);
        }

        .river-loading {
          min-height: 72vh;
          display: grid;
          place-items: center;
          font-family: var(--font-story);
          font-size: clamp(2rem, 6vw, 5rem);
          color: rgba(242, 235, 220, 0.72);
        }

        .river-hero,
        .river-filter-bar,
        .heart-river,
        .river-empty,
        .river-footnote {
          position: relative;
          z-index: 1;
        }

        .river-hero {
          min-height: 54svh;
          display: grid;
          place-items: center;
          align-content: center;
          padding: clamp(5rem, 12vw, 9rem) 1.25rem 2.8rem;
          text-align: center;
        }

        .river-kicker {
          font-family: var(--font-function);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.28em;
          color: rgba(184, 154, 85, 0.9);
        }

        .river-hero h1 {
          margin-top: 1.35rem;
          font-family: var(--font-story);
          font-size: clamp(4.6rem, 15vw, 12rem);
          font-weight: 300;
          line-height: 0.95;
          letter-spacing: 0.1em;
          color: rgba(243, 236, 219, 0.9);
          text-shadow: 0 0 34px rgba(213, 188, 116, 0.08);
        }

        .river-subtitle {
          margin-top: clamp(1.5rem, 4vw, 2.6rem);
          max-width: 52rem;
          font-family: var(--font-story);
          font-size: clamp(1.2rem, 2.4vw, 2rem);
          font-weight: 300;
          line-height: 1.9;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.62);
        }

        .river-summary {
          margin-top: clamp(1.5rem, 4vw, 2.4rem);
          display: grid;
          gap: 0.62rem;
          font-family: var(--font-function);
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.55);
        }

        .river-summary strong {
          font-family: var(--font-story);
          font-size: clamp(1.35rem, 3vw, 2.35rem);
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(243, 236, 219, 0.82);
        }

        .river-summary em {
          font-style: normal;
          color: rgba(184, 154, 85, 0.78);
        }

        .four-teaching-flow {
          margin: clamp(1.4rem, 4vw, 2.4rem) auto 0;
          padding: 0;
          width: min(880px, 100%);
          display: grid;
          gap: 0.6rem;
          list-style: none;
          font-family: var(--font-function);
          color: rgba(220, 212, 195, 0.42);
        }

        .four-teaching-flow li {
          display: flex;
          gap: 0.8rem;
          justify-content: center;
          align-items: baseline;
          font-size: 0.82rem;
          letter-spacing: 0.1em;
        }

        .four-teaching-flow span {
          color: rgba(184, 154, 85, 0.78);
          font-weight: 700;
        }

        @media (min-width: 880px) {
          .four-teaching-flow {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .four-teaching-flow li {
            display: grid;
            gap: 0.3rem;
          }
        }

        .river-filter-bar {
          width: min(1180px, calc(100vw - 32px));
          margin: 0 auto 1.8rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: center;
          font-family: var(--font-function);
        }

        .river-filter-bar button,
        .filter-group button,
        .river-empty button {
          appearance: none;
          border: 1px solid rgba(184, 154, 85, 0.22);
          border-radius: 999px;
          background: rgba(3, 8, 6, 0.42);
          color: rgba(220, 212, 195, 0.66);
          cursor: pointer;
          letter-spacing: 0.1em;
          transition:
            border-color 220ms ease,
            color 220ms ease,
            background 220ms ease,
            transform 220ms ease;
        }

        .river-filter-bar > button {
          padding: 0.7rem 1.1rem;
        }

        .river-filter-bar button:hover,
        .filter-group button.is-active,
        .river-empty button:hover {
          border-color: rgba(212, 189, 121, 0.58);
          background: rgba(184, 154, 85, 0.12);
          color: rgba(243, 236, 219, 0.9);
          transform: translateY(-1px);
        }

        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.42rem;
          align-items: center;
          justify-content: center;
        }

        .filter-group span {
          margin-right: 0.22rem;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(184, 154, 85, 0.76);
        }

        .filter-group button {
          padding: 0.58rem 0.86rem;
          font-size: 0.74rem;
        }

        .heart-river {
          width: min(1240px, 100vw);
          margin: 0 auto;
        }

        .river-scroller {
          position: relative;
          height: 100svh;
          overflow-y: auto;
          overscroll-behavior: contain;
          scroll-snap-type: y mandatory;
          scrollbar-width: none;
          border-top: 1px solid rgba(184, 154, 85, 0.06);
          border-bottom: 1px solid rgba(184, 154, 85, 0.06);
          background:
            radial-gradient(ellipse at 50% 50%, rgba(25, 47, 39, 0.2), transparent 34rem),
            linear-gradient(180deg, rgba(3, 8, 6, 0.12), rgba(3, 8, 6, 0.62));
        }

        .river-scroller::-webkit-scrollbar {
          display: none;
        }

        .river-mist {
          position: sticky;
          top: 0;
          height: 0;
          z-index: 1;
          pointer-events: none;
        }

        .river-mist span {
          position: absolute;
          inset: -18vh -12vw;
          display: block;
          opacity: 0.42;
          filter: blur(18px);
          background:
            radial-gradient(ellipse at 22% 24%, rgba(225, 216, 190, 0.055), transparent 22rem),
            radial-gradient(ellipse at 74% 66%, rgba(95, 132, 117, 0.11), transparent 26rem);
          animation: mist-drift 16s ease-in-out infinite alternate;
        }

        .river-mist span:nth-child(2) {
          opacity: 0.32;
          animation-duration: 22s;
          background:
            radial-gradient(ellipse at 52% 16%, rgba(184, 154, 85, 0.06), transparent 20rem),
            radial-gradient(ellipse at 48% 82%, rgba(14, 27, 22, 0.82), transparent 26rem);
        }

        .river-mist span:nth-child(3) {
          opacity: 0.46;
          animation-duration: 28s;
          background: linear-gradient(180deg, rgba(2, 5, 4, 0.82), transparent 28%, transparent 70%, rgba(2, 5, 4, 0.88));
        }

        .river-gold-line {
          position: sticky;
          top: 0;
          z-index: 0;
          height: 0;
          pointer-events: none;
        }

        .river-gold-line::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 5vh;
          width: min(56vw, 720px);
          height: 92vh;
          transform: translateX(-50%);
          border-left: 1px solid rgba(184, 154, 85, 0.1);
          border-radius: 48% 42% 55% 38%;
          opacity: 0.75;
          filter: blur(0.3px);
          mask-image: linear-gradient(180deg, transparent, black 20%, black 78%, transparent);
        }

        .river-seven-line {
          position: sticky;
          top: 50%;
          z-index: 2;
          width: min(46rem, 72vw);
          height: 1px;
          margin: 0 auto;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(184, 154, 85, 0.34), transparent);
          filter: blur(0.6px);
          opacity: 0.42;
        }

        .river-station {
          min-height: 100svh;
          scroll-snap-align: center;
          display: grid;
          place-items: center;
          padding: 8vh 1.25rem;
          position: relative;
          z-index: 3;
        }

        .river-station::before {
          content: "";
          position: absolute;
          inset: 18vh 18vw;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(184, 154, 85, 0.12), transparent 62%);
          opacity: calc(0.12 + (1 - var(--station-depth, 0)) * 0.3);
          filter: blur(18px);
          pointer-events: none;
        }

        .river-station__inner {
          position: relative;
          width: min(920px, calc(100vw - 28px));
          min-height: min(68vh, 740px);
          display: grid;
          place-items: center;
          align-content: center;
          gap: clamp(1rem, 2vw, 1.55rem);
          padding: clamp(1rem, 4vw, 3rem) 0;
          text-align: center;
          color: inherit;
          cursor: default;
          outline: none;
          opacity: var(--station-opacity, 1);
          transform: translateY(var(--station-y, 0)) scale(var(--station-scale, 1));
          filter:
            blur(var(--station-blur, 0))
            brightness(var(--station-bright, 1))
            saturate(var(--station-saturate, 1));
          transition:
            opacity 260ms ease,
            transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .river-station__inner:focus-visible {
          box-shadow: 0 0 0 1px rgba(212, 189, 121, 0.42);
        }

        .river-day-mark {
          font-family: var(--font-function);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(184, 154, 85, 0.82);
        }

        .water-impact {
          position: absolute;
          left: 50%;
          top: 42%;
          width: min(58vw, 620px);
          aspect-ratio: 1 / 0.58;
          transform: translate(-50%, -50%);
          pointer-events: none;
          opacity: calc(0.12 + (1 - var(--station-depth, 0)) * 0.32);
        }

        .water-impact::before,
        .water-impact::after {
          content: "";
          position: absolute;
          inset: 8%;
          border: 1px solid rgba(184, 154, 85, 0.14);
          border-radius: 52% 48% 44% 56%;
          filter: blur(1px);
          animation: water-ripple 1.55s ease-out infinite;
        }

        .water-impact::after {
          inset: 20%;
          opacity: 0.55;
          animation-delay: 420ms;
        }

        .river-station.is-released .water-impact::before,
        .river-station.is-released .water-impact::after {
          animation-duration: 4.6s;
          opacity: 0.18;
        }

        .thief-shadow {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(42vw, 520px);
          height: min(22vw, 260px);
          transform: translate(-50%, -48%);
          display: grid;
          place-items: center;
          pointer-events: none;
          opacity: calc(0.18 + (1 - var(--station-depth, 0)) * 0.32);
          filter: blur(16px);
          color: rgba(24, 16, 13, 0.82);
          text-shadow: 0 0 26px rgba(99, 44, 34, 0.3);
        }

        .thief-shadow span {
          font-family: var(--font-story);
          font-size: clamp(3.5rem, 10vw, 9rem);
          font-weight: 300;
          letter-spacing: 0.16em;
          transform: translateY(18px) scale(1.08);
        }

        .river-station.is-active .thief-shadow {
          animation: shadow-approach 4.8s ease-in-out infinite;
        }

        .river-station.is-released .thief-shadow {
          opacity: 0.12;
          filter: blur(30px);
        }

        .thought-stone {
          position: relative;
          z-index: 2;
          appearance: none;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          max-width: min(100%, 920px);
          font-family: var(--font-story);
          font-size: clamp(3rem, 9vw, 8.2rem);
          font-weight: 300;
          line-height: 1.08;
          letter-spacing: 0.07em;
          color: rgba(243, 236, 219, 0.88);
          text-shadow: 0 0 42px rgba(213, 188, 116, 0.1);
        }

        .thought-stone::before {
          content: "";
          position: absolute;
          left: 12%;
          right: 12%;
          bottom: -0.24em;
          height: 0.42em;
          background: radial-gradient(ellipse, rgba(184, 154, 85, 0.12), transparent 70%);
          filter: blur(18px);
          opacity: 0.72;
          pointer-events: none;
        }

        .thought-stone span {
          display: inline-block;
          transition:
            opacity 760ms ease,
            transform 760ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 760ms ease;
        }

        .thought-stone.is-holding span {
          animation: ink-dissolve 980ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .river-station.is-released .thought-stone span {
          opacity: 0.24;
          transform: translateY(28px) scale(0.94);
          filter: blur(7px);
        }

        .hold-hint {
          position: relative;
          z-index: 2;
          margin-top: -0.2rem;
          font-family: var(--font-function);
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          color: rgba(220, 212, 195, 0.42);
        }

        .release-state {
          position: relative;
          z-index: 3;
          display: grid;
          gap: 0.55rem;
          animation: release-rise 820ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .release-state strong {
          font-family: var(--font-story);
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 300;
          letter-spacing: 0.16em;
          color: rgba(194, 91, 68, 0.9);
          text-shadow: 0 0 34px rgba(143, 62, 47, 0.16);
        }

        .release-state p {
          margin: 0;
          font-family: var(--font-story);
          font-size: clamp(1rem, 2vw, 1.45rem);
          font-weight: 300;
          line-height: 1.85;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.58);
        }

        .river-reflection {
          max-width: 56rem;
          font-family: var(--font-story);
          font-size: clamp(1.2rem, 2vw, 1.75rem);
          font-weight: 300;
          line-height: 1.9;
          letter-spacing: 0.07em;
          color: rgba(220, 212, 195, 0.68);
        }

        .river-underwater {
          display: flex;
          flex-wrap: wrap;
          gap: 1.2rem;
          justify-content: center;
          font-family: var(--font-function);
          font-size: 0.9rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.5);
        }

        .river-underwater strong {
          margin-left: 0.42rem;
          font-family: var(--font-story);
          font-size: 1.35em;
          font-weight: 300;
          color: rgba(184, 154, 85, 0.9);
        }

        .river-practice {
          max-width: 44rem;
          font-family: var(--font-function);
          font-size: 0.98rem;
          line-height: 1.9;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.56);
        }

        .river-repeat {
          font-family: var(--font-function);
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          color: rgba(184, 154, 85, 0.72);
        }

        .river-reveal-trigger {
          appearance: none;
          border: 0;
          background: transparent;
          color: rgba(184, 154, 85, 0.76);
          cursor: pointer;
          font-family: var(--font-function);
          font-size: 0.8rem;
          letter-spacing: 0.16em;
          padding: 0.2rem 0;
        }

        .river-reveal-trigger:hover {
          color: rgba(243, 236, 219, 0.82);
        }

        .echo-rings {
          position: absolute;
          inset: 50% auto auto 50%;
          width: min(60vw, 560px);
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          pointer-events: none;
          opacity: 0.56;
        }

        .echo-rings span {
          position: absolute;
          inset: calc(var(--i) * 6%);
          border: 1px solid rgba(184, 154, 85, 0.12);
          border-radius: 53% 47% 42% 58%;
          filter: blur(0.7px);
          animation: echo-breathe 5.6s ease-in-out infinite;
          animation-delay: calc(var(--i) * -380ms);
        }

        .zhu-seal {
          display: inline-grid;
          place-items: center;
          min-width: 4.8rem;
          height: 2.5rem;
          padding: 0 0.85rem;
          border: 1px solid rgba(143, 62, 47, 0.52);
          border-radius: 999px;
          font-family: var(--font-story);
          font-size: 1rem;
          letter-spacing: 0.14em;
          color: rgba(194, 91, 68, 0.9);
          background: rgba(91, 32, 26, 0.12);
          box-shadow: 0 0 28px rgba(143, 62, 47, 0.12);
        }

        .river-station.is-active .zhu-seal {
          animation: seal-glow 4.8s ease-in-out infinite;
        }

        .river-strike {
          width: min(820px, 100%);
          display: grid;
          gap: 1rem;
          margin-top: 0.4rem;
          padding-top: 1.35rem;
          border-top: 1px solid rgba(184, 154, 85, 0.18);
          animation: strike-reveal 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .river-strike p {
          margin: 0;
          display: grid;
          grid-template-columns: minmax(5.8rem, 0.28fr) minmax(0, 1fr);
          gap: 1rem;
          text-align: left;
          font-family: var(--font-function);
          font-size: 0.92rem;
          line-height: 1.9;
          color: rgba(220, 212, 195, 0.64);
        }

        .river-strike span {
          color: rgba(184, 154, 85, 0.8);
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .backlight-reflection {
          position: relative;
          z-index: 1;
          min-height: 72svh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 1.35rem;
          padding: 6rem 1.25rem;
          text-align: center;
          overflow: hidden;
        }

        .backlight-reflection::before {
          content: "";
          position: absolute;
          inset: 18% 18%;
          background: radial-gradient(ellipse at center, rgba(242, 235, 220, 0.1), transparent 58%);
          filter: blur(26px);
          opacity: 0.5;
          pointer-events: none;
          animation: backlight-stillness 7s ease-in-out infinite alternate;
        }

        .backlight-reflection p {
          position: relative;
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(184, 154, 85, 0.82);
        }

        .backlight-reflection h2 {
          position: relative;
          margin: 0;
          font-family: var(--font-story);
          font-size: clamp(2.6rem, 7vw, 7rem);
          font-weight: 300;
          line-height: 1.2;
          letter-spacing: 0.08em;
          color: rgba(243, 236, 219, 0.88);
        }

        .sunken-proofs {
          position: relative;
          width: min(760px, 100%);
          display: grid;
          gap: 0.7rem;
          font-family: var(--font-story);
          font-size: clamp(1rem, 2vw, 1.45rem);
          line-height: 1.8;
          letter-spacing: 0.07em;
          color: rgba(220, 212, 195, 0.44);
        }

        .backlight-reflection strong {
          position: relative;
          font-family: var(--font-story);
          font-size: clamp(1.5rem, 3vw, 2.6rem);
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(184, 154, 85, 0.84);
        }

        .river-progress {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1rem 0;
        }

        .river-progress button {
          width: 1.35rem;
          height: 1.35rem;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .river-progress span {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 999px;
          background: rgba(220, 212, 195, 0.22);
          transition:
            transform 220ms ease,
            background 220ms ease,
            box-shadow 220ms ease;
        }

        .river-progress button.is-active span {
          transform: scale(1.6);
          background: rgba(184, 154, 85, 0.92);
          box-shadow: 0 0 20px rgba(184, 154, 85, 0.28);
        }

        .river-empty {
          min-height: 44vh;
          display: grid;
          place-items: center;
          gap: 1.2rem;
          text-align: center;
          color: rgba(220, 212, 195, 0.62);
        }

        .river-empty button {
          padding: 0.8rem 1.2rem;
        }

        .river-footnote {
          width: min(1180px, calc(100vw - 32px));
          margin: 2.4rem auto 0;
          display: grid;
          gap: 1.2rem;
          align-items: center;
          padding-bottom: 1rem;
        }

        .river-footnote p {
          margin: 0 0 0.45rem;
          font-family: var(--font-function);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(184, 154, 85, 0.76);
        }

        .river-footnote span {
          font-family: var(--font-story);
          font-size: clamp(1.2rem, 2.2vw, 1.8rem);
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.62);
        }

        .river-links {
          display: grid;
          gap: 0.75rem;
        }

        @media (min-width: 960px) {
          .river-footnote {
            grid-template-columns: minmax(0, 1fr) minmax(320px, 0.42fr);
          }
        }

        @media (max-width: 720px) {
          .river-hero {
            min-height: 52svh;
            padding-top: 4.5rem;
          }

          .river-filter-bar {
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 0.35rem;
          }

          .filter-group {
            flex-wrap: nowrap;
          }

          .river-scroller {
            height: 100svh;
          }

          .river-station {
            padding-inline: 0.9rem;
          }

          .river-station__inner {
            min-height: 76vh;
            width: min(100%, calc(100vw - 24px));
          }

          .river-underwater {
            display: grid;
            gap: 0.7rem;
          }

          .river-strike p {
            grid-template-columns: 1fr;
            gap: 0.2rem;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mirror-river-page::before,
          .river-mist span,
          .echo-rings span,
          .river-station.is-active .zhu-seal {
            animation: none;
          }

          .river-scroller {
            scroll-behavior: auto;
          }
        }

        @keyframes river-breathe {
          from {
            opacity: 0.62;
            transform: scale(1);
          }

          to {
            opacity: 0.9;
            transform: scale(1.04);
          }
        }

        @keyframes mist-drift {
          from {
            transform: translate3d(-1.8vw, -1vh, 0) scale(1);
          }

          to {
            transform: translate3d(2vw, 1.5vh, 0) scale(1.04);
          }
        }

        @keyframes echo-breathe {
          0%,
          100% {
            opacity: 0.12;
            transform: scale(0.96) rotate(0deg);
          }

          50% {
            opacity: 0.36;
            transform: scale(1.04) rotate(8deg);
          }
        }

        @keyframes seal-glow {
          0%,
          100% {
            filter: saturate(0.82);
            transform: translateY(0);
          }

          50% {
            filter: saturate(1.1);
            transform: translateY(-1px);
          }
        }

        @keyframes water-ripple {
          from {
            opacity: 0.34;
            transform: scale(0.82) rotate(0deg);
          }

          to {
            opacity: 0;
            transform: scale(1.18) rotate(8deg);
          }
        }

        @keyframes shadow-approach {
          0%,
          100% {
            transform: translate(-50%, -46%) scale(1);
          }

          50% {
            transform: translate(-50%, -53%) scale(1.04);
          }
        }

        @keyframes ink-dissolve {
          0% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }

          62% {
            opacity: 0.46;
            filter: blur(5px);
            transform: translateY(18px) scale(0.98);
          }

          100% {
            opacity: 0.2;
            filter: blur(9px);
            transform: translateY(34px) scale(0.94);
          }
        }

        @keyframes release-rise {
          from {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes strike-reveal {
          from {
            opacity: 0;
            filter: blur(12px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes backlight-stillness {
          from {
            opacity: 0.28;
            transform: scale(0.98);
          }

          to {
            opacity: 0.56;
            transform: scale(1.04);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

function RiverStation({
  active,
  day,
  expanded,
  onRelease,
  onToggle,
  released,
  setRef,
}: {
  active: boolean
  day: RiverDay
  expanded: boolean
  onRelease: () => void
  onToggle: () => void
  released: boolean
  setRef: (element: HTMLElement | null) => void
}) {
  const [isHolding, setIsHolding] = useState(false)
  const holdTimerRef = useRef<number | null>(null)

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setIsHolding(false)
  }, [])

  const startHold = useCallback(() => {
    clearHold()
    setIsHolding(true)
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      setIsHolding(false)
      onRelease()
    }, 980)
  }, [clearHold, onRelease])

  useEffect(() => clearHold, [clearHold])

  return (
    <section
      ref={setRef}
      className={`river-station${active ? " is-active" : ""}${expanded ? " is-expanded" : ""}${released ? " is-released" : ""}`}
      aria-label={`${formatDayNumber(day.dayIndex)} ${day.os}`}
    >
      <article
        className="river-station__inner"
      >
        <EchoRings count={day.repeatCount} />
        <div className="water-impact" aria-hidden="true" />
        <div className="thief-shadow" aria-hidden="true">
          <span>{day.thief}</span>
        </div>
        <p className="river-day-mark">{formatDayNumber(day.dayIndex)} · {day.dateLabel}</p>
        <button
          type="button"
          className={`thought-stone${isHolding ? " is-holding" : ""}`}
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerCancel={clearHold}
          onPointerLeave={clearHold}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onRelease()
            }
          }}
          aria-label={`长按放下这一念：${day.os}`}
        >
          <span>「{day.os}」</span>
        </button>
        <p className="hold-hint">长按这一念，让它沉入水底。</p>
        {released ? (
          <div className="release-state" aria-live="polite">
            <strong>已照见</strong>
            <p>
              知而不行，只是未知。
              <br />
              今日这一念，已被你亲手放下。
            </p>
          </div>
        ) : null}
        <p className="river-reflection">{day.reflection}</p>
        <div className="river-underwater" aria-label="心贼与九镜">
          <span>
            心贼
            <strong>{day.thief}</strong>
          </span>
          <span>
            九镜
            <strong>{day.mirrorName}</strong>
          </span>
          <span>
            场景
            <strong>{day.sceneName}</strong>
          </span>
        </div>
        <p className="river-practice">{day.practice}</p>
        {day.repeatCount > 1 ? <p className="river-repeat">这一念出现 {day.repeatCount} 次，水面留下 {Math.min(day.repeatCount, 7)} 道回纹。</p> : null}
        {day.completed ? <span className="zhu-seal">已照见</span> : null}
        <button type="button" className="river-reveal-trigger" onClick={onToggle}>
          {expanded ? "收起水下照回" : "轻触水面，照回完整一念"}
        </button>

        {expanded ? (
          <div className="river-strike" aria-label="完整照见">
            <p><span>交易现场</span>{day.tradeMoment}</p>
            <p><span>一念</span>「{day.os}」</p>
            <p><span>照回</span>{day.reflection}</p>
            <p><span>心贼</span>{day.thief}</p>
            <p><span>九镜</span>{day.mirrorName}</p>
            <p><span>心证</span>{day.evidence}</p>
            <p><span>修行</span>{day.practice}</p>
            <p><span>落印时间</span>{formatSealTime(day.sealedAt)}</p>
          </div>
        ) : null}
      </article>
    </section>
  )
}

function FilterGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: FilterValue) => void
  options: string[]
  value: FilterValue
}) {
  return (
    <div className="filter-group">
      <span>{label}</span>
      <button type="button" className={value === "all" ? "is-active" : ""} onClick={() => onChange("all")}>
        全部
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={value === option ? "is-active" : ""}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function EchoRings({ count }: { count: number }) {
  const ringCount = Math.min(Math.max(count, 1), 7)

  return (
    <div className="echo-rings" aria-hidden="true">
      {Array.from({ length: ringCount }).map((_, index) => (
        <span key={index} style={{ "--i": index } as CSSProperties} />
      ))}
    </div>
  )
}

function buildRiverDays(groups: MirrorScrollDayGroup[]): RiverDay[] {
  const days = groups.map((group, index) => {
    const primaryNode = getPrimaryNode(group.nodes)
    return {
      id: group.dateKey,
      dateLabel: group.dateLabel,
      dayIndex: index + 1,
      nodes: group.nodes,
      primaryNode,
      tradeMoment: primaryNode.tradeMoment || primaryNode.title || "这一日的交易现场",
      os: primaryNode.os || primaryNode.thoughtText || "这一念仍待照见",
      reflection: primaryNode.reflection || primaryNode.proofText || primaryNode.summary || "这一日，你开始看见自己。",
      thief: primaryNode.thief || getAffectedThief(primaryNode),
      mirrorId: primaryNode.mirrorId || getAffectedMirror(primaryNode),
      mirrorName: primaryNode.mirrorName || getAffectedMirror(primaryNode) || DEFAULT_MIRROR,
      sceneName: primaryNode.sceneName || getAffectedScene(primaryNode),
      evidence: primaryNode.evidence || primaryNode.proofText || "我看见这一念如何牵动自己。",
      practice: primaryNode.practice || primaryNode.actionText || "今日只修一件事。",
      sealedAt: primaryNode.sealedAt || primaryNode.createdAt,
      completed: primaryNode.completed ?? (primaryNode.type === "one_thought_record" || primaryNode.type === "heart_proof"),
      repeatCount: 1,
    } satisfies RiverDay
  })

  const repeatMap = new Map<string, number>()
  days.forEach((day) => {
    repeatMap.set(day.os, (repeatMap.get(day.os) || 0) + 1)
  })

  return days.map((day) => ({
    ...day,
    repeatCount: repeatMap.get(day.os) || 1,
  }))
}

function getPrimaryNode(nodes: MirrorScrollNode[]): MirrorScrollNode {
  return (
    nodes.find((node) => node.type === "one_thought_record") ||
    nodes.find((node) => node.type === "heart_proof") ||
    nodes.find((node) => node.type === "trade_review") ||
    nodes[0]
  ) as MirrorScrollNode
}

function getAffectedThief(node: MirrorScrollNode) {
  return node.affectedDimensions.find((dimension) => /[贪急惧疑执从痴怯懒]/.test(dimension)) || DEFAULT_THIEF
}

function getAffectedMirror(node: MirrorScrollNode) {
  return node.affectedDimensions.find((dimension) => dimension.includes("镜") || dimension.includes("_")) || DEFAULT_MIRROR
}

function getAffectedScene(node: MirrorScrollNode) {
  return (
    node.sceneName ||
    node.affectedDimensions.find((dimension) => dimension.startsWith("scene_")) ||
    node.tags.find((tag) => tag.includes("场景")) ||
    "这一日"
  )
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter((value) => value && value !== DEFAULT_THIEF && value !== DEFAULT_MIRROR))).slice(0, 8)
}

function getTopThought(days: RiverDay[]) {
  const countMap = new Map<string, number>()
  days.forEach((day) => countMap.set(day.os, (countMap.get(day.os) || 0) + 1))
  return Array.from(countMap.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || ""
}

function formatDayNumber(index: number) {
  return `Day${String(index).padStart(3, "0")}`
}

function formatSealTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "时间待确认"
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}`
}

function getTimeToneClass() {
  const hour = new Date().getHours()
  if (hour >= 7 && hour < 11) return "is-morning"
  if (hour >= 11 && hour < 15) return "is-afternoon"
  if (hour >= 15 && hour < 19) return "is-dusk"
  return "is-night"
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}
