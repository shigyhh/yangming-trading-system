"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { HoldToReleaseThought } from "@/components/mirror-scroll/HoldToReleaseThought"
import { AssessmentShell, ComplianceNote, PrimaryLink, SecondaryLink } from "@/features/assessment/components"
import {
  loadOneThoughtRecords,
  readStableTodayOneThought,
  type TodayOneThoughtSnapshot,
} from "@/data/insight-engine/today-one-thought"

import {
  appendToMirrorScroll,
  buildStillWaterScrollData,
  createTodayInsightRecord,
  filterStillWaterRecords,
  getStillWaterMirrorOptions,
  saveToArchive,
  type StillWaterScrollData,
} from "./stillWaterScrollEngine"
import { playStillWaterChime } from "./stillWaterAudio"
import { HeartLakeStage, type FloatingThought } from "./HeartLakeStage"
import {
  HistoryStation,
  InkBleedDefs,
  InkText,
  MirrorPool,
  RitualStation,
  ThiefShadow,
} from "./StillWaterRitualParts"

type ThiefFilter = "all" | "贪" | "急" | "惧" | "疑" | "执" | "从"

const thiefFilters: Array<{ value: ThiefFilter; label: string }> = [
  { value: "all", label: "全部心贼" },
  { value: "贪", label: "贪" },
  { value: "急", label: "急" },
  { value: "惧", label: "惧" },
  { value: "疑", label: "疑" },
  { value: "执", label: "执" },
  { value: "从", label: "从" },
]

const REFLECTION_FIRST_BEAT_MS = 620
const REFLECTION_SECOND_BEAT_MS = 1680

function splitReflectionBeats(reflection: string) {
  const normalized = reflection
    .split(/[。\n]/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (normalized.length >= 2) return [normalized[0], normalized.slice(1).join("。")]
  if (normalized.length === 1) {
    const text = normalized[0]
    const pivot = Math.max(8, Math.floor(text.length * 0.48))
    return [text.slice(0, pivot), text.slice(pivot)]
  }

  return ["这一念已经浮上来。", "它瞒不过你的心。"]
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function useStillWaterData() {
  const [todayThought, setTodayThought] = useState<TodayOneThoughtSnapshot | null>(null)
  const [data, setData] = useState<StillWaterScrollData | null>(null)

  const refresh = useCallback(() => {
    const storage = getBrowserStorage()
    const today = readStableTodayOneThought(storage)
    const records = loadOneThoughtRecords(storage)

    setTodayThought(today)
    setData(buildStillWaterScrollData(records, today))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0)

    return () => window.clearTimeout(timer)
  }, [refresh])

  return { data, refresh, todayThought }
}

export function MirrorRiverScroll() {
  const { data, refresh, todayThought } = useStillWaterData()
  const [activeStation, setActiveStation] = useState(0)
  const [releasedToday, setReleasedToday] = useState(false)
  const [isOpeningScroll, setIsOpeningScroll] = useState(false)
  const [hasOpenedScroll, setHasOpenedScroll] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reflectionBeat, setReflectionBeat] = useState(0)
  const [thiefFilter, setThiefFilter] = useState<ThiefFilter>("all")
  const [mirrorFilter, setMirrorFilter] = useState("all")
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const stationRefs = useRef<Array<HTMLElement | null>>([])
  const fogRefs = useRef<Array<HTMLSpanElement | null>>([])
  const rafRef = useRef<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const chimedStationsRef = useRef(new Set<number>())

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    window.scrollTo({ left: 0, top: 0, behavior: "auto" })
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  const mirrorOptions = useMemo(() => getStillWaterMirrorOptions(data?.records ?? []), [data?.records])
  const reflectionBeats = useMemo(() => splitReflectionBeats(data?.today.reflection ?? ""), [data?.today.reflection])
  const filteredRecords = useMemo(
    () => filterStillWaterRecords(data?.records ?? [], { thief: thiefFilter, mirror: mirrorFilter }),
    [data?.records, mirrorFilter, thiefFilter],
  )
  const lakeEchoThoughts: FloatingThought[] = data?.records.length
    ? data.records.filter((record) => record.os !== data.today.os).slice(0, 8).map((record, index) => ({
      id: `mine-echo-${record.recordId}`,
      text: record.os,
      source: "mine" as const,
      sceneId: record.sceneName,
      thief: record.thief,
      mirrorId: record.mirrorId,
      x: 18 + ((index * 19) % 64),
      y: 26 + ((index * 17) % 48),
      depth: 0.54 + (index % 4) * 0.1,
      opacity: 0.18,
      driftSpeed: 12 + index,
    }))
    : []
  const isTodayReleased = releasedToday || Boolean(data?.today.completed)

  const measureStations = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const viewport = scroller.clientHeight || 1
    const center = scroller.scrollTop + viewport / 2
    let nextActive = 0
    let smallestDistance = Number.POSITIVE_INFINITY

    fogRefs.current.forEach((fog, index) => {
      if (!fog) return
      fog.style.transform = `translate3d(0, ${scroller.scrollTop * (0.07 + index * 0.055)}px, 0)`
    })

    stationRefs.current.forEach((station, index) => {
      if (!station) return
      const stationCenter = station.offsetTop + station.offsetHeight / 2
      const relative = (stationCenter - center) / viewport
      const distance = Math.abs(relative)
      const opacity = Math.max(0.08, Math.min(1, 1 - distance * 1.35))
      const scale = Math.max(0.82, 1 - distance * 0.06)
      const blur = Math.max(0, Math.min(10, distance * 10))
      const y = (stationCenter - center) * 0.1
      const saturation = Math.max(0.55, Math.min(1, 1 - distance * 0.45))
      const brightness = Math.max(0.65, Math.min(1, 1 - distance * 0.25))

      station.style.setProperty("--sw-opacity", String(opacity))
      station.style.setProperty("--sw-scale", String(scale))
      station.style.setProperty("--sw-blur", `${blur}px`)
      station.style.setProperty("--sw-y", `${y}px`)
      station.style.setProperty("--sw-depth", String(Math.min(1, distance)))
      station.style.setProperty("--sw-saturation", String(saturation))
      station.style.setProperty("--sw-brightness", String(brightness))

      if (distance < smallestDistance) {
        smallestDistance = distance
        nextActive = index
      }
    })

    setActiveStation(nextActive)
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
  }, [filteredRecords.length, measureStations])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      setActiveStation(0)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [mirrorFilter, thiefFilter])

  useEffect(() => {
    if (activeStation !== 2) {
      const reset = window.setTimeout(() => setReflectionBeat(0), 0)
      return () => window.clearTimeout(reset)
    }

    const first = window.setTimeout(() => setReflectionBeat(1), REFLECTION_FIRST_BEAT_MS)
    const second = window.setTimeout(() => {
      setReflectionBeat(2)
      if (!chimedStationsRef.current.has(activeStation)) {
        chimedStationsRef.current.add(activeStation)
        playStillWaterChime(audioRef)
      }
    }, REFLECTION_SECOND_BEAT_MS)

    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [activeStation])

  const scrollToStation = useCallback((index: number) => {
    const scroller = scrollerRef.current
    const station = stationRefs.current[index]
    if (!scroller || !station) return
    scroller.scrollTo({ top: station.offsetTop, behavior: "smooth" })
  }, [])

  const openHeartScroll = useCallback(() => {
    if (isOpeningScroll) return
    setIsOpeningScroll(true)
    window.setTimeout(() => scrollToStation(1), 780)
    window.setTimeout(() => {
      setHasOpenedScroll(true)
      setIsOpeningScroll(false)
    }, 1500)
  }, [isOpeningScroll, scrollToStation])

  const sealToday = useCallback(() => {
    if (!todayThought) return
    const sealedAt = new Date().toISOString()
    const storage = getBrowserStorage()
    const record = createTodayInsightRecord({
      id: `one_thought_still_water_${todayThought.dateKey}_${todayThought.thoughtId}`,
      date: todayThought.dateKey,
      dayIndex: (data?.records.length ?? 0) + 1,
      tradeMoment: todayThought.tradeMoment,
      os: todayThought.os,
      reflection: todayThought.reflection,
      thief: todayThought.thief,
      mirrorId: todayThought.mirrorId,
      mirrorName: data?.today.mirrorName,
      evidence: todayThought.evidence,
      practice: todayThought.practice,
      sceneId: todayThought.sceneId,
      sceneName: todayThought.sceneName,
      completed: true,
      sealedAt,
    })

    saveToArchive(record, storage)
    appendToMirrorScroll(record, storage)
    setReleasedToday(true)
    refresh()
    window.setTimeout(() => scrollToStation(6), 880)
  }, [data, refresh, scrollToStation, todayThought])

  if (!data) {
    return (
      <AssessmentShell className="still-water-shell px-0 py-0 md:px-0 md:py-0" contentWidth="wide">
        <div className="still-water-loading">水面正在安静下来</div>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="still-water-shell px-0 py-0 md:px-0 md:py-0" contentWidth="wide">
      <main className={`still-water-page ${isTodayReleased ? "is-released" : ""} ${isOpeningScroll ? "is-opening-scroll" : ""} ${hasOpenedScroll ? "has-opened-scroll" : ""}`}>
        <section className="still-water-river" aria-label="一念落入止水的照见仪式">
          <div className="still-scroller" ref={scrollerRef}>
            <HeartLakeStage
              className="heart-lake-scroll-backdrop"
              floatingThoughts={hasOpenedScroll ? lakeEchoThoughts : []}
              mode="mirror-scroll"
            >
              <span className="continuous-scroll-mark" aria-hidden="true" />
            </HeartLakeStage>
            <div className="still-mist" aria-hidden="true">
              {[0, 1, 2].map((layer) => (
                <span key={layer} ref={(element) => { fogRefs.current[layer] = element }} />
              ))}
            </div>
            <div className="still-lake-surface" aria-hidden="true" />
            <InkBleedDefs />
            {data.summary.hasSevenSealLine ? <div className="seven-seal-line" aria-hidden="true" /> : null}

            <RitualStation index={0} activeIndex={activeStation} setRef={(element) => { stationRefs.current[0] = element }} className="is-intro">
              <p>心镜长卷 · 入卷静水</p>
              <h2>
                心不静，
                <br />
                交易必乱。
              </h2>
              <strong className="intro-copy">
                不是记录你做过什么。
                <br />
                而是记录你一次次看见了谁在下单。
              </strong>
              <button className="open-scroll-button" type="button" onClick={openHeartScroll} disabled={isOpeningScroll} aria-label="照见今日这一念">
                <span>照见今日这一念</span>
              </button>
              <ScrollForeshadow eyebrow="雾中将现" text={`心贼 · ${data.today.thief}`} />
            </RitualStation>

            <RitualStation index={1} activeIndex={activeStation} setRef={(element) => { stationRefs.current[1] = element }} className="is-drop">
              <p>一念落水</p>
              <small>交易现场：{data.today.tradeMoment}</small>
              <h2><InkText text={`「${data.today.os}」`} /></h2>
              <div className="water-crack" aria-hidden="true"><i /><i /><i /></div>
              <ScrollForeshadow eyebrow="水底字影" text="照回将起" />
            </RitualStation>

            <RitualStation index={2} activeIndex={activeStation} setRef={(element) => { stationRefs.current[2] = element }} className="is-strike">
              <p>一念被看穿</p>
              <div className={`reflection-strike beat-${reflectionBeat}`} aria-live="polite">
                <span>{reflectionBeats[0]}</span>
                <strong>{reflectionBeats[1]}</strong>
              </div>
              <small>先照回，再沉默。第二拍落下时，只留下这一念的真相。</small>
              <ScrollForeshadow eyebrow="水下暗影" text={`心贼 · ${data.today.thief}`} />
            </RitualStation>

            <RitualStation index={3} activeIndex={activeStation} setRef={(element) => { stationRefs.current[3] = element }} className="is-thief">
              <p>心贼显影</p>
              <h2>这一念里，最重的是：<i>{data.today.thief}</i></h2>
              <ThiefShadow activeThief={data.today.thief} />
              <ScrollForeshadow eyebrow="远处镜光" text={data.today.mirrorName} />
            </RitualStation>

            <RitualStation index={4} activeIndex={activeStation} setRef={(element) => { stationRefs.current[4] = element }} className="is-mirror">
              <p>九镜显影</p>
              <h2>你最容易进入：<i>{data.today.mirrorName}</i></h2>
              <span>它不是你。只是你最常进入的房间。</span>
              <MirrorPool activeMirror={data.today.mirrorName} />
              <ScrollForeshadow eyebrow="前方水纹收束" text="放下一念" />
            </RitualStation>

            <RitualStation index={5} activeIndex={activeStation} setRef={(element) => { stationRefs.current[5] = element }} className="is-gesture">
              <p>知行合一手势</p>
              <HoldToReleaseThought os={data.today.os} disabled={isTodayReleased} onComplete={sealToday} />
              <h2>{isTodayReleased ? "已照见" : "长按这一念，让它沉入水底。"}</h2>
              <small>知而不行，只是未知。今日这一念，已被你亲手放下。</small>
              <ScrollForeshadow eyebrow="朱砂微光" text={isTodayReleased ? "已照见" : "落印将至"} />
            </RitualStation>

            <RitualStation index={6} activeIndex={activeStation} setRef={(element) => { stationRefs.current[6] = element }} className="is-seal">
              <p>落印</p>
              {isTodayReleased ? <div className="zhu-seal">已照见</div> : <div className="seal-awaiting">朱印尚未落下</div>}
              <h2>{isTodayReleased ? "致良知，不是消灭念头。" : "先放下一念，朱印才会落下。"}</h2>
              <span>{isTodayReleased ? "是念起时，知道是谁在下单。" : "知行合一之后，长卷才留下这一日心证。"}</span>
              <ScrollForeshadow eyebrow="水面将静" text="今日照见总结" />
            </RitualStation>

            <RitualStation index={7} activeIndex={activeStation} setRef={(element) => { stationRefs.current[7] = element }} className="is-summary">
              <p>今日照见总结</p>
              <h2>今日照见已落印</h2>
              <div className="today-summary">
                <span><b>本次照见</b>{data.today.mirrorName}</span>
                <span><b>起念场景</b>{data.today.tradeMoment}</span>
                <span><b>今日一念</b>「{data.today.os}」</span>
                <span><b>今日心证</b>{data.today.evidence}</span>
                <span><b>今日修行</b>{data.today.practice}</span>
              </div>
              <div className="summary-actions">
                <button type="button" onClick={() => scrollToStation(8)}>进入心镜长卷</button>
                <button type="button" onClick={() => scrollToStation(1)}>返回今日一念</button>
                <SecondaryLink href="/mirror-archive">查看心镜档案</SecondaryLink>
              </div>
              <ScrollForeshadow eyebrow="长卷水面" text="沉入心镜长卷" />
            </RitualStation>

            <RitualStation index={8} activeIndex={activeStation} setRef={(element) => { stationRefs.current[8] = element }} className="is-backlight">
              <p>回光返照</p>
              <h2>原来，我一直照的，是自己的心。</h2>
              <div className="backlight-proof">
                {(data.records.length ? data.records : [data.today]).slice(0, 3).map((record) => (
                  <span key={record.recordId}>{record.evidence}</span>
                ))}
              </div>
              <strong>明日再照。</strong>
            </RitualStation>

            {filteredRecords.map((record, recordIndex) => (
              <HistoryStation
                key={record.recordId}
                active={activeStation === recordIndex + 9}
                expanded={expandedId === record.recordId}
                index={recordIndex + 9}
                record={record}
                setRef={(element) => { stationRefs.current[recordIndex + 9] = element }}
                onToggle={() => setExpandedId((current) => (current === record.recordId ? null : record.recordId))}
              />
            ))}

            {!filteredRecords.length ? (
              <RitualStation index={9} activeIndex={activeStation} setRef={(element) => { stationRefs.current[9] = element }} className="is-empty">
                <p>水面无痕</p>
                <h2>这道筛选下，长卷暂时没有显影。</h2>
                <button
                  type="button"
                  onClick={() => {
                    setThiefFilter("all")
                    setMirrorFilter("all")
                  }}
                >
                  看全部心证印记
                </button>
              </RitualStation>
            ) : null}

            <section className="still-water-foot">
              <div>
                <p>长卷归处</p>
                {data.summary.count ? (
                  <span>你已经照见 {data.summary.count} 念。其中，最常带走你的是：「{data.summary.topThought || "这一念"}」。{data.summary.hasLighteningThought ? "这一念，正在变轻。" : "你不是没有变化。是有些念头，已经不再那么重。"}</span>
                ) : (
                  <span>长卷尚未展开。今日照见第一念，长卷便有了第一笔。</span>
                )}
              </div>
              <div className="still-water-links">
                <PrimaryLink href="/assessment">重新入照心</PrimaryLink>
                <SecondaryLink href="/practice-change?preview=1">查看复测变化</SecondaryLink>
                <SecondaryLink href="/mirror-archive">查看心镜档案馆</SecondaryLink>
              </div>
            </section>

            <ComplianceNote>
              本系统用于交易心理觉察与行为训练，不构成投资建议。
            </ComplianceNote>
          </div>
        </section>

        <section className="still-water-actions" aria-label="长卷筛选与定位">
          <button type="button" onClick={() => scrollToStation(5)}>回到今日</button>
          <FilterGroup label="只看心贼" options={thiefFilters} value={thiefFilter} onChange={setThiefFilter} />
          <div className="still-filter-group">
            <span>只看镜</span>
            <button className={mirrorFilter === "all" ? "is-active" : ""} type="button" onClick={() => setMirrorFilter("all")}>全部</button>
            {mirrorOptions.map((mirror) => (
              <button
                key={mirror.id}
                className={mirrorFilter === mirror.id ? "is-active" : ""}
                type="button"
                onClick={() => setMirrorFilter(mirror.id)}
              >
                {mirror.name.replace("之镜", "")}
              </button>
            ))}
          </div>
        </section>
      </main>
      <StillWaterStyles />
    </AssessmentShell>
  )
}

export const HeartMirrorScroll = MirrorRiverScroll
export const StillWaterZhixingScroll = MirrorRiverScroll

function FilterGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: ThiefFilter) => void
  options: Array<{ value: ThiefFilter; label: string }>
  value: ThiefFilter
}) {
  return (
    <div className="still-filter-group">
      <span>{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "is-active" : ""}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ScrollForeshadow({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <div className="scroll-foreshadow" aria-hidden="true">
      <b>{eyebrow}</b>
      <span>{text}</span>
    </div>
  )
}

function StillWaterStyles() {
  return (
    <style jsx global>{`
      .still-water-page {
        position: relative;
        height: 100svh;
        min-height: 100svh;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 38%, rgba(95, 132, 117, 0.18), transparent 42%),
          radial-gradient(circle at 50% 108%, rgba(216, 183, 111, 0.12), transparent 42%),
          linear-gradient(180deg, #081014 0%, #08100f 46%, #040605 100%);
        color: rgba(244, 235, 221, 0.92);
      }

      .still-water-shell {
        padding: 0 !important;
      }

      .still-water-shell > div:last-child {
        min-height: 100svh !important;
        justify-content: flex-start !important;
      }

      .still-water-page::before,
      .still-water-page::after {
        content: "";
        position: fixed;
        inset: -16vh -10vw;
        z-index: 0;
        pointer-events: none;
      }

      .still-water-page::before {
        opacity: 0.58;
        filter: blur(0.2px);
        background:
          linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 22%, rgba(0, 0, 0, 0.78)),
          radial-gradient(circle, rgba(216, 183, 111, 0.42) 0 1px, transparent 1.4px) 12% 56% / 128px 156px,
          radial-gradient(circle, rgba(216, 183, 111, 0.28) 0 1px, transparent 1.4px) 62% 68% / 168px 132px,
          radial-gradient(ellipse at 25% 26%, rgba(216, 183, 111, 0.045), transparent 28%),
          radial-gradient(ellipse at 72% 30%, rgba(95, 132, 117, 0.07), transparent 32%);
        mask-image: linear-gradient(180deg, transparent 18%, black 38%, black 84%, transparent 100%);
        animation: stillGoldFieldDrift 22s ease-in-out infinite alternate;
      }

      .still-water-page::after {
        opacity: 0.82;
        background:
          linear-gradient(180deg, rgba(0, 0, 0, 0.62), transparent 20%, rgba(0, 0, 0, 0.72)),
          linear-gradient(180deg, transparent 40%, rgba(95, 132, 117, 0.08) 48%, transparent 64%),
          repeating-linear-gradient(
            0deg,
            rgba(244, 235, 221, 0.026) 0,
            rgba(244, 235, 221, 0.026) 1px,
            transparent 1px,
            transparent 24px
          ),
          radial-gradient(ellipse at 50% 58%, transparent 42%, rgba(0, 0, 0, 0.66));
        mask-image: linear-gradient(90deg, transparent, black 16%, black 84%, transparent);
      }

      .still-water-loading {
        min-height: 80svh;
        display: grid;
        place-items: center;
        font-family: var(--font-story);
        font-size: clamp(2.2rem, 8vw, 6rem);
        font-weight: 300;
        letter-spacing: 0.16em;
        color: rgba(244, 235, 221, 0.62);
      }

      .still-water-actions,
      .still-water-river,
      .still-water-foot,
      .compliance-note {
        position: relative;
        z-index: 2;
      }

      .still-station p {
        margin: 0;
        font-family: var(--font-function);
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        color: rgba(216, 183, 111, 0.72);
      }

      .still-water-summary {
        margin-top: clamp(1.4rem, 4vw, 2.2rem);
        display: grid;
        gap: 0.58rem;
        font-family: var(--font-function);
        color: rgba(220, 212, 195, 0.58);
      }

      .still-water-summary em,
      .still-water-summary b {
        font-style: normal;
        font-weight: 500;
      }

      .still-water-summary em {
        font-family: var(--font-story);
        font-size: clamp(1.15rem, 2.8vw, 1.8rem);
        color: rgba(244, 235, 221, 0.8);
      }

      .still-water-summary b {
        color: rgba(216, 183, 111, 0.78);
      }

      .still-water-actions {
        position: fixed;
        top: max(1rem, env(safe-area-inset-top));
        right: clamp(0.8rem, 2.2vw, 1.4rem);
        width: min(34rem, calc(100vw - 1.6rem));
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.72rem;
        font-family: var(--font-function);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-0.3rem) scale(0.96);
        transform-origin: top right;
        transition: opacity 320ms ease, transform 320ms ease;
      }

      .has-opened-scroll .still-water-actions {
        opacity: 0.14;
        pointer-events: auto;
      }

      .has-opened-scroll .still-water-actions:hover,
      .has-opened-scroll .still-water-actions:focus-within {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .still-water-actions button,
      .still-filter-group button,
      .is-empty button {
        appearance: none;
        border: 1px solid rgba(217, 189, 122, 0.16);
        border-radius: 999px;
        background: rgba(3, 8, 6, 0.46);
        color: rgba(220, 212, 195, 0.62);
        cursor: pointer;
        letter-spacing: 0.1em;
        white-space: nowrap;
        transition: border-color 240ms ease, background 240ms ease, color 240ms ease, transform 240ms ease;
      }

      .still-water-actions > button {
        min-height: 2.55rem;
        padding: 0.62rem 1rem;
      }

      .still-water-actions button:hover,
      .still-filter-group button.is-active,
      .is-empty button:hover {
        border-color: rgba(216, 183, 111, 0.56);
        background: rgba(216, 183, 111, 0.1);
        color: rgba(244, 235, 221, 0.9);
        transform: translateY(-1px);
      }

      .still-filter-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.38rem;
        align-items: center;
        justify-content: center;
      }

      .still-filter-group span {
        margin: 0 0.18rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: rgba(216, 183, 111, 0.72);
      }

      .still-filter-group button {
        min-height: 2.25rem;
        padding: 0.48rem 0.72rem;
        font-size: 0.72rem;
      }

      .still-water-river {
        width: 100vw;
        margin: 0;
      }

      .still-scroller {
        position: relative;
        height: 100svh;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        scroll-padding-block: 10svh;
        scroll-snap-type: y proximity;
        scrollbar-width: none;
        border-block: 0;
        background:
          linear-gradient(180deg, rgba(0, 0, 0, 0.34), transparent 20%, rgba(0, 0, 0, 0.64)),
          radial-gradient(ellipse at 50% 48%, rgba(28, 58, 50, 0.22), transparent 36rem),
          radial-gradient(ellipse at 50% 92%, rgba(216, 183, 111, 0.07), transparent 30rem),
          linear-gradient(180deg, rgba(8, 16, 20, 0.38), rgba(4, 6, 5, 0.76));
        box-shadow: inset 0 34px 120px rgba(0, 0, 0, 0.72), inset 0 -36px 130px rgba(0, 0, 0, 0.82);
      }

      .heart-lake-root.heart-lake-scroll-backdrop {
        position: sticky;
        top: 0;
        z-index: 0;
        min-height: 100svh;
        height: 100svh;
        margin-bottom: -100svh;
      }

      .heart-lake-root.heart-lake-scroll-backdrop::before,
      .heart-lake-root.heart-lake-scroll-backdrop::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 9;
        width: 50.5%;
        pointer-events: none;
        background:
          radial-gradient(ellipse at 50% 50%, rgba(95, 132, 117, 0.1), transparent 48%),
          linear-gradient(180deg, rgba(2, 4, 3, 0.92), rgba(3, 8, 6, 0.98));
        opacity: 0;
        transform: translateX(0);
      }

      .heart-lake-root.heart-lake-scroll-backdrop::before {
        left: 0;
        box-shadow: inset -1px 0 0 rgba(216, 183, 111, 0.14);
      }

      .heart-lake-root.heart-lake-scroll-backdrop::after {
        right: 0;
        box-shadow: inset 1px 0 0 rgba(216, 183, 111, 0.14);
      }

      .is-opening-scroll .heart-lake-root.heart-lake-scroll-backdrop::before {
        animation: scrollLeafOpenLeft 1500ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .is-opening-scroll .heart-lake-root.heart-lake-scroll-backdrop::after {
        animation: scrollLeafOpenRight 1500ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .heart-lake-scroll-backdrop .heart-lake-content {
        display: none;
      }

      .heart-lake-scroll-backdrop .heart-lake-water {
        opacity: 0.34;
        transform: translateY(7svh) scale(1.05);
        filter: saturate(0.48) hue-rotate(22deg) brightness(0.54);
      }

      .heart-lake-scroll-backdrop .heart-lake-floating-thoughts {
        opacity: 0.42;
      }

      .still-scroller::-webkit-scrollbar {
        display: none;
      }

      .still-lake-surface {
        position: sticky;
        top: 0;
        height: 0;
        z-index: 0;
        pointer-events: none;
      }

      .ink-bleed-defs {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
      }

      .still-lake-surface::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 52svh;
        width: min(94vw, 1220px);
        height: min(58svh, 560px);
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background:
          radial-gradient(ellipse at 50% 45%, rgba(244, 235, 221, 0.038), rgba(95, 132, 117, 0.09) 34%, rgba(2, 5, 4, 0.04) 66%, transparent 73%);
        filter: blur(10px);
        opacity: 0.22;
        box-shadow:
          inset 0 0 90px rgba(244, 235, 221, 0.035),
          0 0 90px rgba(95, 132, 117, 0.11);
        animation: waterStillBreath 9s ease-in-out infinite;
      }

      .still-lake-surface::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 52svh;
        width: min(90vw, 1120px);
        height: 16svh;
        transform: translate(-50%, -50%);
        background:
          linear-gradient(180deg, transparent, rgba(244, 235, 221, 0.035), transparent),
          radial-gradient(ellipse at 50% 52%, rgba(216, 183, 111, 0.05), transparent 58%);
        filter: blur(8px);
        opacity: 0.14;
      }

      .still-mist {
        position: sticky;
        top: 0;
        height: 0;
        z-index: 4;
        pointer-events: none;
      }

      .still-mist span {
        position: absolute;
        inset: -18svh -12vw;
        display: block;
        opacity: 0.24;
        filter: blur(30px);
        background:
          radial-gradient(ellipse at 24% 26%, rgba(244, 235, 221, 0.025), transparent 24rem),
          radial-gradient(ellipse at 74% 70%, rgba(95, 132, 117, 0.055), transparent 30rem);
        animation: stillMistDrift 18s ease-in-out infinite alternate;
      }

      .still-mist span:nth-child(2) {
        opacity: 0.2;
        animation-duration: 26s;
        background:
          radial-gradient(ellipse at 48% 18%, rgba(216, 183, 111, 0.055), transparent 20rem),
          radial-gradient(ellipse at 50% 88%, rgba(2, 5, 4, 0.9), transparent 28rem);
      }

      .still-mist span:nth-child(3) {
        opacity: 0.68;
        animation-duration: 32s;
        background: linear-gradient(180deg, rgba(2, 4, 3, 0.9), transparent 24%, transparent 72%, rgba(2, 4, 3, 0.96));
      }

      .seven-seal-line {
        position: sticky;
        top: 16svh;
        height: 0;
        z-index: 1;
        pointer-events: none;
      }

      .seven-seal-line::before {
        content: "";
        position: absolute;
        left: 50%;
        width: min(1px, 1px);
        height: 68svh;
        background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.54), transparent);
        box-shadow: 0 0 18px rgba(216, 183, 111, 0.16);
      }

      .still-station {
        position: relative;
        z-index: 2;
        min-height: 76svh;
        display: grid;
        place-items: center;
        scroll-snap-align: center;
        scroll-snap-stop: always;
        padding: clamp(2.5rem, 8vw, 5rem) 1.1rem;
      }

      .still-station + .still-station {
        margin-top: -18svh;
      }

      .still-station::before,
      .still-station::after {
        content: none;
        position: absolute;
        left: 50%;
        z-index: -1;
        width: min(1px, 1px);
        height: 23svh;
        transform: translateX(-50%);
        background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.12), transparent);
        opacity: calc(0.26 - var(--sw-depth, 0) * 0.18);
      }

      .still-station::before {
        top: 0;
      }

      .still-station::after {
        bottom: 0;
      }

      .still-station-inner {
        position: relative;
        width: min(920px, calc(100vw - 32px));
        min-height: min(52svh, 520px);
        display: grid;
        place-items: center;
        align-content: center;
        gap: clamp(1rem, 3vw, 1.8rem);
        text-align: center;
        opacity: var(--sw-opacity, 1);
        transform: translate3d(0, var(--sw-y, 0), 0) scale(var(--sw-scale, 1));
        filter: blur(var(--sw-blur, 0)) saturate(var(--sw-saturation, 1)) brightness(var(--sw-brightness, 1));
        transition: opacity 420ms ease, filter 420ms ease, transform 420ms ease;
        will-change: transform, opacity, filter;
      }

      .still-station h2 {
        margin: 0;
        max-width: 820px;
        font-family: var(--font-story);
        font-size: clamp(2rem, 8.5vw, 5.2rem);
        font-weight: 300;
        line-height: 1.18;
        letter-spacing: 0.08em;
        color: rgba(244, 235, 221, 0.9);
        text-shadow: 0 0 34px rgba(216, 183, 111, 0.075);
      }

      .still-station.is-intro .still-station-inner {
        width: min(58rem, calc(100vw - 2rem));
        min-height: 100svh;
        align-content: start;
        gap: 0.88rem;
        padding-top: clamp(5.2rem, 9svh, 7.1rem);
        transform: translate3d(0, var(--sw-y, 0), 0) scale(var(--sw-scale, 1));
      }

      .still-station.is-intro {
        min-height: 100svh;
        padding: 0 1.1rem;
        margin-top: 0;
      }

      .heart-lake-root {
        position: relative;
        isolation: isolate;
        width: 100vw;
        min-height: 100svh;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #030706;
      }

      .heart-lake-bg,
      .heart-lake-water,
      .heart-lake-ripples,
      .heart-lake-mist,
      .heart-lake-particles {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .heart-lake-bg {
        z-index: 0;
        background:
          radial-gradient(circle at 50% 24%, rgba(216, 183, 111, 0.045), transparent 22rem),
          radial-gradient(ellipse at 50% 62%, rgba(95, 132, 117, 0.16), transparent 46rem),
          linear-gradient(180deg, #020403 0%, #06100d 48%, #020302 100%);
      }

      .heart-lake-water {
        z-index: 1;
        opacity: 0.76;
        transform: translateY(8svh) scale(1.04);
        filter: saturate(0.7) hue-rotate(22deg) brightness(0.82);
      }

      .heart-lake-engine {
        mix-blend-mode: screen;
      }

      .heart-lake-ripples {
        z-index: 2;
        display: grid;
        place-items: center;
      }

      .heart-lake-ripples i {
        position: absolute;
        width: min(62vw, 520px);
        aspect-ratio: 2.3;
        border-radius: 50%;
        border: 1px solid rgba(244, 235, 221, 0.11);
        opacity: 0;
        transform: scale(0.4);
        animation: heartLakeIntroRipple 1500ms ease-out 520ms both;
      }

      .heart-lake-ripples i:nth-child(2) {
        width: min(74vw, 680px);
        animation-delay: 760ms;
        border-color: rgba(216, 183, 111, 0.09);
      }

      .heart-lake-mist {
        z-index: 3;
        overflow: hidden;
      }

      .heart-lake-mist i {
        position: absolute;
        inset: -18%;
        opacity: 0.34;
        filter: blur(34px);
        background:
          radial-gradient(ellipse at 24% 28%, rgba(244, 235, 221, 0.06), transparent 26rem),
          radial-gradient(ellipse at 76% 68%, rgba(95, 132, 117, 0.13), transparent 30rem);
        animation: heartLakeMistDrift 22s ease-in-out infinite alternate;
      }

      .heart-lake-mist i:nth-child(2) {
        opacity: 0.28;
        animation-duration: 28s;
        animation-direction: alternate-reverse;
        background:
          radial-gradient(ellipse at 46% 22%, rgba(216, 183, 111, 0.055), transparent 22rem),
          radial-gradient(ellipse at 50% 88%, rgba(2, 5, 4, 0.88), transparent 34rem);
      }

      .heart-lake-mist i:nth-child(3) {
        opacity: 0.52;
        background: linear-gradient(180deg, rgba(2, 4, 3, 0.82), transparent 24%, transparent 76%, rgba(2, 4, 3, 0.94));
      }

      .heart-lake-particles {
        z-index: 4;
      }

      .heart-lake-particles i {
        position: absolute;
        width: 2px;
        height: 2px;
        border-radius: 999px;
        background: rgba(216, 183, 111, 0.36);
        box-shadow: 0 0 16px rgba(216, 183, 111, 0.18);
        opacity: 0.38;
        animation: heartLakeParticleFloat 12s ease-in-out infinite;
      }

      .heart-lake-particles i:nth-child(1) { left: 18%; top: 32%; animation-delay: -2s; }
      .heart-lake-particles i:nth-child(2) { left: 74%; top: 38%; animation-delay: -5s; }
      .heart-lake-particles i:nth-child(3) { left: 44%; top: 24%; animation-delay: -7s; }
      .heart-lake-particles i:nth-child(4) { left: 62%; top: 72%; animation-delay: -3s; }
      .heart-lake-particles i:nth-child(5) { left: 30%; top: 68%; animation-delay: -9s; }

      .heart-lake-content {
        position: relative;
        z-index: 6;
        width: min(640px, calc(100vw - 40px));
        min-height: 78svh;
        display: grid;
        place-items: center;
        align-content: center;
        gap: clamp(0.72rem, 2vw, 1.18rem);
        text-align: center;
        transform: translateY(-1.5svh);
      }

      .continuous-scroll-mark {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 10;
        width: 1px;
        height: 0;
        transform: translate(-50%, -50%);
        background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.58), rgba(244, 235, 221, 0.22), transparent);
        box-shadow: 0 0 42px rgba(216, 183, 111, 0.2);
        opacity: 0;
        pointer-events: none;
      }

      .is-opening-scroll .continuous-scroll-mark {
        animation: scrollLightSeam 1500ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .still-station.is-intro h2 {
        font-size: clamp(3.1rem, 8vw, 7.2rem);
        line-height: 1.18;
        letter-spacing: 0.14em;
        text-indent: 0.14em;
        white-space: nowrap;
        opacity: 0.86;
        text-shadow:
          0 0 34px rgba(216, 183, 111, 0.08),
          0 24px 76px rgba(0, 0, 0, 0.78);
      }

      .floating-thought {
        position: relative;
        z-index: 8;
        display: grid;
        gap: 0.56rem;
        max-width: 38rem;
        margin-block: clamp(1.1rem, 3vw, 2rem);
        opacity: 0;
        transform: translateY(18px);
        animation: floatingThoughtIn 820ms cubic-bezier(0.16, 1, 0.3, 1) 520ms forwards;
      }

      .floating-thought small {
        font-family: var(--font-function);
        font-size: clamp(0.76rem, 1.8vw, 0.92rem);
        font-weight: 600;
        letter-spacing: 0.16em;
        color: rgba(216, 183, 111, 0.68);
      }

      .floating-thought span {
        font-family: var(--font-story);
        font-size: clamp(2rem, 6.4vw, 4.2rem);
        line-height: 1.36;
        letter-spacing: 0.08em;
        color: rgba(244, 235, 221, 0.9);
        filter: blur(0.15px);
        text-shadow:
          0 0 28px rgba(244, 235, 221, 0.12),
          0 20px 60px rgba(0, 0, 0, 0.36);
      }

      .intro-copy {
        display: block;
        max-width: 34rem;
        font-family: var(--font-story);
        font-size: clamp(0.92rem, 1.8vw, 1.18rem);
        font-weight: 300;
        line-height: 1.9;
        letter-spacing: 0.09em;
        color: rgba(220, 212, 195, 0.54);
      }

      .enter-water-cue {
        margin-top: clamp(1.2rem, 4vw, 2rem);
        font-family: var(--font-function) !important;
        font-size: 0.78rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.22em !important;
        color: rgba(216, 183, 111, 0.72) !important;
        animation: cueSink 3.8s ease-in-out infinite;
      }

      .open-scroll-button {
        appearance: none;
        position: relative;
        width: min(34rem, calc(100vw - 2rem));
        min-height: 3.4rem;
        margin-top: clamp(14rem, 32svh, 24rem);
        padding: 0.72rem 1rem;
        border: 1px solid rgba(216, 183, 111, 0.16);
        border-radius: 999px;
        background:
          linear-gradient(180deg, rgba(244, 235, 221, 0.035), rgba(244, 235, 221, 0.012)),
          rgba(4, 6, 5, 0.26);
        color: rgba(216, 183, 111, 0.74);
        cursor: pointer;
        font-family: var(--font-function);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        box-shadow:
          inset 0 1px 0 rgba(244, 235, 221, 0.06),
          0 20px 72px rgba(0, 0, 0, 0.32);
        text-shadow: 0 0 18px rgba(216, 183, 111, 0.16);
        transition: transform 260ms ease, border-color 260ms ease, color 260ms ease, background 260ms ease;
      }

      .open-scroll-button::before,
      .open-scroll-button::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        pointer-events: none;
      }

      .open-scroll-button::before {
        content: none;
      }

      .open-scroll-button::after {
        inset: 48% 9%;
        border-top: 1px solid rgba(244, 235, 221, 0.12);
        filter: blur(0.8px);
        opacity: 0.38;
      }

      .open-scroll-button span {
        position: relative;
        z-index: 1;
      }

      .open-scroll-button:hover {
        background:
          linear-gradient(180deg, rgba(216, 183, 111, 0.12), rgba(244, 235, 221, 0.025)),
          rgba(4, 6, 5, 0.36);
        border-color: rgba(216, 183, 111, 0.34);
        color: rgba(244, 235, 221, 0.9);
        transform: translateY(-1px);
      }

      .open-scroll-button:disabled {
        cursor: default;
        opacity: 0.56;
      }

      .scroll-foreshadow {
        position: absolute;
        left: 50%;
        bottom: clamp(1.1rem, 5vh, 3.4rem);
        display: grid;
        gap: 0.28rem;
        min-width: min(18rem, 76vw);
        transform: translateX(-50%) translateY(calc(30px + var(--sw-depth, 0) * 18px)) scale(calc(0.9 - var(--sw-depth, 0) * 0.04));
        text-align: center;
        opacity: calc(0.12 + (1 - var(--sw-depth, 0)) * 0.1);
        filter: blur(calc(4px + var(--sw-depth, 0) * 6px));
        pointer-events: none;
      }

      .scroll-foreshadow b,
      .scroll-foreshadow span {
        font-style: normal;
        font-weight: 400;
      }

      .scroll-foreshadow b {
        font-family: var(--font-function);
        font-size: 0.68rem;
        letter-spacing: 0.22em;
        color: rgba(216, 183, 111, 0.46);
      }

      .scroll-foreshadow span {
        font-family: var(--font-story);
        font-size: clamp(1.05rem, 3vw, 1.65rem);
        letter-spacing: 0.1em;
        color: rgba(244, 235, 221, 0.28);
        text-shadow: 0 0 24px rgba(216, 183, 111, 0.08);
      }

      .still-station h2 i {
        display: inline-block;
        color: rgba(216, 183, 111, 0.88);
        font-style: normal;
        text-shadow: 0 0 26px rgba(216, 183, 111, 0.13);
      }

      .still-station span,
      .still-station small {
        max-width: 48rem;
        font-family: var(--font-story);
        font-size: clamp(1rem, 2.8vw, 1.35rem);
        font-weight: 300;
        line-height: 1.9;
        letter-spacing: 0.06em;
        color: rgba(220, 212, 195, 0.62);
      }

      .is-drop .still-station-inner::before,
      .is-gesture .still-station-inner::before,
      .is-strike .still-station-inner::before,
      .is-backlight .still-station-inner::before {
        content: "";
        position: absolute;
        width: min(80vw, 760px);
        aspect-ratio: 2;
        border-radius: 50%;
        background:
          radial-gradient(ellipse at center, transparent 42%, rgba(244, 235, 221, 0.06) 43%, transparent 62%),
          radial-gradient(ellipse at center, rgba(95, 132, 117, 0.13), transparent 72%);
        filter: blur(0.3px);
        opacity: 0;
        animation: waterImpact 1500ms ease-out both;
      }

      .is-drop .still-station-inner::before {
        animation: none;
      }

      .is-drop.is-active .still-station-inner::before {
        animation: waterImpact 1500ms ease-out 900ms both;
      }

      .is-drop small,
      .is-drop h2,
      .is-drop .water-crack {
        opacity: 0;
      }

      .is-drop.is-active small {
        animation: dropTradeMoment 700ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
      }

      .is-drop.is-active h2 {
        animation: thoughtDropWater 900ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
      }

      .is-drop.is-active .water-crack {
        animation: crackLayerIn 1ms linear 900ms both;
      }

      .is-gesture .still-station-inner::before {
        animation-duration: 1200ms;
        opacity: 0.42;
      }

      .is-strike .still-station-inner::before {
        animation: waterImpact 1600ms ease-out both;
        opacity: 0.38;
      }

      .is-backlight .still-station-inner::before {
        animation: backlightWater 5.8s ease-in-out infinite alternate;
      }

      .thief-shadow,
      .mirror-pool {
        position: relative;
        width: min(620px, 92vw);
        aspect-ratio: 1.9;
      }

      .thief-shadow span,
      .mirror-pool span {
        position: absolute;
        left: 50%;
        top: 50%;
        display: grid;
        place-items: center;
        border-radius: 999px;
        color: rgba(220, 212, 195, 0.22);
        transform: translate(-50%, -50%);
      }

      .thief-shadow span {
        width: clamp(3.3rem, 14vw, 5.5rem);
        height: clamp(3.3rem, 14vw, 5.5rem);
        border: 1px solid rgba(244, 235, 221, 0.035);
        background: rgba(0, 0, 0, 0.12);
        font-family: var(--font-story);
        font-size: clamp(1.35rem, 5vw, 2.4rem);
        filter: blur(1.6px);
      }

      .thief-shadow span:nth-child(1) { transform: translate(-50%, -50%) translate(-160px, -22px); }
      .thief-shadow span:nth-child(2) { transform: translate(-50%, -50%) translate(-86px, 84px); }
      .thief-shadow span:nth-child(3) { transform: translate(-50%, -50%) translate(18px, -78px); }
      .thief-shadow span:nth-child(4) { transform: translate(-50%, -50%) translate(118px, 72px); }
      .thief-shadow span:nth-child(5) { transform: translate(-50%, -50%) translate(178px, -20px); }
      .thief-shadow span:nth-child(6) { transform: translate(-50%, -50%) translate(0, 28px) scale(0.82); }

      .thief-shadow span.is-active {
        color: rgba(244, 235, 221, 0.86);
        border-color: rgba(216, 183, 111, 0.28);
        background: radial-gradient(circle, rgba(120, 60, 45, 0.26), rgba(0, 0, 0, 0.12));
        filter: blur(0);
        box-shadow: 0 0 34px rgba(120, 60, 45, 0.22);
        animation: thiefShadowRise 1600ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .mirror-pool span {
        width: clamp(4.4rem, 16vw, 6.8rem);
        height: clamp(4.4rem, 16vw, 6.8rem);
        border: 1px solid rgba(216, 183, 111, 0.08);
        background: radial-gradient(circle, rgba(244, 235, 221, 0.025), rgba(95, 132, 117, 0.035));
        font-family: var(--font-function);
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        filter: blur(1.2px);
      }

      .mirror-pool span:nth-child(1) { transform: translate(-50%, -50%) translate(-210px, -20px) scale(0.82); }
      .mirror-pool span:nth-child(2) { transform: translate(-50%, -50%) translate(-142px, 94px) scale(0.76); }
      .mirror-pool span:nth-child(3) { transform: translate(-50%, -50%) translate(-74px, -96px) scale(0.7); }
      .mirror-pool span:nth-child(4) { transform: translate(-50%, -50%) translate(0, 20px) scale(0.65); }
      .mirror-pool span:nth-child(5) { transform: translate(-50%, -50%) translate(74px, -98px) scale(0.7); }
      .mirror-pool span:nth-child(6) { transform: translate(-50%, -50%) translate(142px, 94px) scale(0.76); }
      .mirror-pool span:nth-child(7) { transform: translate(-50%, -50%) translate(210px, -20px) scale(0.82); }
      .mirror-pool span:nth-child(8) { transform: translate(-50%, -50%) translate(-12px, -150px) scale(0.58); }
      .mirror-pool span:nth-child(9) { transform: translate(-50%, -50%) translate(0, 142px) scale(0.58); }

      .mirror-pool span.is-active {
        z-index: 2;
        color: rgba(244, 235, 221, 0.9);
        border-color: rgba(216, 183, 111, 0.34);
        background: radial-gradient(circle, rgba(216, 183, 111, 0.14), rgba(95, 132, 117, 0.08));
        filter: blur(0);
        box-shadow: inset 0 0 34px rgba(244, 235, 221, 0.04), 0 0 40px rgba(216, 183, 111, 0.12);
        animation: mirrorRise 1400ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .ink-text {
        display: inline-block;
        gap: 0.01em;
        white-space: normal;
      }

      .ink-text i {
        display: inline-block;
        color: rgba(244, 235, 221, 0.9);
        font-style: normal;
        text-shadow: 0 0 22px rgba(216, 183, 111, 0.07);
      }

      .water-crack {
        position: relative;
        width: min(620px, 82vw);
        height: 5.8rem;
        margin-top: -0.7rem;
        opacity: 0.62;
      }

      .water-crack::before {
        content: "";
        position: absolute;
        inset: 50% 0 auto;
        height: 1px;
        background: radial-gradient(ellipse at center, rgba(244, 235, 221, 0.11), transparent 62%);
        filter: blur(1.2px);
      }

      .water-crack i {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 42%;
        height: 1px;
        transform-origin: left center;
        background: linear-gradient(90deg, rgba(244, 235, 221, 0.2), transparent);
        filter: blur(0.6px);
        opacity: 0;
        animation: waterCrack 1500ms ease-out both;
      }

      .water-crack i:nth-child(1) { transform: rotate(-8deg); animation-delay: 180ms; }
      .water-crack i:nth-child(2) { transform: rotate(7deg); animation-delay: 320ms; }
      .water-crack i:nth-child(3) { transform: rotate(18deg); animation-delay: 460ms; }

      .is-drop .water-crack i {
        animation: none;
      }

      .is-drop.is-active .water-crack i:nth-child(1) { animation: waterCrack 1500ms ease-out 1080ms both; }
      .is-drop.is-active .water-crack i:nth-child(2) { animation: waterCrack 1500ms ease-out 1220ms both; }
      .is-drop.is-active .water-crack i:nth-child(3) { animation: waterCrack 1500ms ease-out 1360ms both; }

      .reflection-strike {
        position: relative;
        width: min(760px, 92vw);
        min-height: clamp(13rem, 34vw, 19rem);
        display: grid;
        place-items: center;
        align-content: center;
        gap: 1.3rem;
      }

      .reflection-strike::before {
        content: "";
        position: absolute;
        inset: -18%;
        border-radius: 50%;
        background:
          radial-gradient(ellipse at center, rgba(244, 235, 221, 0.12), rgba(95, 132, 117, 0.09) 38%, rgba(2, 5, 4, 0.02) 62%, transparent 74%);
        opacity: 0.56;
        filter: blur(1px);
      }

      .reflection-strike::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(82vw, 860px);
        height: min(36svh, 320px);
        transform: translate(-50%, -50%) scale(0.42);
        border-radius: 50%;
        border: 1px solid rgba(244, 235, 221, 0.14);
        opacity: 0;
      }

      .reflection-strike span,
      .reflection-strike strong {
        position: relative;
        display: block;
        max-width: 44rem;
        font-family: var(--font-story);
        font-weight: 300;
        line-height: 1.65;
        letter-spacing: 0.06em;
        opacity: 0;
        filter: blur(10px);
        transform: translateY(-0.8rem) scale(1.03);
        transition:
          opacity 760ms cubic-bezier(0.16, 1, 0.3, 1),
          filter 760ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 820ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .reflection-strike span {
        font-size: clamp(1.35rem, 4.6vw, 2.45rem);
        color: rgba(220, 212, 195, 0.72);
      }

      .reflection-strike strong {
        font-size: clamp(1.8rem, 6.2vw, 3.6rem);
        color: rgba(244, 235, 221, 0.92);
        text-shadow: 0 0 30px rgba(244, 235, 221, 0.08);
      }

      .reflection-strike.beat-1 span,
      .reflection-strike.beat-2 span,
      .reflection-strike.beat-2 strong {
        opacity: 1;
        filter: blur(0);
        transform: none;
      }

      .reflection-strike.beat-2::before {
        animation: mirrorBreakStill 1800ms ease-out both;
      }

      .reflection-strike.beat-2::after {
        animation: struckRipple 1800ms ease-out both;
      }

      .is-released .still-lake-surface::before {
        animation: waterReturnStill 1200ms ease-out both;
      }

      .zhu-seal,
      .mini-seal {
        display: grid;
        place-items: center;
        border: 1px solid rgba(179, 76, 56, 0.58);
        color: rgba(179, 76, 56, 0.94);
        font-family: var(--font-story);
        font-weight: 700;
        text-align: center;
        transform: rotate(-8deg);
      }

      .zhu-seal {
        width: clamp(7rem, 25vw, 10rem);
        aspect-ratio: 1;
        font-size: clamp(1.8rem, 7vw, 3.3rem);
        letter-spacing: 0.08em;
        background: rgba(120, 60, 45, 0.11);
        box-shadow:
          inset 0 0 34px rgba(179, 76, 56, 0.12),
          0 0 42px rgba(120, 60, 45, 0.2),
          0 18px 70px rgba(0, 0, 0, 0.38);
        animation: sealDrop 500ms cubic-bezier(0.18, 1.18, 0.34, 1) both, sealAfterglow 2100ms ease-out 500ms both;
      }

      .seal-awaiting {
        display: grid;
        place-items: center;
        width: clamp(7rem, 25vw, 10rem);
        aspect-ratio: 1;
        border: 1px solid rgba(216, 183, 111, 0.11);
        border-radius: 50%;
        color: rgba(220, 212, 195, 0.34);
        font-family: var(--font-story);
        font-size: clamp(1rem, 3.5vw, 1.5rem);
        letter-spacing: 0.1em;
        background: radial-gradient(circle, rgba(95, 132, 117, 0.055), transparent 68%);
        filter: blur(0.4px);
      }

      .today-summary {
        width: min(760px, 92vw);
        display: grid;
        gap: 0.72rem;
        text-align: left;
      }

      .today-summary span {
        display: grid;
        grid-template-columns: minmax(5.5rem, 0.28fr) minmax(0, 1fr);
        gap: 1rem;
        border-bottom: 1px solid rgba(217, 189, 122, 0.075);
        padding-bottom: 0.72rem;
        color: rgba(220, 212, 195, 0.68);
      }

      .today-summary b {
        font-family: var(--font-function);
        font-size: 0.72rem;
        letter-spacing: 0.18em;
        color: rgba(216, 183, 111, 0.68);
      }

      .summary-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.72rem;
      }

      .summary-actions button {
        min-height: 2.7rem;
        border: 1px solid rgba(216, 183, 111, 0.22);
        border-radius: 999px;
        background: rgba(2, 6, 5, 0.18);
        padding: 0.62rem 1.12rem;
        color: rgba(216, 183, 111, 0.78);
        cursor: pointer;
        font-family: var(--font-function);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      .summary-actions button:hover {
        border-color: rgba(216, 183, 111, 0.42);
        color: rgba(244, 235, 221, 0.88);
      }

      .backlight-proof {
        display: grid;
        gap: 0.82rem;
        max-width: 52rem;
      }

      .backlight-proof span {
        opacity: 0;
        animation: proofFloatUp 1800ms ease both;
      }

      .backlight-proof span:nth-child(2) { animation-delay: 460ms; }
      .backlight-proof span:nth-child(3) { animation-delay: 920ms; }

      .is-backlight strong {
        font-family: var(--font-story);
        font-size: clamp(1.35rem, 5vw, 2.4rem);
        font-weight: 300;
        letter-spacing: 0.2em;
        color: rgba(216, 183, 111, 0.86);
      }

      .history-inner {
        min-height: min(62svh, 620px);
      }

      .history-water-button {
        position: relative;
        width: min(760px, 92vw);
        min-height: clamp(13rem, 42vw, 22rem);
        display: grid;
        place-items: center;
        align-content: center;
        gap: 1rem;
        border: 0;
        border-radius: 50%;
        background:
          repeating-radial-gradient(ellipse at center, rgba(244, 235, 221, calc(0.018 * var(--repeat-count, 1))) 0 1px, transparent 1px 18px),
          radial-gradient(ellipse at center, rgba(95, 132, 117, 0.12), rgba(0, 0, 0, 0.08) 72%);
        color: rgba(244, 235, 221, 0.88);
        cursor: pointer;
        font-family: var(--font-story);
      }

      .history-station.is-deep .history-water-button {
        background:
          repeating-radial-gradient(ellipse at center, rgba(244, 235, 221, 0.03) 0 1px, transparent 1px 18px),
          radial-gradient(ellipse at center, rgba(31, 58, 49, 0.32), rgba(0, 0, 0, 0.16) 72%);
      }

      .history-station.is-darker .history-water-button {
        background:
          repeating-radial-gradient(ellipse at center, rgba(120, 60, 45, 0.045) 0 1px, transparent 1px 18px),
          radial-gradient(ellipse at center, rgba(21, 36, 31, 0.5), rgba(0, 0, 0, 0.28) 72%);
      }

      .history-water-button em {
        color: rgba(216, 183, 111, 0.68);
        font-family: var(--font-function);
        font-size: 0.78rem;
        font-style: normal;
        letter-spacing: 0.16em;
      }

      .history-water-button strong {
        max-width: 30rem;
        font-size: clamp(1.45rem, 6vw, 3.4rem);
        font-weight: 300;
        line-height: 1.34;
        letter-spacing: 0.08em;
      }

      .echo-rings {
        position: absolute;
        inset: 12%;
        border-radius: 50%;
        opacity: 0.5;
        background: repeating-radial-gradient(ellipse at center, transparent 0 20px, rgba(216, 183, 111, 0.05) 21px 22px, transparent 23px 42px);
        animation: echoRings 8s ease-in-out infinite;
      }

      .mini-seal {
        position: absolute;
        right: 13%;
        bottom: 15%;
        width: 4.2rem;
        aspect-ratio: 1;
        background: rgba(120, 60, 45, 0.06);
        font-style: normal;
        font-size: 0.88rem;
        letter-spacing: 0.06em;
      }

      .history-detail {
        width: min(860px, 92vw);
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition: grid-template-rows 520ms ease, opacity 520ms ease;
      }

      .is-expanded .history-detail {
        grid-template-rows: 1fr;
        opacity: 1;
      }

      .history-detail dl {
        overflow: hidden;
        display: grid;
        gap: 0.72rem;
        margin: 0;
        text-align: left;
      }

      .history-detail div {
        display: grid;
        gap: 0.3rem;
        border-bottom: 1px solid rgba(217, 189, 122, 0.055);
        padding-bottom: 0.72rem;
      }

      .history-detail dt {
        font-family: var(--font-function);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        color: rgba(216, 183, 111, 0.68);
      }

      .history-detail dd {
        margin: 0;
        white-space: pre-line;
        font-family: var(--font-story);
        font-size: clamp(0.98rem, 2.8vw, 1.18rem);
        line-height: 1.78;
        color: rgba(220, 212, 195, 0.72);
      }

      .repeat-note,
      .light-note {
        margin-top: 0.72rem;
        display: inline-flex;
        justify-content: center;
        color: rgba(216, 183, 111, 0.72);
      }

      .still-water-foot {
        width: min(1080px, calc(100vw - 32px));
        margin: clamp(2rem, 7vw, 4.5rem) auto 1rem;
        display: grid;
        gap: 1.2rem;
        align-items: center;
      }

      .still-water-foot p {
        margin: 0 0 0.5rem;
        font-family: var(--font-function);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: rgba(216, 183, 111, 0.7);
      }

      .still-water-foot span {
        display: block;
        font-family: var(--font-story);
        font-size: 1rem;
        line-height: 1.9;
        color: rgba(220, 212, 195, 0.58);
      }

      .still-water-links {
        display: grid;
        gap: 0.75rem;
      }

      @media (min-width: 860px) {
        .still-water-foot {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .still-water-links {
          grid-template-columns: repeat(3, max-content);
        }
      }

      @media (max-width: 640px) {
        .still-water-actions {
          top: max(0.72rem, env(safe-area-inset-top));
          right: 0.75rem;
          bottom: auto;
          justify-content: flex-end;
          overflow-x: auto;
          padding-inline: 0;
          flex-wrap: nowrap;
          scrollbar-width: none;
          width: min(30rem, calc(100vw - 1.5rem));
          opacity: 0;
        }

        .has-opened-scroll .still-water-actions {
          opacity: 0.12;
        }

        .has-opened-scroll .still-water-actions:hover,
        .has-opened-scroll .still-water-actions:focus-within {
          opacity: 0.92;
        }

        .still-water-actions::-webkit-scrollbar {
          display: none;
        }

        .still-filter-group {
          flex: 0 0 auto;
        }

        .still-station {
          min-height: 82svh;
          padding-inline: 0.9rem;
        }

        .still-station h2 {
          font-size: clamp(2rem, 11vw, 3.3rem);
          letter-spacing: 0.05em;
        }

        .thief-shadow,
        .mirror-pool {
          width: min(360px, 94vw);
        }

        .thief-shadow span:nth-child(1) { transform: translate(-50%, -50%) translate(-112px, -12px); }
        .thief-shadow span:nth-child(2) { transform: translate(-50%, -50%) translate(-62px, 70px); }
        .thief-shadow span:nth-child(3) { transform: translate(-50%, -50%) translate(8px, -68px); }
        .thief-shadow span:nth-child(4) { transform: translate(-50%, -50%) translate(84px, 62px); }
        .thief-shadow span:nth-child(5) { transform: translate(-50%, -50%) translate(120px, -8px); }
        .thief-shadow span:nth-child(6) { transform: translate(-50%, -50%) translate(0, 22px) scale(0.78); }

        .mirror-pool span:nth-child(1) { transform: translate(-50%, -50%) translate(-132px, -16px) scale(0.78); }
        .mirror-pool span:nth-child(2) { transform: translate(-50%, -50%) translate(-84px, 82px) scale(0.7); }
        .mirror-pool span:nth-child(3) { transform: translate(-50%, -50%) translate(-48px, -88px) scale(0.66); }
        .mirror-pool span:nth-child(4) { transform: translate(-50%, -50%) translate(0, 18px) scale(0.62); }
        .mirror-pool span:nth-child(5) { transform: translate(-50%, -50%) translate(48px, -88px) scale(0.66); }
        .mirror-pool span:nth-child(6) { transform: translate(-50%, -50%) translate(84px, 82px) scale(0.7); }
        .mirror-pool span:nth-child(7) { transform: translate(-50%, -50%) translate(132px, -16px) scale(0.78); }
        .mirror-pool span:nth-child(8) { transform: translate(-50%, -50%) translate(-8px, -130px) scale(0.54); }
        .mirror-pool span:nth-child(9) { transform: translate(-50%, -50%) translate(0, 124px) scale(0.54); }

        .history-water-button {
          min-height: 15rem;
        }

        .still-station.is-intro .still-station-inner {
          padding-top: clamp(4.8rem, 9svh, 6rem);
        }

        .still-station.is-intro h2 {
          font-size: clamp(2.9rem, 15vw, 5rem);
          line-height: 1.28;
          white-space: normal;
        }

        .open-scroll-button {
          margin-top: clamp(10rem, 24svh, 16rem);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .still-water-page *,
        .still-water-page *::before,
        .still-water-page *::after {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 1ms !important;
        }
      }

      @keyframes stillFogOpen {
        from { transform: translate3d(-1.5%, 1%, 0); opacity: 0.42; }
        to { transform: translate3d(1.5%, -1%, 0); opacity: 0.62; }
      }

      @keyframes stillGoldFieldDrift {
        from {
          background-position:
            0 0,
            12% 56%,
            62% 68%,
            0 0,
            0 0;
          opacity: 0.42;
        }

        to {
          background-position:
            0 0,
            16% 60%,
            58% 64%,
            0.8rem -0.6rem,
            -0.6rem 0.8rem;
          opacity: 0.62;
        }
      }

      @keyframes heartLakeIntroRipple {
        0% { opacity: 0.28; transform: scale(0.4); filter: blur(0); }
        100% { opacity: 0; transform: scale(1.8); filter: blur(2px); }
      }

      @keyframes scrollLeafOpenLeft {
        0% { opacity: 0; transform: translateX(0); }
        12% { opacity: 0.86; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-78%); }
      }

      @keyframes scrollLeafOpenRight {
        0% { opacity: 0; transform: translateX(0); }
        12% { opacity: 0.86; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(78%); }
      }

      @keyframes scrollLightSeam {
        0% { height: 0; opacity: 0; filter: blur(8px); }
        16% { height: 84svh; opacity: 0.76; filter: blur(1px); }
        100% { height: 100svh; opacity: 0; filter: blur(10px); }
      }

      @keyframes heartLakeMistDrift {
        from { transform: translate3d(-2.4%, 1.2%, 0); opacity: 0.26; }
        to { transform: translate3d(2.4%, -1.2%, 0); opacity: 0.42; }
      }

      @keyframes heartLakeParticleFloat {
        0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.18; }
        50% { transform: translate3d(0.8rem, -1.6rem, 0); opacity: 0.46; }
      }

      @keyframes floatingThoughtIn {
        from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
      }

      @keyframes lakeBreath {
        0%, 100% { opacity: 0.46; transform: translate(-50%, -50%) scale(0.98); }
        50% { opacity: 0.74; transform: translate(-50%, -50%) scale(1.02); }
      }

      @keyframes cueSink {
        0%, 100% { opacity: 0.42; transform: translateY(0); }
        50% { opacity: 0.9; transform: translateY(0.45rem); }
      }

      @keyframes dropTradeMoment {
        from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0.2px); }
      }

      @keyframes thoughtDropWater {
        0% { opacity: 0; transform: translateY(-28px) scale(1.04); filter: blur(7px); }
        62% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        100% { opacity: 1; transform: translateY(10px) scale(0.99); filter: blur(0.25px); }
      }

      @keyframes crackLayerIn {
        from, to { opacity: 0.62; }
      }

      @keyframes waterStillBreath {
        0%, 100% { opacity: 0.34; transform: translate(-50%, -50%) scaleX(1); }
        50% { opacity: 0.5; transform: translate(-50%, -50%) scaleX(1.025); }
      }

      @keyframes stillMistDrift {
        from { transform: translate3d(-3%, 1%, 0); }
        to { transform: translate3d(3%, -1%, 0); }
      }

      @keyframes waterImpact {
        0% { opacity: 0; transform: scale(0.24); filter: blur(2px); }
        38% { opacity: 0.58; }
        100% { opacity: 0; transform: scale(1.85); filter: blur(0.6px); }
      }

      @keyframes waterCrack {
        0% { opacity: 0; clip-path: inset(0 100% 0 0); filter: blur(2px); }
        42% { opacity: 0.72; }
        100% { opacity: 0; clip-path: inset(0 0 0 0); filter: blur(0.8px); }
      }

      @keyframes thiefShadowRise {
        from { opacity: 0.2; transform: translate(-50%, -50%) translateY(34px) scale(0.82); }
        to { opacity: 1; }
      }

      @keyframes mirrorRise {
        from { opacity: 0.2; filter: blur(8px); }
        to { opacity: 1; filter: blur(0); }
      }

      @keyframes mirrorBreakStill {
        0% { opacity: 0.48; transform: scale(0.96); filter: blur(2px); }
        34% { opacity: 0.74; }
        100% { opacity: 0.28; transform: scale(1.08); filter: blur(0.2px); }
      }

      @keyframes struckRipple {
        0% { opacity: 0.62; transform: translate(-50%, -50%) scale(0.24); filter: blur(0); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.55); filter: blur(2px); }
      }

      @keyframes waterReturnStill {
        0% { opacity: 0.68; transform: translate(-50%, -50%) scaleX(1.08); filter: blur(2px); }
        100% { opacity: 0.34; transform: translate(-50%, -50%) scaleX(1); filter: blur(0.4px); }
      }

      @keyframes sealDrop {
        0% { opacity: 0; transform: translateY(-2.6rem) rotate(-8deg) scale(1.18); filter: blur(6px); }
        100% { opacity: 1; transform: translateY(0) rotate(-8deg) scale(1); filter: blur(0); }
      }

      @keyframes sealAfterglow {
        0% { box-shadow: inset 0 0 34px rgba(179, 76, 56, 0.18), 0 0 72px rgba(179, 76, 56, 0.32); }
        100% { box-shadow: inset 0 0 34px rgba(179, 76, 56, 0.1), 0 0 34px rgba(120, 60, 45, 0.14); }
      }

      @keyframes backlightWater {
        from { opacity: 0.2; transform: scale(0.96); filter: blur(2px); }
        to { opacity: 0.66; transform: scale(1.06); filter: blur(0); }
      }

      @keyframes proofFloatUp {
        from { opacity: 0; transform: translateY(28px); filter: blur(8px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0.2px); }
      }

      @keyframes echoRings {
        0%, 100% { opacity: 0.3; transform: scale(0.96); }
        50% { opacity: 0.62; transform: scale(1.03); }
      }
    `}</style>
  )
}
