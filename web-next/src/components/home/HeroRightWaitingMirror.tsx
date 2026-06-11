"use client"

import { useId } from "react"

const GOLD = "#c8ab6f"
const INK = "#f1efe8"
const SERIF = '"Source Han Serif SC","Noto Serif SC","Songti SC",serif'

type HeroRightWaitingMirrorProps = {
  className?: string
}

export default function HeroRightWaitingMirror({ className = "" }: HeroRightWaitingMirrorProps) {
  const uid = useId().replace(/:/g, "")
  const poolId = `${uid}-waiting-pool`
  const glintId = `${uid}-waiting-glint`
  const grainId = `${uid}-waiting-grain`
  const discId = `${uid}-waiting-disc`
  const veilId = `${uid}-waiting-veil`

  return (
    <figure
      className={`hero-right-waiting-mirror ${className}`}
      aria-label="待照心镜，观心系统待照一念"
    >
      <div className="waiting-mirror-plate" aria-hidden="true">
        <svg
          viewBox="0 0 360 360"
          width="100%"
          height="100%"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={poolId} cx="50%" cy="43%" r="58%">
              <stop offset="0%" stopColor="rgba(218,232,226,0.20)" />
              <stop offset="44%" stopColor="rgba(108,156,148,0.10)" />
              <stop offset="74%" stopColor="rgba(50,86,82,0.035)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <linearGradient id={glintId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(214,228,222,0.42)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <linearGradient id={veilId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="46%" stopColor="rgba(214,228,222,0.30)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <filter id={grainId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" seed="7" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.76  0 0 0 0 0.82  0 0 0 0 0.76  0 0 0 0.58 0"
              />
            </filter>

            <clipPath id={discId}>
              <circle cx="180" cy="178" r="148" />
            </clipPath>
          </defs>

          <circle cx="180" cy="178" r="148" fill="#0a0e0d" />
          <circle cx="180" cy="178" r="148" fill={`url(#${poolId})`} />

          <g clipPath={`url(#${discId})`}>
            <rect
              className="waiting-mirror-grain"
              x="32"
              y="30"
              width="296"
              height="296"
              filter={`url(#${grainId})`}
            />
            <rect
              x="40"
              y="204"
              width="280"
              height="1.5"
              fill={`url(#${glintId})`}
              opacity="0.62"
            />
            <rect
              className="waiting-mirror-light-column"
              x="179"
              y="204"
              width="2"
              height="116"
              fill={`url(#${veilId})`}
              opacity="0.42"
            />
          </g>

          <circle
            className="waiting-mirror-ring"
            cx="180"
            cy="178"
            r="148"
            fill="none"
            stroke={GOLD}
            strokeWidth="1"
            opacity="0.50"
          />
          <circle
            className="waiting-mirror-ring-soft"
            cx="180"
            cy="178"
            r="156"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.6"
            opacity="0.24"
          />

          <text
            className="waiting-mirror-words"
            x="180"
            y="172"
            fill={INK}
            fontFamily={SERIF}
            fontSize="18"
            letterSpacing="16"
            textAnchor="middle"
          >
            待 照
          </text>
        </svg>
      </div>

      <figcaption className="waiting-mirror-caption">
        <span className="waiting-mirror-dot" />
        <span>观心系统 · 待照一念</span>
      </figcaption>

      <style jsx>{`
        .hero-right-waiting-mirror {
          width: clamp(280px, 26vw, 340px);
          max-width: 340px;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          color: ${INK};
          font-family: ${SERIF};
          pointer-events: none;
          user-select: none;
        }

        .waiting-mirror-plate {
          width: 100%;
          aspect-ratio: 1 / 1;
          filter: drop-shadow(0 0 86px rgba(108, 156, 148, 0.12));
          animation: waiting-mirror-breathe 7.5s ease-in-out infinite;
        }

        .waiting-mirror-grain {
          opacity: 0.1;
          mix-blend-mode: screen;
        }

        .waiting-mirror-light-column {
          animation: waiting-mirror-column 7.5s ease-in-out infinite;
        }

        .waiting-mirror-ring,
        .waiting-mirror-ring-soft {
          transform-origin: 180px 178px;
          animation: waiting-mirror-ring 8s ease-in-out infinite;
        }

        .waiting-mirror-ring-soft {
          animation-delay: -2s;
        }

        .waiting-mirror-words {
          opacity: 0.2;
          filter: blur(0.2px);
          animation: waiting-mirror-words 7.5s ease-in-out infinite;
        }

        .waiting-mirror-caption {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding-left: 0.12em;
          color: rgba(200, 171, 111, 0.66);
          font-size: 12px;
          line-height: 1.5;
          letter-spacing: 0.24em;
          white-space: nowrap;
        }

        .waiting-mirror-dot {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: ${GOLD};
          box-shadow: 0 0 8px ${GOLD};
          opacity: 0.58;
          animation: waiting-mirror-dot 2.8s ease-in-out infinite;
        }

        @keyframes waiting-mirror-breathe {
          0%,
          100% {
            opacity: 0.84;
            transform: translateY(0);
          }

          50% {
            opacity: 0.96;
            transform: translateY(-3px);
          }
        }

        @keyframes waiting-mirror-column {
          0%,
          100% {
            opacity: 0.28;
          }

          50% {
            opacity: 0.52;
          }
        }

        @keyframes waiting-mirror-ring {
          0%,
          100% {
            opacity: 0.38;
          }

          50% {
            opacity: 0.56;
          }
        }

        @keyframes waiting-mirror-words {
          0%,
          100% {
            opacity: 0.14;
          }

          50% {
            opacity: 0.28;
          }
        }

        @keyframes waiting-mirror-dot {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.92;
          }
        }

        @media (max-width: 1024px) {
          .hero-right-waiting-mirror {
            width: clamp(220px, 28vw, 280px);
          }
        }

        @media (max-width: 767px) {
          .hero-right-waiting-mirror {
            width: clamp(96px, 28vw, 140px);
            opacity: 0.28;
          }

          .waiting-mirror-caption {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .waiting-mirror-plate,
          .waiting-mirror-light-column,
          .waiting-mirror-ring,
          .waiting-mirror-ring-soft,
          .waiting-mirror-words,
          .waiting-mirror-dot {
            animation: none !important;
          }
        }
      `}</style>
    </figure>
  )
}
