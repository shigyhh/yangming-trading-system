"use client"

import { useId } from "react"

const GOLD = "#c8ab6f"
const GOLD_HI = "#e3d199"
const INK = "#eceae2"
const DIM = "#7f8a85"
const SERIF = '"Source Han Serif SC","Noto Serif SC","Songti SC",serif'

type HeroRightZhaoSealProps = {
  className?: string
  glyphPath?: string | null
  showMotto?: boolean
}

export default function HeroRightZhaoSeal({
  className = "",
  glyphPath = null,
  showMotto = true,
}: HeroRightZhaoSealProps) {
  const uid = useId().replace(/:/g, "")
  const moonId = `${uid}-zs-moon`
  const glintId = `${uid}-zs-glint`
  const grainId = `${uid}-zs-grain`
  const discId = `${uid}-zs-disc`

  return (
    <figure
      className={`hero-right-zhao-seal ${className}`}
      aria-label="心镜照印，观心系统待照一念"
    >
      <div className="zhao-seal-plate" aria-hidden="true">
        <div className="zhao-seal-develop">
          <svg
            viewBox="0 0 440 440"
            width="100%"
            height="100%"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={moonId} cx="50%" cy="44%" r="56%">
                <stop offset="0%" stopColor="rgba(222,236,230,0.30)" />
                <stop offset="42%" stopColor="rgba(120,165,158,0.12)" />
                <stop offset="72%" stopColor="rgba(60,96,92,0.04)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              <linearGradient id={glintId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(220,232,226,0.50)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              <filter id={grainId}>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.82"
                  numOctaves="2"
                  seed="9"
                />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0.80  0 0 0 0 0.83  0 0 0 0 0.75  0 0 0 0.9 0"
                />
              </filter>

              <clipPath id={discId}>
                <circle cx="220" cy="210" r="156" />
              </clipPath>
            </defs>

            <circle cx="220" cy="210" r="156" fill="#0a0e0d" />
            <circle cx="220" cy="210" r="156" fill={`url(#${moonId})`} />

            <g clipPath={`url(#${discId})`}>
              <rect
                x="64"
                y="246"
                width="312"
                height="2"
                fill={`url(#${glintId})`}
                opacity="0.70"
              />
              <rect
                x="219"
                y="246"
                width="2"
                height="120"
                fill={`url(#${glintId})`}
                opacity="0.42"
              />
            </g>

            <g clipPath={`url(#${discId})`}>
              <rect
                className="zhao-seal-grain"
                x="64"
                y="54"
                width="312"
                height="312"
                filter={`url(#${grainId})`}
              />
            </g>

            <circle
              className="zhao-seal-ring"
              cx="220"
              cy="210"
              r="156"
              pathLength="1"
              fill="none"
              stroke={GOLD}
              strokeWidth="1.5"
              opacity="0.85"
            />

            <circle
              className="zhao-seal-ring zhao-seal-ring-soft"
              cx="220"
              cy="210"
              r="165"
              pathLength="1"
              fill="none"
              stroke={GOLD}
              strokeWidth="0.8"
              opacity="0.42"
            />

            <g className="zhao-seal-glyph">
              {glyphPath ? (
                <g transform="translate(140,130) scale(1.6)">
                  <path d={glyphPath} fill={INK} />
                </g>
              ) : (
                <text
                  x="220"
                  y="262"
                  fill={INK}
                  fontFamily={SERIF}
                  fontWeight="600"
                  fontSize="186"
                  letterSpacing="0"
                  textAnchor="middle"
                >
                  照
                </text>
              )}
            </g>

            <circle
              className="zhao-seal-flare"
              cx="220"
              cy="210"
              r="156"
              fill="none"
              stroke={GOLD_HI}
              strokeWidth="2"
              opacity="0"
            />

            <text
              className="zhao-seal-edge"
              x="220"
              y="398"
              fill={DIM}
              fontFamily={SERIF}
              fontSize="13"
              letterSpacing="8"
              textAnchor="middle"
            >
              心 镜 · 照 印
            </text>
          </svg>
        </div>
      </div>

      <figcaption className="zhao-seal-caption">
        <div className="zhao-seal-wordmark">照　见</div>

        <div className="zhao-seal-status">
          <span className="zhao-seal-status-dot" />
          <span>观心系统 · 待照一念</span>
        </div>

        {showMotto ? (
          <div className="zhao-seal-motto">一念入镜 · 方可落印</div>
        ) : null}
      </figcaption>

      <style jsx>{`
        .hero-right-zhao-seal {
          width: min(36vw, 420px);
          min-width: 280px;
          max-width: 420px;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          font-family: ${SERIF};
          color: ${INK};
          pointer-events: none;
          user-select: none;
        }

        .zhao-seal-plate {
          width: 100%;
          aspect-ratio: 1 / 1;
          filter: drop-shadow(0 0 95px rgba(120, 165, 158, 0.10));
        }

        .zhao-seal-develop {
          width: 100%;
          height: 100%;
          animation: zhao-seal-breathe 7s ease-in-out 2.4s infinite;
        }

        .zhao-seal-grain {
          animation: zhao-seal-grainout 1.5s ease forwards;
        }

        .zhao-seal-ring {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: zhao-seal-draw 1.4s cubic-bezier(0.5, 0, 0.2, 1) 0.15s forwards;
        }

        .zhao-seal-ring-soft {
          animation-delay: 0.35s;
        }

        .zhao-seal-glyph {
          opacity: 0;
          filter: blur(10px);
          transform: scale(1.08);
          transform-origin: 220px 210px;
          animation: zhao-seal-surface 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.7s forwards;
        }

        .zhao-seal-edge {
          opacity: 0;
          animation: zhao-seal-fade 1s ease 1.7s forwards;
        }

        .zhao-seal-flare {
          animation: zhao-seal-flare 1.4s ease 1.6s;
        }

        .zhao-seal-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }

        .zhao-seal-wordmark {
          font-size: 25px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: rgba(241, 239, 232, 0.86);
          opacity: 0;
          animation: zhao-seal-fade 1.2s ease 1.9s forwards;
        }

        .zhao-seal-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 0.12em;
          font-size: 12px;
          letter-spacing: 0.24em;
          color: rgba(200, 171, 111, 0.68);
          white-space: nowrap;
          opacity: 0;
          animation: zhao-seal-fade 1.2s ease 2.05s forwards;
        }

        .zhao-seal-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: ${GOLD};
          box-shadow: 0 0 8px ${GOLD};
          display: inline-block;
          animation: zhao-seal-blink 2.4s ease-in-out infinite;
        }

        .zhao-seal-motto {
          font-size: 12px;
          letter-spacing: 0.2em;
          color: rgba(236, 234, 226, 0.36);
          opacity: 0;
          animation: zhao-seal-fade 1.2s ease 2.2s forwards;
        }

        @keyframes zhao-seal-grainout {
          from {
            opacity: 0.9;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes zhao-seal-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes zhao-seal-surface {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: scale(1.08);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: scale(1);
          }
        }

        @keyframes zhao-seal-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zhao-seal-flare {
          0% {
            opacity: 0;
          }
          30% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes zhao-seal-breathe {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.94;
          }
        }

        @keyframes zhao-seal-blink {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 1024px) {
          .hero-right-zhao-seal {
            width: min(32vw, 340px);
            min-width: 240px;
          }
        }

        @media (max-width: 767px) {
          .hero-right-zhao-seal {
            width: clamp(96px, 28vw, 140px);
            min-width: 96px;
            max-width: 140px;
            opacity: 0.28;
          }

          .zhao-seal-caption {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zhao-seal-develop,
          .zhao-seal-grain,
          .zhao-seal-ring,
          .zhao-seal-glyph,
          .zhao-seal-edge,
          .zhao-seal-flare,
          .zhao-seal-wordmark,
          .zhao-seal-status,
          .zhao-seal-status-dot,
          .zhao-seal-motto {
            animation: none !important;
          }

          .zhao-seal-grain {
            opacity: 0;
          }

          .zhao-seal-ring {
            stroke-dashoffset: 0;
          }

          .zhao-seal-glyph {
            opacity: 1;
            filter: none;
            transform: none;
          }

          .zhao-seal-edge,
          .zhao-seal-wordmark,
          .zhao-seal-status,
          .zhao-seal-motto {
            opacity: 1;
          }
        }
      `}</style>
    </figure>
  )
}
