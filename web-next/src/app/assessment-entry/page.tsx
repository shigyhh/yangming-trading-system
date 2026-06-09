"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { YangmingA1Mark } from "@/components/brand/yangming-mark"
import {
  AssessmentShell,
  PrimaryButton,
} from "@/features/assessment/components"
import {
  clearAssessmentDraft,
  consumeSkipEntryOpeningRitualOnce,
  hasSavedPhone,
  markAssessmentGatewayOnce,
} from "@/features/assessment/storage"

export default function AssessmentEntryPage() {
  const router = useRouter()
  const [showOpeningRitual, setShowOpeningRitual] = useState(() => !consumeSkipEntryOpeningRitualOnce())
  const isRoutingRef = useRef(false)

  useEffect(() => {
    router.prefetch("/assessment")
    router.prefetch("/assessment-login")

    const openingTimer = window.setTimeout(() => {
      setShowOpeningRitual(false)
    }, 5400)

    return () => {
      window.clearTimeout(openingTimer)
    }
  }, [router])

  const startAssessment = () => {
    if (isRoutingRef.current) return
    isRoutingRef.current = true

    const savedPhone = hasSavedPhone()
    const target = savedPhone ? "/assessment" : "/assessment-login"

    if (savedPhone) {
      clearAssessmentDraft()
      markAssessmentGatewayOnce()
    }

    router.push(target)
  }

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      {showOpeningRitual ? (
        <div className="ritual-opening-transition" aria-hidden="true">
          <div className="ritual-opening-thoughts" aria-hidden="true">
            <span className="ritual-floating-mote ritual-floating-mote-1" />
            <span className="ritual-floating-mote ritual-floating-mote-2" />
            <span className="ritual-floating-mote ritual-floating-mote-3" />
            <span className="ritual-floating-mote ritual-floating-mote-4" />
            <span className="ritual-floating-mote ritual-floating-mote-5" />
            <span className="ritual-floating-mote ritual-floating-mote-6" />
            <span className="ritual-floating-mote ritual-floating-mote-7" />
            <span className="ritual-floating-mote ritual-floating-mote-8" />
            <span className="ritual-floating-mote ritual-floating-mote-9" />
            <span className="ritual-floating-mote ritual-floating-mote-10" />

            <span className="ritual-floating-thought ritual-floating-thought-1">再等等。</span>
            <span className="ritual-floating-thought ritual-floating-thought-2">不能错过。</span>
            <span className="ritual-floating-thought ritual-floating-thought-3">先看清这一念。</span>
            <span className="ritual-floating-thought ritual-floating-thought-4">别急。</span>
            <span className="ritual-floating-thought ritual-floating-thought-5">会回来的。</span>
            <span className="ritual-floating-thought ritual-floating-thought-6">先停一息。</span>
          </div>

          <div className="ritual-still-seal" aria-hidden="true">
            <YangmingA1Mark className="ritual-seal-mark" width={112} height={104} />
          </div>

          <p className="ritual-opening-copy">此心一照，妄念自明。</p>
        </div>
      ) : (
        <div className="ritual-entry-first-step">
          <div className="ritual-late-seal" aria-hidden="true">
            <YangmingA1Mark className="ritual-seal-mark" width={66} height={61} />
          </div>

          <h1 className="ritual-line ritual-line-main ritual-line-1">
            回想最近一次
            <br />
            你定好了计划,却没守住。
          </h1>

          <p className="ritual-line ritual-line-soft ritual-line-2">
            慢慢想
          </p>

          <div className="ritual-entry-action ritual-line ritual-line-3">
            <PrimaryButton type="button" onClick={startAssessment} className="w-full">
              照见此心
            </PrimaryButton>

            <p className="ritual-entry-note">只为省察此心，不为评判对错。</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .ritual-opening-transition {
          position: relative;
          display: flex;
          width: min(100%, 1120px);
          min-height: calc(100svh - 4rem);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          overflow: hidden;
          padding: clamp(22px, 4svh, 38px) 0;
          text-align: center;
          animation: ritual-opening-fade-out 900ms ease 4600ms forwards;
        }

        .ritual-opening-thoughts {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }

        .ritual-floating-thought {
          position: absolute;
          display: block;
          max-width: min(38vw, 15em);
          font-family: var(--font-narrative);
          font-size: clamp(0.9rem, 2.1vw, 1.34rem);
          font-weight: 320;
          font-variation-settings: "wght" 320;
          letter-spacing: 0.12em;
          line-height: 1.6;
          color: rgba(220, 212, 195, 0.52);
          text-align: center;
          white-space: nowrap;
          opacity: 0;
          filter: blur(12px);
          transform: translate3d(0, 18px, 0) scale(0.98);
          animation: ritual-floating-thought-rise 2700ms cubic-bezier(0.2, 0.78, 0.2, 1) forwards;
        }

        .ritual-floating-mote {
          position: absolute;
          display: block;
          width: calc(var(--mote-r, 1) * 10px);
          height: calc(var(--mote-r, 1) * 10px);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(200, 222, 222, 0.42), rgba(200, 222, 222, 0.14) 44%, transparent 74%);
          filter: blur(2px);
          opacity: 0;
          transform: translate3d(0, 24px, 0) scale(0.82);
          animation: ritual-floating-mote-rise var(--mote-life, 5600ms) ease-out var(--mote-delay, 0ms) forwards;
        }

        .ritual-floating-mote-1 {
          left: 32%;
          top: 36%;
          --mote-r: 0.7;
          --mote-life: 4700ms;
          --mote-delay: 260ms;
          --mote-dx: -6px;
          --mote-dy: -58px;
        }

        .ritual-floating-mote-2 {
          left: 38%;
          top: 55%;
          --mote-r: 1.8;
          --mote-life: 6200ms;
          --mote-delay: 420ms;
          --mote-dx: 9px;
          --mote-dy: -74px;
        }

        .ritual-floating-mote-3 {
          right: 34%;
          top: 42%;
          --mote-r: 2.2;
          --mote-life: 6800ms;
          --mote-delay: 520ms;
          --mote-dx: -4px;
          --mote-dy: -68px;
        }

        .ritual-floating-mote-4 {
          right: 27%;
          bottom: 34%;
          --mote-r: 0.9;
          --mote-life: 5200ms;
          --mote-delay: 780ms;
          --mote-dx: 7px;
          --mote-dy: -48px;
        }

        .ritual-floating-mote-5 {
          left: 24%;
          bottom: 31%;
          --mote-r: 1.2;
          --mote-life: 5600ms;
          --mote-delay: 920ms;
          --mote-dx: -10px;
          --mote-dy: -56px;
        }

        .ritual-floating-mote-6 {
          right: 42%;
          bottom: 25%;
          --mote-r: 0.6;
          --mote-life: 4300ms;
          --mote-delay: 1080ms;
          --mote-dx: 4px;
          --mote-dy: -44px;
        }

        .ritual-floating-mote-7 {
          left: 46%;
          top: 29%;
          --mote-r: 1.5;
          --mote-life: 6400ms;
          --mote-delay: 1180ms;
          --mote-dx: 11px;
          --mote-dy: -70px;
        }

        .ritual-floating-mote-8 {
          right: 24%;
          top: 57%;
          --mote-r: 1.0;
          --mote-life: 4900ms;
          --mote-delay: 1320ms;
          --mote-dx: -8px;
          --mote-dy: -46px;
        }

        .ritual-floating-mote-9 {
          left: 29%;
          top: 49%;
          --mote-r: 2.0;
          --mote-life: 6900ms;
          --mote-delay: 1480ms;
          --mote-dx: 6px;
          --mote-dy: -62px;
        }

        .ritual-floating-mote-10 {
          right: 31%;
          top: 33%;
          --mote-r: 0.8;
          --mote-life: 4500ms;
          --mote-delay: 1640ms;
          --mote-dx: -5px;
          --mote-dy: -50px;
        }

        .ritual-floating-thought-1 {
          left: clamp(20px, 22vw, 260px);
          top: 42%;
          --thought-dx: -7px;
          animation-delay: 460ms;
        }

        .ritual-floating-thought-2 {
          right: clamp(18px, 21vw, 250px);
          top: 45%;
          --thought-dx: 8px;
          animation-delay: 680ms;
        }

        .ritual-floating-thought-3 {
          left: clamp(24px, 26vw, 310px);
          bottom: 27%;
          --thought-dx: 6px;
          color: rgba(220, 212, 195, 0.42);
          font-size: clamp(1.06rem, 2.5vw, 1.68rem);
          animation-delay: 940ms;
        }

        .ritual-floating-thought-4 {
          right: clamp(24px, 31vw, 360px);
          bottom: 35%;
          --thought-dx: -5px;
          color: rgba(220, 212, 195, 0.36);
          animation-delay: 1180ms;
        }

        .ritual-floating-thought-5 {
          left: clamp(20px, 17vw, 210px);
          top: 56%;
          --thought-dx: 5px;
          color: rgba(220, 212, 195, 0.32);
          font-size: clamp(0.78rem, 1.8vw, 1.08rem);
          animation-delay: 1420ms;
        }

        .ritual-floating-thought-6 {
          right: clamp(22px, 18vw, 220px);
          bottom: 24%;
          --thought-dx: -6px;
          color: rgba(220, 212, 195, 0.38);
          font-size: clamp(1rem, 2.3vw, 1.46rem);
          animation-delay: 1600ms;
        }

        .ritual-still-seal {
          position: relative;
          z-index: 2;
          display: grid;
          width: clamp(176px, 43vw, 238px);
          height: clamp(176px, 43vw, 238px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.28);
          border-radius: 999px;
          overflow: hidden;
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.18), rgba(216, 183, 111, 0.055) 42%, rgba(255, 255, 255, 0.012) 61%, transparent 76%),
            radial-gradient(circle at 50% 56%, rgba(95, 132, 117, 0.07), transparent 62%);
          box-shadow:
            0 0 74px rgba(180, 157, 93, 0.1),
            inset 0 0 38px rgba(216, 183, 111, 0.045);
          opacity: 0;
          filter: blur(14px);
          transform: translateY(24px) scale(0.93);
          animation:
            ritual-seal-appear 1800ms cubic-bezier(0.16, 1, 0.3, 1) 60ms forwards,
            ritual-still-seal-breathe 5.6s ease-in-out 2160ms infinite;
        }

        .ritual-still-seal::before {
          content: "";
          position: absolute;
          inset: 28px;
          border: 1px dashed rgba(220, 212, 195, 0.145);
          border-radius: inherit;
        }

        .ritual-still-seal::after {
          content: "";
          position: absolute;
          inset: 42px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.16);
          filter: blur(28px);
        }

        .ritual-still-seal :global(.ritual-seal-mark) {
          position: relative;
          z-index: 2;
          width: clamp(4.9rem, 17vw, 7.1rem);
          max-width: 54%;
          max-height: 54%;
          height: auto;
          color: rgba(242, 235, 220, 0.82);
          transform: translateX(0.02em);
          text-shadow: 0 0 30px rgba(216, 183, 111, 0.12);
        }

        .ritual-late-seal {
          position: absolute;
          left: 50%;
          top: clamp(34px, 6.2svh, 82px);
          display: grid;
          width: clamp(120px, 18.6vw, 160px);
          height: clamp(120px, 18.6vw, 160px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          overflow: hidden;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.08), rgba(255, 255, 255, 0.01) 58%, transparent 74%);
          box-shadow: 0 0 38px rgba(180, 157, 93, 0.052);
          opacity: 0;
          transform: translate(-50%, 18px) scale(0.96);
          animation:
            ritual-late-seal-appear 1500ms cubic-bezier(0.22, 1, 0.36, 1) 4300ms forwards,
            ritual-late-seal-breathe 6.4s ease-in-out 5800ms infinite;
          pointer-events: none;
        }

        .ritual-late-seal::before {
          content: "";
          position: absolute;
          inset: 21px;
          border: 1px dashed rgba(220, 212, 195, 0.09);
          border-radius: inherit;
        }

        .ritual-late-seal::after {
          content: "";
          position: absolute;
          inset: 36px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.1);
          filter: blur(20px);
        }

        .ritual-late-seal :global(.ritual-seal-mark) {
          position: relative;
          z-index: 2;
          width: clamp(3rem, 8vw, 4.2rem);
          max-width: 48%;
          max-height: 48%;
          height: auto;
          color: rgba(242, 235, 220, 0.7);
          transform: translateX(0.02em);
        }

        .ritual-opening-copy {
          position: relative;
          z-index: 2;
          margin: clamp(38px, 7svh, 66px) 0 0;
          font-family: var(--font-narrative);
          font-size: clamp(1.2rem, 4.8vw, 2.18rem);
          font-weight: 300;
          letter-spacing: 0.13em;
          line-height: 1.45;
          color: rgba(238, 243, 238, 0.78);
          text-shadow: 0 0 36px rgba(0, 0, 0, 0.48);
          white-space: nowrap;
          opacity: 0;
          filter: blur(7px);
          transform: translateY(14px);
          animation: ritual-opening-copy-in 1280ms cubic-bezier(0.22, 1, 0.36, 1) 1760ms forwards;
        }

        .ritual-entry-first-step {
          position: relative;
          display: flex;
          width: min(100%, 1120px);
          min-height: calc(100svh - 4rem);
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          margin: 0 auto;
          overflow: hidden;
          padding: clamp(172px, 23svh, 252px) clamp(18px, 3vw, 42px) clamp(40px, 6svh, 72px);
          text-align: center;
        }

        .ritual-line {
          margin: 0;
          opacity: 0;
          filter: blur(8px);
          transform: translateY(14px);
          animation: ritual-line-in 1000ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .ritual-line-soft {
          margin-top: clamp(48px, 5.6svh, 68px);
          font-family: var(--font-narrative);
          font-size: clamp(1.2rem, 4.6vw, 1.62rem);
          font-weight: 360;
          font-variation-settings: "wght" 360;
          letter-spacing: 0.065em;
          line-height: 1.52;
          color: rgba(238, 243, 238, 0.72);
          text-shadow: 0 0 32px rgba(0, 0, 0, 0.42);
        }

        .ritual-line-main {
          margin-top: clamp(58px, 6svh, 86px);
          max-width: min(100%, 22em);
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: clamp(1.55rem, 3.05vw, 2.8rem);
          font-weight: 420;
          font-variation-settings: "wght" 420;
          letter-spacing: 0.025em;
          line-height: 1.36;
          color: #eef3ee;
          text-shadow: 0 0 56px rgba(0, 0, 0, 0.58);
        }

        .ritual-entry-action {
          margin-top: clamp(34px, 4.8svh, 56px);
          width: 100%;
          max-width: 380px;
          padding-bottom: max(0px, env(safe-area-inset-bottom));
        }

        @media (min-width: 960px) {
          .ritual-entry-first-step {
            min-height: calc(100svh - 5rem);
            padding-top: clamp(190px, 22svh, 258px);
            padding-inline: clamp(1rem, 3vw, 2.5rem);
          }

          .ritual-line-main {
            max-width: min(100%, 22em);
          }
        }

        .ritual-entry-note {
          margin: 14px 0 0;
          font-family: var(--font-interface);
          font-size: clamp(0.86rem, 1vw, 0.94rem);
          font-weight: 300;
          letter-spacing: 0.08em;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.34);
        }

        .ritual-line-1 {
          animation-delay: 180ms;
        }

        .ritual-line-2 {
          animation-delay: 1700ms;
        }

        .ritual-line-3 {
          animation-delay: 3500ms;
        }

        @keyframes ritual-opening-copy-in {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes ritual-seal-appear {
          0% {
            opacity: 0;
            filter: blur(16px);
            transform: translateY(28px) scale(0.92);
          }

          38% {
            opacity: 0.44;
            filter: blur(10px);
            transform: translateY(13px) scale(0.96);
          }

          100% {
            opacity: 0.92;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ritual-still-seal-breathe {
          0%,
          100% {
            opacity: 1;
            border-color: rgba(172, 146, 83, 0.24);
            box-shadow:
              0 0 62px rgba(180, 157, 93, 0.08),
              inset 0 0 34px rgba(216, 183, 111, 0.04);
            transform: translateY(0) scale(1);
          }

          50% {
            opacity: 1;
            border-color: rgba(172, 146, 83, 0.34);
            box-shadow:
              0 0 86px rgba(180, 157, 93, 0.12),
              inset 0 0 42px rgba(216, 183, 111, 0.06);
            transform: translateY(0) scale(1.018);
          }
        }

        @keyframes ritual-late-seal-appear {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: translate(-50%, 24px) scale(0.94);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes ritual-late-seal-breathe {
          0%,
          100% {
            opacity: 0.78;
            border-color: rgba(172, 146, 83, 0.14);
            box-shadow: 0 0 34px rgba(180, 157, 93, 0.045);
            transform: translate(-50%, 0) scale(1);
          }

          50% {
            opacity: 0.94;
            border-color: rgba(172, 146, 83, 0.24);
            box-shadow: 0 0 48px rgba(180, 157, 93, 0.075);
            transform: translate(-50%, 0) scale(1.016);
          }
        }

        @keyframes ritual-line-in {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes ritual-opening-fade-out {
          100% {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(-8px);
          }
        }

        @keyframes ritual-floating-thought-rise {
          0% {
            opacity: 0;
            filter: blur(13px);
            transform: translate3d(0, 18px, 0) scale(0.98);
          }

          34% {
            opacity: 0.28;
            filter: blur(3px);
          }

          70% {
            opacity: 0.18;
            filter: blur(4px);
          }

          100% {
            opacity: 0;
            filter: blur(14px);
            transform: translate3d(var(--thought-dx, 0), -18px, 0) scale(1.02);
          }
        }

        @keyframes ritual-floating-mote-rise {
          0% {
            opacity: 0;
            transform: translate3d(0, 24px, 0) scale(0.82);
          }

          22% {
            opacity: 0.2;
          }

          54% {
            opacity: 0.3;
          }

          100% {
            opacity: 0;
            transform: translate3d(var(--mote-dx, 0), var(--mote-dy, -58px), 0) scale(1.16);
          }
        }

        @media (max-width: 640px) {
          .ritual-floating-thought {
            max-width: 44vw;
            font-size: clamp(0.78rem, 3.4vw, 1.02rem);
            letter-spacing: 0.1em;
          }

          .ritual-floating-thought-1 {
            left: 5vw;
            top: 39%;
          }

          .ritual-floating-thought-2 {
            right: 5vw;
            top: 45%;
          }

          .ritual-floating-thought-3 {
            left: 10vw;
            bottom: 25%;
          }

          .ritual-floating-thought-4 {
            right: 14vw;
            bottom: 34%;
          }

          .ritual-floating-thought-5 {
            left: 8vw;
            top: 58%;
          }

          .ritual-floating-thought-6 {
            right: 9vw;
            bottom: 23%;
          }

          .ritual-floating-mote {
            width: calc(var(--mote-r, 1) * 8px);
            height: calc(var(--mote-r, 1) * 8px);
          }

          .ritual-floating-thought-3 {
            font-size: clamp(0.96rem, 4.3vw, 1.22rem);
          }

          .ritual-floating-thought-5 {
            font-size: clamp(0.72rem, 3.1vw, 0.92rem);
          }

          .ritual-floating-thought-6 {
            font-size: clamp(0.88rem, 3.8vw, 1.08rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ritual-opening-transition,
          .ritual-still-seal,
          .ritual-floating-mote,
          .ritual-floating-thought,
          .ritual-opening-copy,
          .ritual-late-seal,
          .ritual-line {
            animation-duration: 1ms !important;
            animation-delay: 0ms !important;
          }
        }

      `}</style>
    </AssessmentShell>
  )
}
