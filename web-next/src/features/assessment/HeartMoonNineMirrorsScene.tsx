"use client"

import { useEffect, useMemo, useState } from "react"

import HeartLakeEngine, { type LakeMode } from "./HeartLakeEngine"
import OneThoughtRitualFlow from "./OneThoughtRitualFlow"
import { StillWaterIntroMirror } from "./StillWaterIntroMirror"

type HeartMoonNineMirrorsSceneProps = {
  onLakeModeChange?: (mode: LakeMode) => void
  onRipple?: () => void
}

type PreludeStep = "market" | "question" | "ripple" | "heartMoon"

export function HeartMoonNineMirrorsScene({ onLakeModeChange, onRipple }: HeartMoonNineMirrorsSceneProps) {
  const [lakeMode, setLakeMode] = useState<LakeMode>("still")
  const [rippleKey, setRippleKey] = useState(0)
  const [showLakeEngine, setShowLakeEngine] = useState(false)
  const [showRitualFlow, setShowRitualFlow] = useState(false)
  const [preludeStep, setPreludeStep] = useState<PreludeStep>("market")
  const stillWaterPhase = useMemo(() => {
    if (!showRitualFlow) {
      if (preludeStep === "market") return "marketStill"
      if (preludeStep === "question") return "question"
      if (preludeStep === "ripple") return "firstRipple"
      return "heartMoon"
    }

    if (lakeMode === "still") return "heartMoon"
    if (lakeMode === "thought") return "lakeThought"
    if (lakeMode === "liangzhi") return "conscienceReady"
    return "mirrorsResponding"
  }, [lakeMode, preludeStep, showRitualFlow])

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPreludeStep("question"), 3200),
      window.setTimeout(() => setShowLakeEngine(true), 5200),
      window.setTimeout(() => setPreludeStep("ripple"), 6400),
      window.setTimeout(() => {
        setRippleKey((key) => key + 1)
        onRipple?.()
      }, 6900),
      window.setTimeout(() => setPreludeStep("heartMoon"), 8600),
      window.setTimeout(() => setShowRitualFlow(true), 9800),
    ]

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [onRipple])

  const updateLakeMode = (mode: LakeMode) => {
    setLakeMode(mode)
    onLakeModeChange?.(mode)
  }

  const triggerRipple = () => {
    setRippleKey((key) => key + 1)
    onRipple?.()
  }

  return (
    <section className="heart-moon-nine-mirrors-scene" aria-label="照见一念仪轨">
      <StillWaterIntroMirror phase={stillWaterPhase} />
      {!showRitualFlow ? (
        <div className={`heart-prelude-copy is-${preludeStep}`} aria-live="polite">
          {preludeStep === "market" ? (
            <p>
              行情留在屏幕。
              <br />
              <br />
              这一刻，
              <br />
              <br />
              往心里走一步。
            </p>
          ) : null}
          {preludeStep === "question" ? (
            <p>
              此刻,你心里最先冒出来的,是什么念头?
            </p>
          ) : null}
          {preludeStep === "ripple" ? (
            <p>
              一念未明时，
              <br />
              此心必先有涟漪。
            </p>
          ) : null}
          {preludeStep === "heartMoon" ? <p>心月照心</p> : null}
        </div>
      ) : null}
      {showLakeEngine ? (
        <HeartLakeEngine
          lakeMode={lakeMode}
          triggerRippleKey={rippleKey}
          opacity={lakeMode === "liangzhi" ? 0.62 : lakeMode === "still" ? 0.74 : 0.88}
          moonPathIntensity={lakeMode === "liangzhi" ? 0.34 : lakeMode === "still" ? 0.55 : 0.78}
          bloomScale={lakeMode === "liangzhi" ? 0.42 : 0.82}
          className="heart-moon-lake-engine"
        />
      ) : null}
      {showRitualFlow ? (
        <OneThoughtRitualFlow
          initialScene="surge"
          initialIntensity={3}
          onLakeModeChange={updateLakeMode}
          onRipple={triggerRipple}
        />
      ) : null}

      <style jsx>{`
        .heart-moon-nine-mirrors-scene {
          position: relative;
          width: 100vw;
          min-height: calc(100svh - 2.5rem);
          margin-left: calc(50% - 50vw);
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 36%, rgba(95, 132, 117, 0.13), transparent 38%),
            radial-gradient(circle at 50% 60%, rgba(216, 183, 111, 0.07), transparent 42%),
            linear-gradient(180deg, #080807 0%, #0a0c0b 48%, #050505 100%);
          isolation: isolate;
        }

        .heart-moon-nine-mirrors-scene :global(.still-water-intro) {
          z-index: 0;
          opacity: 0.8;
        }

        .heart-moon-nine-mirrors-scene :global(.heart-moon-lake-engine) {
          z-index: 2;
          mix-blend-mode: normal;
          pointer-events: auto;
        }

        .heart-prelude-copy {
          position: absolute;
          left: 50%;
          top: 56%;
          z-index: 5;
          width: min(32rem, calc(100vw - 2rem));
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }

        .heart-prelude-copy p {
          margin: 0;
          color: rgba(232, 228, 210, 0.92);
          font-family: var(--font-narrative);
          font-size: clamp(1.22rem, 2.8vw, 1.72rem);
          font-weight: 360;
          font-variation-settings: "wght" 360;
          line-height: 1.82;
          letter-spacing: 0.065em;
          text-shadow: 0 0 50px rgba(0, 0, 0, 0.6);
          animation: heartPreludeCopyIn 1150ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .heart-prelude-copy.is-question {
          top: 58%;
        }

        .heart-prelude-copy.is-ripple {
          top: 50%;
        }

        .heart-prelude-copy.is-ripple p,
        .heart-prelude-copy.is-heartMoon p {
          color: rgba(244, 235, 221, 0.94);
        }

        .heart-prelude-copy.is-heartMoon {
          top: 48%;
        }

        .heart-moon-nine-mirrors-scene::before,
        .heart-moon-nine-mirrors-scene::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .heart-moon-nine-mirrors-scene::before {
          z-index: 1;
          background:
            radial-gradient(ellipse at 50% 58%, transparent 0%, rgba(0, 0, 0, 0.18) 42%, rgba(0, 0, 0, 0.72) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.32), transparent 36%, rgba(0, 0, 0, 0.42));
        }

        .heart-moon-nine-mirrors-scene::after {
          z-index: 4;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, 0.8), transparent 22%, transparent 78%, rgba(0, 0, 0, 0.78)),
            linear-gradient(180deg, rgba(0, 0, 0, 0.62), transparent 18%, transparent 72%, rgba(0, 0, 0, 0.7));
        }

        @keyframes heartPreludeCopyIn {
          from {
            opacity: 0;
            transform: translateY(12px);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </section>
  )
}
