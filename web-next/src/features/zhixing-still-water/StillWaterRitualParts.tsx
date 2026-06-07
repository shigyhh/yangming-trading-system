import type { CSSProperties, ReactNode } from "react"

import type { StillWaterRecord } from "./stillWaterScrollEngine"

const mirrorNames = ["追涨之镜", "扛单之镜", "幻想之镜", "赌性之镜", "从众之镜", "犹疑之镜", "拖延之镜", "焦虑之镜", "良知之镜"]

function formatSealTime(value?: string) {
  if (!value) return "尚未落印"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function InkBleedDefs() {
  return (
    <svg className="ink-bleed-defs" aria-hidden="true" focusable="false">
      <defs>
        {[11, 29, 47, 73].map((seed, index) => (
          <filter key={seed} id={`still-ink-${index}`} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.017" numOctaves="3" seed={seed} result="noise" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.35" result="soft" />
            <feDisplacementMap in="soft" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" result="moved" />
            <feColorMatrix in="moved" type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.88  0 0 0 0 0.78  0 0 0 8 -2.2" result="body" />
            <feGaussianBlur in="body" stdDeviation="3.2" result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="body" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>
    </svg>
  )
}

export function InkText({ text }: { text: string }) {
  return (
    <span className="ink-text">
      {[...text].map((char, index) => (
        <i key={`${char}-${index}`} style={{ filter: `url(#still-ink-${index % 4})` }}>
          {char}
        </i>
      ))}
    </span>
  )
}

export function RitualStation({
  activeIndex,
  children,
  className = "",
  index,
  setRef,
}: {
  activeIndex: number
  children: ReactNode
  className?: string
  index: number
  setRef: (element: HTMLElement | null) => void
}) {
  return (
    <section
      ref={setRef}
      className={`still-station ${className} ${activeIndex === index ? "is-active" : ""}`}
      data-station-index={index}
    >
      <div className="still-station-inner">{children}</div>
    </section>
  )
}

export function ThiefShadow({ activeThief }: { activeThief: string }) {
  const thieves = ["贪", "急", "惧", "疑", "执", "从"]

  return (
    <div className="thief-shadow" aria-label="心贼水下显影">
      {thieves.map((thief) => (
        <span key={thief} className={activeThief.includes(thief) || (thief === "从" && activeThief.includes("怯")) ? "is-active" : ""}>
          {thief}
        </span>
      ))}
    </div>
  )
}

export function MirrorPool({ activeMirror }: { activeMirror: string }) {
  return (
    <div className="mirror-pool" aria-label="九镜水中显影">
      {mirrorNames.map((mirror) => (
        <span key={mirror} className={activeMirror === mirror ? "is-active" : ""}>
          {mirror.replace("之镜", "")}
        </span>
      ))}
    </div>
  )
}

export function HistoryStation({
  active,
  expanded,
  index,
  onToggle,
  record,
  setRef,
}: {
  active: boolean
  expanded: boolean
  index: number
  onToggle: () => void
  record: StillWaterRecord
  setRef: (element: HTMLElement | null) => void
}) {
  return (
    <section
      ref={setRef}
      className={`still-station history-station is-${record.waterTone} ${active ? "is-active" : ""} ${expanded ? "is-expanded" : ""}`}
      data-station-index={index}
      style={{
        "--repeat-count": record.repeatCount,
        "--thief-streak": record.thiefStreak,
      } as CSSProperties}
    >
      <div className="still-station-inner history-inner">
        <p>{record.thoughtLabel}</p>
        <button type="button" className="history-water-button" onClick={onToggle}>
          <span className="echo-rings" aria-hidden="true" />
          <em>交易现场：{record.tradeMoment}</em>
          <strong>「{record.os}」</strong>
          {record.completed ? <i className="mini-seal">已照见</i> : null}
        </button>
        <div className="history-detail">
          <dl>
            <div><dt>照回</dt><dd>{record.reflection}</dd></div>
            <div><dt>心贼</dt><dd>{record.thief}</dd></div>
            <div><dt>九镜</dt><dd>{record.mirrorName}</dd></div>
            <div><dt>今日心证</dt><dd>{record.evidence}</dd></div>
            <div><dt>今日修行</dt><dd>{record.practice}</dd></div>
            <div><dt>落印时间</dt><dd>{formatSealTime(record.sealedAt)}</dd></div>
          </dl>
          {record.repeatCount > 1 ? <span className="repeat-note">重复出现的一念，在水面留下回纹。</span> : null}
          {record.lightening ? <span className="light-note">这一念，正在变轻。</span> : null}
        </div>
      </div>
    </section>
  )
}
