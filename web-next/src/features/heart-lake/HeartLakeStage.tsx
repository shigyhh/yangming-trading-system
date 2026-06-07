"use client"

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"

import HeartLakeEngine, { type LakeMode } from "@/features/assessment/HeartLakeEngine"

export type FloatingThought = {
  id: string
  text: string
  source: "mine" | "anonymous" | "system"
  sceneId?: string
  thief?: string
  mirrorId?: string
  x?: number
  y?: number
  depth?: number
  opacity?: number
  driftSpeed?: number
}

type HeartLakeMode = "mirror-scroll" | "thought-lake" | "home"

type HeartLakeStageProps = {
  children?: ReactNode
  className?: string
  currentThought?: FloatingThought
  floatingThoughts?: FloatingThought[]
  focusThoughtId?: string
  lakeMode?: LakeMode
  mode?: HeartLakeMode
  onThoughtClick?: (thought: FloatingThought) => void
  showMist?: boolean
  showRipples?: boolean
}

function getModeLakeState(mode: HeartLakeMode, lakeMode?: LakeMode): LakeMode {
  if (lakeMode) return lakeMode
  if (mode === "thought-lake") return "thought"
  return "still"
}

function getVisibleThoughts(currentThought?: FloatingThought, floatingThoughts: FloatingThought[] = []) {
  const merged = currentThought ? [currentThought, ...floatingThoughts] : floatingThoughts
  const seen = new Set<string>()

  return merged
    .filter((thought) => {
      if (seen.has(thought.id)) return false
      seen.add(thought.id)
      return thought.text.trim().length > 0
    })
    .slice(0, 9)
}

export function HeartLakeStage({
  children,
  className = "",
  currentThought,
  floatingThoughts = [],
  focusThoughtId,
  lakeMode,
  mode = "mirror-scroll",
  onThoughtClick,
  showMist = true,
  showRipples = true,
}: HeartLakeStageProps) {
  const [rippleKey, setRippleKey] = useState(0)
  const visibleThoughts = useMemo(
    () => getVisibleThoughts(currentThought, floatingThoughts),
    [currentThought, floatingThoughts],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setRippleKey((current) => current + 1), 420)

    return () => window.clearTimeout(timer)
  }, [currentThought?.id, mode])

  return (
    <div className={`heart-lake-root heart-lake-mode-${mode} ${className}`} data-heart-lake-mode={mode}>
      <div className="heart-lake-bg" aria-hidden="true" />
      <div className="heart-lake-depth-shadow" aria-hidden="true" />
      <div className="heart-lake-water-plane heart-lake-water" aria-hidden="true">
        <HeartLakeEngine
          lakeMode={getModeLakeState(mode, lakeMode)}
          triggerRippleKey={showRipples ? rippleKey : 0}
          moonPathIntensity={mode === "thought-lake" ? 0.74 : 0.62}
          bloomScale={mode === "thought-lake" ? 0.82 : 0.72}
          opacity={mode === "thought-lake" ? 0.9 : 0.82}
          className="heart-lake-engine"
        />
      </div>
      <div className="heart-lake-ripple-layer heart-lake-ripples" aria-hidden="true">
        {showRipples ? (
          <>
            <i />
            <i />
          </>
        ) : null}
      </div>
      {showMist ? (
        <>
          <div className="heart-lake-mist-back heart-lake-mist-far heart-lake-mist" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="heart-lake-mist-front heart-lake-mist-near heart-lake-mist" aria-hidden="true">
            <i />
          </div>
        </>
      ) : null}
      <div className="heart-lake-particles" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="heart-lake-floating-thoughts" aria-label={mode === "thought-lake" ? "众人一念浮在心湖" : "一念浮在心湖"}>
        {visibleThoughts.map((thought, index) => {
          const isFocused = focusThoughtId ? thought.id === focusThoughtId : thought.id === currentThought?.id
          const depth = Math.max(0, Math.min(1, thought.depth ?? (isFocused ? 0 : 0.5 + index * 0.08)))
          const x = thought.x ?? (isFocused ? 50 : 18 + ((index * 17) % 64))
          const y = thought.y ?? (isFocused ? 48 : 26 + ((index * 23) % 48))

          return (
            <button
              key={thought.id}
              type="button"
              className={`heart-lake-floating-thought is-${thought.source} ${isFocused ? "is-focused" : ""}`}
              style={
                {
                  "--thought-x": `${x}%`,
                  "--thought-y": `${y}%`,
                  "--thought-depth": depth,
                  "--thought-opacity": thought.opacity ?? (isFocused ? 0.92 : 0.42),
                  "--thought-drift": `${thought.driftSpeed ?? 8 + index * 0.7}s`,
                } as CSSProperties
              }
              onClick={() => onThoughtClick?.(thought)}
              disabled={!onThoughtClick}
            >
              「{thought.text}」
            </button>
          )
        })}
      </div>
      <div className="heart-lake-content">{children}</div>
      <div className="heart-lake-seal-layer" aria-hidden="true" />
      <HeartLakeStageStyles />
    </div>
  )
}

function HeartLakeStageStyles() {
  return (
    <style jsx global>{`
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
      .heart-lake-depth-shadow,
      .heart-lake-water,
      .heart-lake-water-plane,
      .heart-lake-ripple-layer,
      .heart-lake-mist-back,
      .heart-lake-mist-front,
      .heart-lake-mist-far,
      .heart-lake-mist-near,
      .heart-lake-particles,
      .heart-lake-floating-thoughts,
      .heart-lake-seal-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .heart-lake-bg {
        z-index: 0;
        background:
          radial-gradient(circle at 50% 22%, rgba(216, 183, 111, 0.045), transparent 22rem),
          radial-gradient(ellipse at 50% 62%, rgba(95, 132, 117, 0.16), transparent 46rem),
          linear-gradient(180deg, #020403 0%, #06100d 48%, #020302 100%);
      }

      .heart-lake-depth-shadow {
        z-index: 1;
        background:
          radial-gradient(ellipse at 50% 70%, rgba(0, 0, 0, 0.08), transparent 30%),
          radial-gradient(ellipse at 50% 52%, transparent 42%, rgba(0, 0, 0, 0.5) 78%),
          linear-gradient(180deg, rgba(0, 0, 0, 0.84), transparent 26%, transparent 68%, rgba(0, 0, 0, 0.88));
      }

      .heart-lake-water {
        z-index: 2;
        opacity: 0.76;
        transform: translateY(8svh) scale(1.04);
        filter: saturate(0.7) hue-rotate(22deg) brightness(0.82);
      }

      .heart-lake-engine {
        mix-blend-mode: screen;
      }

      .heart-lake-ripple-layer {
        z-index: 3;
        display: grid;
        place-items: center;
      }

      .heart-lake-ripple-layer i {
        position: absolute;
        width: min(62vw, 520px);
        aspect-ratio: 2.3;
        border-radius: 50%;
        border: 1px solid rgba(244, 235, 221, 0.11);
        opacity: 0;
        transform: scale(0.4);
        animation: heartLakeIntroRipple 1500ms ease-out 520ms both;
      }

      .heart-lake-ripple-layer i:nth-child(2) {
        width: min(74vw, 680px);
        animation-delay: 760ms;
        border-color: rgba(216, 183, 111, 0.09);
      }

      .heart-lake-mist-far,
      .heart-lake-mist-near {
        z-index: 5;
        overflow: hidden;
      }

      .heart-lake-mist-far i,
      .heart-lake-mist-near i {
        position: absolute;
        inset: -18%;
        opacity: 0.34;
        filter: blur(34px);
        background:
          radial-gradient(ellipse at 24% 28%, rgba(244, 235, 221, 0.06), transparent 26rem),
          radial-gradient(ellipse at 76% 68%, rgba(95, 132, 117, 0.13), transparent 30rem);
        animation: heartLakeMistDrift 22s ease-in-out infinite alternate;
      }

      .heart-lake-mist-far i:nth-child(2) {
        opacity: 0.28;
        animation-duration: 28s;
        animation-direction: alternate-reverse;
        background:
          radial-gradient(ellipse at 46% 22%, rgba(216, 183, 111, 0.055), transparent 22rem),
          radial-gradient(ellipse at 50% 88%, rgba(2, 5, 4, 0.88), transparent 34rem);
      }

      .heart-lake-mist-near i {
        opacity: 0.52;
        background: linear-gradient(180deg, rgba(2, 4, 3, 0.82), transparent 24%, transparent 76%, rgba(2, 4, 3, 0.94));
      }

      .heart-lake-particles {
        z-index: 6;
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

      .heart-lake-floating-thoughts {
        z-index: 7;
      }

      .heart-lake-floating-thought {
        pointer-events: auto;
        position: absolute;
        left: var(--thought-x);
        top: var(--thought-y);
        border: 0;
        background: transparent;
        color: rgba(244, 235, 221, calc(var(--thought-opacity) * (1 - var(--thought-depth) * 0.45)));
        cursor: pointer;
        font-family: var(--font-story), var(--font-serif, "Songti SC", serif);
        font-size: clamp(0.94rem, calc(2.8vw * (1 - var(--thought-depth) * 0.24)), 2.6rem);
        font-weight: 300;
        letter-spacing: 0.08em;
        opacity: calc(var(--thought-opacity) * (1 - var(--thought-depth) * 0.42));
        padding: 0.2rem;
        text-shadow:
          0 0 24px rgba(244, 235, 221, 0.08),
          0 18px 42px rgba(0, 0, 0, 0.42);
        transform: translate(-50%, -50%) scale(calc(1 - var(--thought-depth) * 0.18));
        filter: blur(calc(var(--thought-depth) * 5px));
        transition: opacity 520ms ease, filter 520ms ease, transform 520ms ease, color 520ms ease;
        animation: heartLakeThoughtDrift var(--thought-drift) ease-in-out infinite alternate;
      }

      .heart-lake-floating-thought:disabled {
        cursor: default;
      }

      .heart-lake-floating-thought.is-anonymous {
        color: rgba(220, 212, 195, calc(var(--thought-opacity) * 0.8));
      }

      .heart-lake-floating-thought.is-system {
        color: rgba(216, 183, 111, calc(var(--thought-opacity) * 0.78));
      }

      .heart-lake-floating-thought.is-focused,
      .heart-lake-floating-thought:hover {
        opacity: 0.96;
        color: rgba(244, 235, 221, 0.92);
        filter: blur(0);
        transform: translate(-50%, -50%) scale(1.02);
      }

      .heart-lake-content {
        position: relative;
        z-index: 8;
        width: min(640px, calc(100vw - 40px));
        min-height: 78svh;
        display: grid;
        place-items: center;
        align-content: center;
        gap: clamp(0.72rem, 2vw, 1.18rem);
        text-align: center;
        transform: translateY(-1.5svh);
      }

      .heart-lake-seal-layer {
        z-index: 9;
      }

      @keyframes heartLakeIntroRipple {
        0% { opacity: 0.28; transform: scale(0.4); filter: blur(0); }
        100% { opacity: 0; transform: scale(1.8); filter: blur(2px); }
      }

      @keyframes heartLakeMistDrift {
        from { transform: translate3d(-2.4%, 1.2%, 0); opacity: 0.26; }
        to { transform: translate3d(2.4%, -1.2%, 0); opacity: 0.42; }
      }

      @keyframes heartLakeParticleFloat {
        0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.22; }
        50% { transform: translate3d(0.5rem, -0.8rem, 0); opacity: 0.48; }
      }

      @keyframes heartLakeThoughtDrift {
        from { translate: -0.25rem 0.18rem; }
        to { translate: 0.22rem -0.28rem; }
      }

      @media (prefers-reduced-motion: reduce) {
        .heart-lake-root *,
        .heart-lake-root *::before,
        .heart-lake-root *::after {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 1ms !important;
        }
      }
    `}</style>
  )
}
