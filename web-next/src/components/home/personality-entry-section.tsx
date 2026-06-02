"use client"

import { useEffect, useRef, useState } from "react"
import type { MouseEvent } from "react"
import { useRouter } from "next/navigation"

export function PersonalityEntrySection() {
  const router = useRouter()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isRitualReady, setIsRitualReady] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRitualReady(true)
        }
      },
      { threshold: 0.32 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const enterRitual = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (isEntering) return

    setIsEntering(true)
    router.push("/assessment-entry")
  }

  return (
    <section
      ref={sectionRef}
      id="personality-entry"
      aria-label="照心仪式入口"
      className={`sprint8-page ${isRitualReady ? "is-ritual-ready" : ""}`}
    >
      <div className="bg-glow bg-glow-top" />
      <div className="bg-glow bg-glow-bottom" />

      <div className="content content-compact">
        <div className="top-copy">
          <span className="line line-main ritual-step ritual-step-2">照见，</span>
          <span className="line line-main ritual-step ritual-step-2">最先动的那一念。</span>
        </div>

        <p className="desc">
          <span className="ritual-copy ritual-step ritual-step-3">
            如果同样的反应，
            <br />
            已经重复很多年。
          </span>
          <span className="ritual-copy ritual-step ritual-step-4">
            或许，
            <br />
            该看清它了。
          </span>
        </p>

        <div className="actions actions-single ritual-step ritual-step-5">
          <a className="ritual-pressable primary-btn" href="/assessment-entry" onClick={enterRitual} aria-disabled={isEntering}>
            <span>入照心</span>
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>

        <p className="privacy-note ritual-step ritual-step-6">只为省察此心，不为评判对错。</p>
      </div>

      {isEntering ? (
        <div className="home-ritual-transition" role="status" aria-label="照心将启">
          <div className="home-ritual-seal" aria-hidden="true">
            <span>照</span>
          </div>
          <p>此心一照，妄念自明。</p>
        </div>
      ) : null}

      <style jsx>{`
        .sprint8-page {
          --sprint7-rpx: clamp(0.52px, calc(100vw / 750), 0.95px);
          position: relative;
          z-index: 10;
          min-height: 78svh;
          margin-top: clamp(-104px, -12svh, -58px);
          overflow: hidden;
          background: transparent;
          color: #d8d2c3;
        }

        .sprint8-page::before {
          content: "";
          position: absolute;
          z-index: 0;
          inset: 0 0 -18svh;
          background:
            radial-gradient(ellipse at 50% 30%, rgba(70, 67, 55, 0.12), transparent 38%),
            radial-gradient(ellipse at 50% 78%, rgba(112, 94, 45, 0.12), transparent 36%),
            linear-gradient(180deg, rgba(5, 5, 4, 0), rgba(5, 5, 4, 0.2) 46%, rgba(5, 5, 4, 0.08) 74%, rgba(5, 5, 4, 0));
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, transparent 8%, #000 30%, #000 84%, transparent 100%);
          mask-image: linear-gradient(180deg, transparent 0%, transparent 8%, #000 30%, #000 84%, transparent 100%);
          pointer-events: none;
        }

        .bg-glow {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 9999px;
          filter: blur(calc(80 * var(--sprint7-rpx)));
          pointer-events: none;
        }

        .bg-glow-top {
          top: calc(120 * var(--sprint7-rpx));
          width: calc(560 * var(--sprint7-rpx));
          height: calc(320 * var(--sprint7-rpx));
          background: rgba(130, 119, 88, 0.08);
        }

        .bg-glow-bottom {
          bottom: calc(120 * var(--sprint7-rpx));
          width: calc(720 * var(--sprint7-rpx));
          height: calc(420 * var(--sprint7-rpx));
          background: rgba(141, 114, 45, 0.11);
          animation: breathe 5.6s ease-in-out infinite;
        }

        .content {
          position: relative;
          z-index: 2;
          min-height: 78svh;
          box-sizing: border-box;
          max-width: 1040px;
          margin: 0 auto;
          padding: calc(70 * var(--sprint7-rpx)) 28px calc(64 * var(--sprint7-rpx));
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .content-compact {
          justify-content: center;
          min-height: 62svh;
        }

        .top-copy {
          text-align: center;
          margin-top: calc(10 * var(--sprint7-rpx));
        }

        .line {
          display: block;
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: calc(38 * var(--sprint7-rpx));
          line-height: 1.72;
          letter-spacing: calc(4 * var(--sprint7-rpx));
          color: rgba(221, 215, 200, 0.78);
          font-weight: 300;
          font-optical-sizing: auto;
          font-variation-settings: "wght" 360;
        }

        .line-main {
          font-family: var(--font-yangming-hand), var(--font-world), serif;
          font-size: calc(58 * var(--sprint7-rpx));
          line-height: 1.35;
          letter-spacing: calc(7 * var(--sprint7-rpx));
          color: rgba(242, 235, 220, 0.88);
          font-weight: 500;
          font-variation-settings: "wght" 500;
          text-shadow: 0 0 calc(24 * var(--sprint7-rpx)) rgba(216, 183, 111, 0.08);
        }

        .ritual-step {
          opacity: 0;
          filter: blur(8px);
          transform: translateY(calc(14 * var(--sprint7-rpx)));
        }

        .is-ritual-ready .ritual-step {
          animation: ritual-reveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .is-ritual-ready .ritual-step-2 {
          animation-delay: 0ms;
        }

        .is-ritual-ready .ritual-step-3 {
          animation-delay: 1500ms;
        }

        .is-ritual-ready .ritual-step-4 {
          animation-delay: 2500ms;
        }

        .is-ritual-ready .ritual-step-5 {
          animation-delay: 3600ms;
        }

        .is-ritual-ready .ritual-step-6 {
          animation-delay: 4350ms;
        }

        .middle-copy {
          margin-top: calc(120 * var(--sprint7-rpx));
          text-align: center;
        }

        .line.small {
          font-size: calc(34 * var(--sprint7-rpx));
          line-height: 1.9;
          letter-spacing: calc(3 * var(--sprint7-rpx));
          color: rgba(218, 212, 197, 0.68);
        }

        .main-question {
          margin-top: calc(150 * var(--sprint7-rpx));
          text-align: center;
        }

        .question-line {
          display: block;
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: calc(70 * var(--sprint7-rpx));
          line-height: 1.25;
          letter-spacing: calc(8 * var(--sprint7-rpx));
          color: rgba(242, 235, 220, 0.92);
          font-weight: 500;
          font-variation-settings: "wght" 470;
          text-shadow: 0 0 calc(20 * var(--sprint7-rpx)) rgba(255, 246, 218, 0.08);
        }

        .desc {
          width: 100%;
          max-width: calc(680 * var(--sprint7-rpx));
          margin-top: calc(92 * var(--sprint7-rpx));
          text-align: center;
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: calc(31 * var(--sprint7-rpx));
          line-height: 1.75;
          letter-spacing: calc(2 * var(--sprint7-rpx));
          color: rgba(217, 211, 197, 0.66);
          font-variation-settings: "wght" 360;
        }

        .ritual-copy {
          display: block;
        }

        .ritual-copy + .ritual-copy {
          margin-top: calc(22 * var(--sprint7-rpx));
          color: rgba(217, 211, 197, 0.58);
        }

        .content-compact .desc {
          margin-top: calc(44 * var(--sprint7-rpx));
        }

        .actions {
          width: 100%;
          max-width: calc(680 * var(--sprint7-rpx));
          margin-top: calc(76 * var(--sprint7-rpx));
        }

        .actions-single {
          margin-top: calc(54 * var(--sprint7-rpx));
        }

        .privacy-note {
          margin: calc(28 * var(--sprint7-rpx)) 0 0;
          font-family: var(--font-interface), sans-serif;
          font-size: calc(22 * var(--sprint7-rpx));
          line-height: 1.6;
          letter-spacing: calc(1.4 * var(--sprint7-rpx));
          color: rgba(218, 212, 197, 0.42);
          text-align: center;
        }

        .home-ritual-transition {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          align-content: center;
          gap: calc(42 * var(--sprint7-rpx));
          background: rgba(5, 5, 4, 0.96);
          color: rgba(220, 212, 195, 0.68);
          text-align: center;
          backdrop-filter: blur(5px);
          animation: ritual-veil 2200ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .home-ritual-seal {
          position: relative;
          display: grid;
          width: calc(166 * var(--sprint7-rpx));
          height: calc(166 * var(--sprint7-rpx));
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.22);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.12), rgba(255, 255, 255, 0.018) 58%, transparent 72%);
          box-shadow: 0 0 calc(54 * var(--sprint7-rpx)) rgba(180, 157, 93, 0.08);
          animation: ritual-seal-once 2200ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .home-ritual-seal::before {
          content: "";
          position: absolute;
          inset: calc(18 * var(--sprint7-rpx));
          border: 1px dashed rgba(220, 212, 195, 0.12);
          border-radius: inherit;
        }

        .home-ritual-seal::after {
          content: "";
          position: absolute;
          inset: calc(46 * var(--sprint7-rpx));
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.12);
          filter: blur(calc(26 * var(--sprint7-rpx)));
          animation: ritual-lamp-spread 2200ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .home-ritual-seal span {
          position: relative;
          z-index: 2;
          font-family: var(--font-yangming-hand), var(--font-world), serif;
          font-size: calc(72 * var(--sprint7-rpx));
          font-weight: 500;
          letter-spacing: 0;
          font-variation-settings: "wght" 500;
          color: rgba(242, 235, 220, 0.78);
          transform: translateX(calc(1 * var(--sprint7-rpx)));
        }

        .home-ritual-transition p {
          margin: 0;
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: calc(31 * var(--sprint7-rpx));
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: calc(8 * var(--sprint7-rpx));
          opacity: 0;
          animation: ritual-copy-in 2200ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .primary-btn,
        .secondary-btn {
          position: relative;
          width: 100%;
          min-height: calc(88 * var(--sprint7-rpx));
          overflow: hidden;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(22 * var(--sprint7-rpx));
          font-family: var(--font-interface), sans-serif;
          font-size: calc(26 * var(--sprint7-rpx));
          letter-spacing: calc(2 * var(--sprint7-rpx));
          font-weight: 500;
          box-sizing: border-box;
          padding: 0;
          text-decoration: none;
          outline: none;
          isolation: isolate;
          transition:
            transform 420ms ease,
            opacity 420ms ease,
            filter 420ms ease,
            border-color 420ms ease,
            color 420ms ease,
            box-shadow 420ms ease;
        }

        .primary-btn span,
        .secondary-btn span {
          position: relative;
          z-index: 2;
        }

        .primary-btn::before,
        .secondary-btn::before {
          content: "";
          position: absolute;
          z-index: 3;
          top: -52%;
          bottom: -52%;
          left: -44%;
          width: 22%;
          transform: translateX(-180%) skewX(-21deg);
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 246, 205, 0.04) 24%,
            rgba(255, 247, 213, 0.74) 48%,
            rgba(255, 246, 205, 0.08) 70%,
            transparent 100%
          );
          opacity: 0;
          pointer-events: none;
        }

        .primary-btn {
          color: #0c0b08;
          border: calc(1 * var(--sprint7-rpx)) solid rgba(255, 238, 177, 0.28);
          background:
            radial-gradient(circle at 50% -42%, rgba(255, 246, 205, 0.32), transparent 48%),
            linear-gradient(145deg, rgba(255, 246, 205, 0.22), transparent 34%),
            linear-gradient(180deg, #d4b96a 0%, #ad9659 48%, #8e7236 100%);
          box-shadow:
            inset 0 calc(1 * var(--sprint7-rpx)) 0 rgba(255, 255, 255, 0.32),
            inset 0 calc(-18 * var(--sprint7-rpx)) calc(34 * var(--sprint7-rpx)) rgba(74, 47, 7, 0.22),
            0 calc(22 * var(--sprint7-rpx)) calc(46 * var(--sprint7-rpx)) rgba(0, 0, 0, 0.44),
            0 0 0 calc(1 * var(--sprint7-rpx)) rgba(216, 183, 111, 0.12),
            0 0 calc(42 * var(--sprint7-rpx)) rgba(216, 183, 111, 0.12);
          text-shadow: 0 calc(1 * var(--sprint7-rpx)) 0 rgba(255, 246, 205, 0.22);
        }

        .primary-btn::after {
          content: "";
          position: absolute;
          z-index: 1;
          inset: calc(2 * var(--sprint7-rpx));
          border-radius: inherit;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 34%),
            radial-gradient(circle at 50% 100%, rgba(74, 47, 7, 0.14), transparent 52%);
          box-shadow:
            inset 0 calc(1 * var(--sprint7-rpx)) 0 rgba(255, 255, 255, 0.18),
            inset 0 calc(-1 * var(--sprint7-rpx)) 0 rgba(91, 59, 12, 0.34);
          pointer-events: none;
        }

        .secondary-btn {
          margin-top: calc(26 * var(--sprint7-rpx));
          color: rgba(220, 214, 200, 0.72);
          background: rgba(0, 0, 0, 0.18);
          border: calc(2 * var(--sprint7-rpx)) solid rgba(164, 138, 78, 0.22);
          box-shadow:
            inset 0 0 0 calc(1 * var(--sprint7-rpx)) rgba(255, 255, 255, 0.03),
            0 calc(12 * var(--sprint7-rpx)) calc(30 * var(--sprint7-rpx)) rgba(0, 0, 0, 0.42);
        }

        .primary-btn:hover,
        .secondary-btn:hover,
        .primary-btn:focus-visible,
        .secondary-btn:focus-visible {
          transform: translateY(calc(-2 * var(--sprint7-rpx)));
          filter: brightness(1.12);
        }

        .primary-btn:hover,
        .primary-btn:focus-visible {
          color: #070604;
          box-shadow:
            inset 0 calc(1 * var(--sprint7-rpx)) 0 rgba(255, 255, 255, 0.38),
            inset 0 calc(-18 * var(--sprint7-rpx)) calc(34 * var(--sprint7-rpx)) rgba(74, 47, 7, 0.18),
            0 calc(26 * var(--sprint7-rpx)) calc(54 * var(--sprint7-rpx)) rgba(0, 0, 0, 0.5),
            0 0 0 calc(1 * var(--sprint7-rpx)) rgba(216, 183, 111, 0.16),
            0 0 calc(58 * var(--sprint7-rpx)) rgba(216, 183, 111, 0.26);
        }

        .secondary-btn:hover,
        .secondary-btn:focus-visible {
          border-color: rgba(184, 155, 89, 0.38);
          color: rgba(237, 229, 211, 0.9);
          box-shadow:
            inset 0 0 0 calc(1 * var(--sprint7-rpx)) rgba(255, 255, 255, 0.045),
            inset 0 0 30px rgba(150, 124, 63, 0.06),
            0 calc(12 * var(--sprint7-rpx)) calc(30 * var(--sprint7-rpx)) rgba(0, 0, 0, 0.42),
            0 0 28px rgba(151, 124, 61, 0.16);
        }

        .primary-btn:hover::before,
        .secondary-btn:hover::before,
        .primary-btn:focus-visible::before,
        .secondary-btn:focus-visible::before {
          opacity: 1;
          animation: cta-shine 2.2s ease-in-out infinite;
        }

        .primary-btn:focus-visible,
        .secondary-btn:focus-visible {
          outline: 2px solid rgba(216, 183, 111, 0.28);
          outline-offset: 3px;
        }

        .primary-btn:active {
          transform: translateY(calc(2 * var(--sprint7-rpx))) scale(0.985);
          opacity: 0.92;
        }

        .secondary-btn:active {
          transform: scale(0.985);
          opacity: 0.82;
        }

        .arrow {
          font-size: calc(48 * var(--sprint7-rpx));
          line-height: 1;
          transform: translateY(calc(-1 * var(--sprint7-rpx)));
        }

        .secondary-arrow {
          color: rgba(220, 214, 200, 0.72);
        }

        @keyframes breathe {
          0%,
          100% {
            opacity: 0.65;
            transform: translateX(-50%) scale(1);
          }

          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.08);
          }
        }

        @keyframes cta-shine {
          0%,
          34% {
            opacity: 0;
            transform: translateX(-180%) skewX(-21deg);
          }

          45% {
            opacity: 0.78;
          }

          68%,
          100% {
            opacity: 0;
            transform: translateX(620%) skewX(-21deg);
          }
        }

        @keyframes ritual-veil {
          0% {
            opacity: 0;
            background: rgba(5, 5, 4, 0);
          }

          36%,
          100% {
            opacity: 1;
            background: rgba(5, 5, 4, 0.96);
          }
        }

        @keyframes ritual-seal-once {
          0% {
            opacity: 0;
            transform: translateY(calc(10 * var(--sprint7-rpx))) scale(0.94);
          }

          38% {
            opacity: 1;
            transform: translateY(0) scale(1.035);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ritual-lamp-spread {
          0% {
            opacity: 0.34;
            transform: scale(0.72);
          }

          58% {
            opacity: 0.72;
            transform: scale(1.22);
          }

          100% {
            opacity: 0.5;
            transform: scale(1);
          }
        }

        @keyframes ritual-copy-in {
          0%,
          42% {
            opacity: 0;
            filter: blur(6px);
            transform: translateY(calc(8 * var(--sprint7-rpx)));
          }

          72%,
          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes ritual-reveal {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(calc(14 * var(--sprint7-rpx)));
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ritual-step {
            opacity: 1;
            filter: none;
            transform: none;
          }

          .is-ritual-ready .ritual-step {
            animation: none;
          }

          .bg-glow-bottom {
            animation: none;
          }

          .primary-btn:hover::before,
          .secondary-btn:hover::before,
          .primary-btn:focus-visible::before,
          .secondary-btn:focus-visible::before {
            animation: none;
            opacity: 0.28;
            transform: translateX(160%) skewX(-18deg);
          }
        }

        @media (min-width: 720px) {
          .sprint8-page {
            margin-top: clamp(-220px, -12svh, -96px);
            min-height: 100svh;
          }

          .content {
            max-width: 780px;
            min-height: 100svh;
            padding-top: 92px;
            padding-bottom: 88px;
          }

          .content-compact {
            min-height: 68svh;
          }

          .middle-copy {
            margin-top: 72px;
          }

          .main-question {
            margin-top: 94px;
          }

          .desc {
            max-width: 640px;
            margin-top: 54px;
            font-size: 1.18rem;
          }

          .content-compact .desc {
            margin-top: 28px;
          }

          .actions {
            max-width: 420px;
            margin-top: 52px;
          }

          .actions-single {
            margin-top: 34px;
          }

          .privacy-note {
            margin-top: 18px;
            font-size: 0.82rem;
          }

          .primary-btn,
          .secondary-btn {
            min-height: 58px;
            gap: 16px;
            font-size: 1rem;
            letter-spacing: 0.08em;
          }

          .secondary-btn {
            margin-top: 16px;
          }

          .arrow {
            font-size: 2rem;
          }
        }

        @media (max-width: 420px) {
          .content {
            padding-right: 16px;
            padding-left: 16px;
          }
        }
      `}</style>
    </section>
  )
}
