"use client"

import type { CSSProperties } from "react"
import { YangmingC16Mark } from "@/components/brand/yangming-mark"
import { YangmingZhaoSeal } from "@/components/brand/yangming-zhao-seal"

const stampSteps = [
  { label: "已照见", note: "报告生成", delay: "1150ms", tone: "gold", rotation: "-9deg" },
  { label: "已存档", note: "保存报告", delay: "2500ms", tone: "cinnabar", rotation: "7deg" },
  { label: "待事上练", note: "七日训练", delay: "3850ms", tone: "ink", rotation: "-4deg" },
] as const

export default function ZhaoSealVideoMaterialPage() {
  return (
    <main className="zhao-video-page" aria-label="照字印章短视频素材">
      <section className="video-stage">
        <div className="ink-field" aria-hidden="true" />
        <div className="gold-thread thread-one" aria-hidden="true" />
        <div className="gold-thread thread-two" aria-hidden="true" />
        <div className="mountain-line mountain-one" aria-hidden="true" />
        <div className="mountain-line mountain-two" aria-hidden="true" />

        <div className="stage-top">
          <span className="brand-mark">
            <YangmingC16Mark className="size-8" title="阳明照见短视频小标" />
          </span>
          <div>
            <p>阳明心学交易系统</p>
            <span>YANGMING MIND MIRROR</span>
          </div>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">STAMP OF AWARENESS</p>
          <h1>完成一念，盖一枚照。</h1>
          <p className="subline">每一次看见、保存、训练，都是把反应模式落成证据。</p>
        </div>

        <div className="seal-orbit" aria-hidden="true">
          <div className="orbit-ring ring-a" />
          <div className="orbit-ring ring-b" />
          <div className="center-art-zhao">
            <YangmingZhaoSeal
              className="center-art-mark"
              size="hero"
              title="阳明照见艺术字水印"
              style={
                {
                  "--zhao-seal-color": "rgba(216, 183, 111, 0.2)",
                  "--zhao-seal-border": "rgba(216, 183, 111, 0.18)",
                  "--zhao-seal-glow": "rgba(216, 183, 111, 0.035)",
                } as CSSProperties
              }
            />
          </div>
          <div className="pressing-art-seal">
            <YangmingZhaoSeal
              className="pressing-art-mark"
              size="hero"
              title="阳明照见盖印艺术字"
              style={
                {
                  "--zhao-seal-color": "rgba(216, 183, 111, 0.62)",
                  "--zhao-seal-border": "rgba(216, 183, 111, 0.3)",
                  "--zhao-seal-glow": "rgba(216, 183, 111, 0.08)",
                } as CSSProperties
              }
            />
          </div>
          <div className="press-impact-ring" />
        </div>

        <div className="stamp-stack" aria-label="照字盖印节奏">
          {stampSteps.map((step) => (
            <div
              key={step.label}
              className={`stamp-card ${step.tone}`}
              style={{ "--stamp-delay": step.delay, "--stamp-rotation": step.rotation } as CSSProperties}
            >
              <span className="stamp-zhao">
                <YangmingZhaoSeal
                  className="stamp-art-mark"
                  size="hero"
                  tone={step.tone}
                  title={`${step.label}照字艺术印`}
                />
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.note}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="video-compliance">
          本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。
        </p>
      </section>

      <style jsx>{`
        .zhao-video-page {
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 4%, rgba(216, 183, 111, 0.14), transparent 34rem),
            radial-gradient(circle at 90% 72%, rgba(95, 132, 117, 0.13), transparent 28rem),
            #080807;
          padding: 12px;
          color: #f4ebdd;
        }

        .video-stage {
          position: relative;
          isolation: isolate;
          width: min(calc(100vw - 24px), calc((100svh - 24px) * 9 / 16), 486px);
          aspect-ratio: 9 / 16;
          overflow: hidden;
          border: 1px solid rgba(217, 189, 122, 0.18);
          border-radius: 8px;
          background:
            radial-gradient(circle at 50% 16%, rgba(216, 183, 111, 0.14), transparent 17rem),
            radial-gradient(circle at 12% 86%, rgba(95, 132, 117, 0.13), transparent 18rem),
            linear-gradient(180deg, rgba(17, 16, 13, 0.98), rgba(8, 8, 7, 0.99));
          box-shadow:
            0 28px 90px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: video-stage-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ink-field {
          position: absolute;
          inset: 0;
          z-index: -3;
          opacity: 0.42;
          background-image:
            linear-gradient(rgba(216, 183, 111, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 183, 111, 0.018) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: radial-gradient(circle at 50% 38%, black, transparent 78%);
        }

        .gold-thread {
          position: absolute;
          z-index: -2;
          height: 1px;
          width: 72%;
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.22), transparent);
          filter: blur(0.2px);
          opacity: 0;
          animation: gold-thread-sweep 6.4s ease-in-out infinite;
        }

        .thread-one {
          left: -18%;
          top: 24%;
        }

        .thread-two {
          right: -24%;
          bottom: 24%;
          animation-delay: 2.2s;
        }

        .mountain-line {
          position: absolute;
          left: 8%;
          right: 8%;
          z-index: -2;
          height: 22%;
          border: 1px solid rgba(216, 183, 111, 0.06);
          border-color: rgba(216, 183, 111, 0.065) transparent transparent;
          border-radius: 50%;
          opacity: 0.58;
        }

        .mountain-one {
          top: 34%;
          transform: rotate(-6deg);
        }

        .mountain-two {
          bottom: 16%;
          transform: rotate(8deg) scaleX(1.18);
        }

        .stage-top {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 0.72rem;
          padding: 1.35rem 1.25rem 0;
          animation: text-rise 780ms 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .brand-mark {
          display: grid;
          width: 2.8rem;
          height: 2.8rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.22);
          border-radius: 8px;
          color: rgba(216, 183, 111, 0.82);
          background: rgba(255, 255, 255, 0.035);
        }

        .stage-top p,
        .stage-top span {
          margin: 0;
          display: block;
          font-family: var(--font-function);
          font-weight: 700;
          letter-spacing: 0.16em;
        }

        .stage-top p {
          font-size: 0.72rem;
          color: rgba(244, 235, 221, 0.74);
        }

        .stage-top span {
          margin-top: 0.28rem;
          font-size: 0.58rem;
          color: rgba(216, 183, 111, 0.56);
        }

        .hero-copy {
          position: relative;
          z-index: 3;
          padding: 3.2rem 1.35rem 0;
        }

        .eyebrow {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(216, 183, 111, 0.62);
          animation: text-rise 780ms 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        h1 {
          max-width: 8.2em;
          margin: 0.8rem 0 0;
          font-family: var(--font-narrative);
          font-size: clamp(2.05rem, 9vw, 3.45rem);
          font-weight: 300;
          line-height: 1.22;
          letter-spacing: 0.06em;
          color: rgba(244, 235, 221, 0.94);
          text-shadow: 0 0 34px rgba(216, 183, 111, 0.08);
          animation: text-rise 900ms 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .subline {
          max-width: 16rem;
          margin: 0.9rem 0 0;
          font-family: var(--font-story);
          font-size: 0.82rem;
          font-weight: 300;
          line-height: 1.72;
          letter-spacing: 0.045em;
          color: rgba(220, 212, 195, 0.62);
          animation: text-rise 900ms 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .seal-orbit {
          position: absolute;
          right: -7%;
          top: 31%;
          z-index: 1;
          width: 70%;
          aspect-ratio: 1;
          opacity: 0.82;
        }

        .orbit-ring {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: 50%;
          box-shadow: inset 0 0 68px rgba(0, 0, 0, 0.32);
          animation: orbit-breathe 7s ease-in-out infinite;
        }

        .ring-b {
          inset: 15%;
          border-color: rgba(95, 132, 117, 0.14);
          animation-delay: 1.2s;
        }

        .center-art-zhao,
        .pressing-art-seal {
          position: absolute;
          display: grid;
          place-items: center;
          border: 1px solid rgba(216, 183, 111, 0.24);
          border-radius: 50%;
        }

        .center-art-zhao {
          inset: 23%;
          color: rgba(216, 183, 111, 0.12);
          opacity: 0.64;
          animation: center-art-breathe 5.8s 2100ms ease-in-out infinite;
        }

        .pressing-art-seal {
          inset: 18%;
          z-index: 2;
          color: rgba(216, 183, 111, 0.52);
          background:
            radial-gradient(circle, rgba(216, 183, 111, 0.07), transparent 62%),
            rgba(8, 8, 7, 0.04);
          box-shadow:
            inset 0 0 0 2px rgba(216, 183, 111, 0.08),
            0 0 46px rgba(216, 183, 111, 0.08);
          opacity: 0;
          transform: translateY(-34px) scale(1.32) rotate(-4deg);
          animation: seal-press-down 1180ms 1320ms cubic-bezier(0.16, 0.86, 0.22, 1) forwards;
        }

        .press-impact-ring {
          position: absolute;
          inset: 13%;
          z-index: 1;
          border: 1px solid rgba(216, 183, 111, 0.3);
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.72);
          animation: stamp-press-ring 720ms 1980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        :global(.center-art-mark),
        :global(.pressing-art-mark) {
          width: 70%;
          height: 70%;
        }

        :global(.stamp-art-mark) {
          width: 78%;
          height: 78%;
        }

        .stamp-stack {
          position: absolute;
          left: 1.25rem;
          right: 1.25rem;
          bottom: 3.75rem;
          z-index: 4;
          display: grid;
          gap: 0.52rem;
        }

        .stamp-card {
          --stamp-color: rgba(216, 183, 111, 0.82);
          --stamp-border: rgba(216, 183, 111, 0.34);
          display: flex;
          align-items: center;
          gap: 0.56rem;
          min-height: 3.2rem;
          border: 1px solid var(--stamp-border);
          border-radius: 8px;
          background:
            radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--stamp-color), transparent 88%), transparent 6rem),
            rgba(255, 255, 255, 0.028);
          padding: 0.52rem;
          opacity: 0;
          transform: translateY(18px) scale(0.96);
          animation: stamp-card-reveal 620ms var(--stamp-delay) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .stamp-card.cinnabar {
          --stamp-color: rgba(182, 91, 68, 0.82);
          --stamp-border: rgba(120, 60, 45, 0.44);
        }

        .stamp-card.ink {
          --stamp-color: rgba(95, 132, 117, 0.78);
          --stamp-border: rgba(95, 132, 117, 0.34);
        }

        .stamp-zhao {
          display: grid;
          width: 2.15rem;
          height: 2.15rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--stamp-border);
          border-radius: 50%;
          color: var(--stamp-color);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--stamp-color), transparent 90%);
          opacity: 0;
          transform: translateY(-1.35rem) scale(1.34) rotate(var(--stamp-rotation));
          animation: stamp-press-down 680ms calc(var(--stamp-delay) + 220ms) cubic-bezier(0.16, 0.86, 0.22, 1) forwards;
        }

        .stamp-card strong,
        .stamp-card p {
          margin: 0;
          font-family: var(--font-function);
        }

        .stamp-card strong {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: rgba(244, 235, 221, 0.82);
        }

        .stamp-card p {
          margin-top: 0.16rem;
          font-size: 0.64rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.45);
        }

        .video-compliance {
          position: absolute;
          left: 1.2rem;
          right: 1.2rem;
          bottom: 1.1rem;
          z-index: 4;
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.52rem;
          line-height: 1.65;
          letter-spacing: 0.05em;
          color: rgba(220, 212, 195, 0.36);
          animation: text-rise 900ms 4700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes video-stage-in {
          from {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes text-rise {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes orbit-breathe {
          0%,
          100% {
            opacity: 0.46;
            transform: scale(0.992);
          }

          50% {
            opacity: 0.82;
            transform: scale(1.015);
          }
        }

        @keyframes seal-press-down {
          0% {
            opacity: 0;
            filter: blur(7px);
            transform: translateY(-42px) scale(1.34) rotate(-4deg);
          }

          34% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(-18px) scale(1.18) rotate(-2deg);
          }

          58% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(3px) scale(0.88) rotate(0deg);
          }

          74% {
            opacity: 0.86;
            transform: translateY(-1px) scale(1.03) rotate(0deg);
          }

          100% {
            opacity: 0.82;
            filter: blur(0);
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        @keyframes stamp-press-ring {
          0% {
            opacity: 0;
            transform: scale(0.74);
          }

          36% {
            opacity: 0.62;
            transform: scale(0.92);
          }

          100% {
            opacity: 0;
            transform: scale(1.18);
          }
        }

        @keyframes center-art-breathe {
          0%,
          100% {
            opacity: 0.58;
            transform: scale(0.992);
          }

          50% {
            opacity: 0.76;
            transform: scale(1.015);
          }
        }

        @keyframes stamp-card-reveal {
          0% {
            opacity: 0;
            filter: blur(6px);
            transform: translateY(12px);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes stamp-press-down {
          0% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(-1.35rem) scale(1.34) rotate(var(--stamp-rotation));
          }

          58% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0.12rem) scale(0.82) rotate(var(--stamp-rotation));
          }

          76% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(-0.04rem) scale(1.05) rotate(var(--stamp-rotation));
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1) rotate(var(--stamp-rotation));
          }
        }

        @keyframes gold-thread-sweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          40% {
            opacity: 0.52;
          }

          64% {
            opacity: 0;
            transform: translateX(48%);
          }
        }

        @media (max-width: 390px) {
          .hero-copy {
            padding-top: 2.7rem;
          }

          .stamp-stack {
            bottom: 3.55rem;
          }

          h1 {
            font-size: clamp(2.1rem, 10vw, 3.4rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .video-stage,
          .stage-top,
          .eyebrow,
          h1,
          .subline,
          .center-art-zhao,
          .pressing-art-seal,
          .press-impact-ring,
          .stamp-card,
          .stamp-zhao,
          .video-compliance,
          .orbit-ring,
          .gold-thread {
            animation: none;
            opacity: 1;
            filter: none;
            transform: none;
          }
        }
      `}</style>
    </main>
  )
}
