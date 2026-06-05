"use client"

import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { getBrandMotionByCharacter } from "@yangming/content/brand-character-system"

export type YangmingCharacterTier = "anchor" | "method" | "boundary"
type YangmingCharacterSize = "sm" | "md" | "lg"

type YangmingCharacterMarkProps = HTMLAttributes<HTMLDivElement> & {
  character: string
  decorative?: boolean
  label?: string
  motion?: "none" | "system"
  roleText?: string
  size?: YangmingCharacterSize
  tier: YangmingCharacterTier
}

export function YangmingCharacterMark({
  character,
  className,
  decorative = false,
  label,
  motion = "system",
  roleText,
  size = "md",
  tier,
  ...props
}: YangmingCharacterMarkProps) {
  const accessibleLabel = label || `${character}字${roleText ? `，${roleText}` : ""}`
  const motionDefinition = motion === "system" ? getBrandMotionByCharacter(character) : null
  const accessibilityProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": accessibleLabel } as const)

  return (
    <div
      className={cn(
        "yangming-character-mark",
        `tier-${tier}`,
        `size-${size}`,
        motionDefinition?.className,
        className,
      )}
      data-motion-key={motionDefinition?.key}
      data-motion-label={motionDefinition?.motion}
      {...accessibilityProps}
      {...props}
    >
      <span className="character-grid" aria-hidden="true" />
      <span className="character-stroke stroke-top" aria-hidden="true" />
      <span className="character-stroke stroke-bottom" aria-hidden="true" />
      <span className="character-main" aria-hidden="true">{character}</span>
      {roleText ? <span className="character-role">{roleText}</span> : null}
      <style jsx>{`
        .yangming-character-mark {
          --character-size: 4.8rem;
          --character-color: rgba(216, 183, 111, 0.76);
          --character-border: rgba(216, 183, 111, 0.2);
          --character-field: rgba(216, 183, 111, 0.045);
          position: relative;
          isolation: isolate;
          display: grid;
          width: var(--character-size);
          min-height: var(--character-size);
          place-items: center;
          overflow: hidden;
          border: 1px solid var(--character-border);
          border-radius: 8px;
          background:
            radial-gradient(circle at 50% 34%, var(--character-field), transparent 64%),
            rgba(255, 255, 255, 0.018);
          color: var(--character-color);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .tier-method {
          --character-color: rgba(95, 132, 117, 0.82);
          --character-border: rgba(95, 132, 117, 0.22);
          --character-field: rgba(95, 132, 117, 0.055);
        }

        .tier-boundary {
          --character-color: rgba(182, 91, 68, 0.82);
          --character-border: rgba(120, 60, 45, 0.26);
          --character-field: rgba(120, 60, 45, 0.055);
        }

        .size-sm {
          --character-size: 3.1rem;
        }

        .size-md {
          --character-size: 4.8rem;
        }

        .size-lg {
          --character-size: 6.6rem;
        }

        .character-grid {
          position: absolute;
          inset: 0;
          z-index: -1;
          background-image:
            linear-gradient(var(--character-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--character-border) 1px, transparent 1px);
          background-size: 50% 50%;
          opacity: 0.22;
          mask-image: radial-gradient(circle, black, transparent 72%);
        }

        .character-stroke {
          position: absolute;
          left: 18%;
          right: 18%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--character-color), transparent);
          opacity: 0.36;
        }

        .stroke-top {
          top: 25%;
        }

        .stroke-bottom {
          bottom: 24%;
        }

        .character-main {
          display: block;
          margin-top: ${roleText ? "-0.28rem" : "0"};
          font-family: var(--font-yangming-title), var(--font-narrative), serif;
          font-size: calc(var(--character-size) * 0.48);
          font-weight: 360;
          line-height: 1;
          letter-spacing: 0;
          color: color-mix(in srgb, var(--character-color), rgba(244, 235, 221, 0.72) 22%);
          text-shadow: 0 0 18px color-mix(in srgb, var(--character-color), transparent 88%);
        }

        .size-sm .character-main {
          font-size: calc(var(--character-size) * 0.5);
        }

        .character-role {
          position: absolute;
          left: 50%;
          bottom: 0.62rem;
          transform: translateX(-50%);
          white-space: nowrap;
          font-family: var(--font-function);
          font-size: 0.58rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.44);
        }

        .motion-xin-gather .character-main {
          animation: motion-xin-gather 6.4s ease-in-out infinite;
        }

        .motion-zhi-reveal .character-stroke {
          animation: motion-zhi-reveal 6.8s ease-in-out infinite;
        }

        .motion-xing-settle .character-main {
          animation: motion-xing-settle 7.2s ease-in-out infinite;
        }

        .motion-zhi-pause {
          animation: motion-zhi-pause 7.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .motion-zheng-stamp {
          animation: motion-zheng-stamp 7s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .motion-fu-loop .character-grid {
          animation: motion-fu-loop 12s linear infinite;
        }

        .motion-lian-sediment .character-main {
          animation: motion-lian-sediment 8.4s ease-in-out infinite;
        }

        .motion-jie-contain {
          animation: motion-jie-contain 8s ease-in-out infinite;
        }

        @keyframes motion-xin-gather {
          0%,
          100% {
            transform: scale(1);
            filter: blur(0);
            opacity: 0.86;
          }

          50% {
            transform: scale(1.018);
            filter: blur(0.35px);
            opacity: 1;
          }
        }

        @keyframes motion-zhi-reveal {
          0%,
          100% {
            opacity: 0.24;
          }

          45%,
          58% {
            opacity: 0.58;
          }
        }

        @keyframes motion-xing-settle {
          0%,
          100% {
            transform: translateY(-1px);
          }

          48%,
          60% {
            transform: translateY(1px);
          }
        }

        @keyframes motion-zhi-pause {
          0%,
          36%,
          100% {
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          }

          44%,
          62% {
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 0 0 1px color-mix(in srgb, var(--character-color), transparent 84%);
          }
        }

        @keyframes motion-zheng-stamp {
          0%,
          100% {
            border-color: var(--character-border);
          }

          52% {
            border-color: color-mix(in srgb, var(--character-color), rgba(244, 235, 221, 0.42) 18%);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.04),
              0 0 18px color-mix(in srgb, var(--character-color), transparent 88%);
          }
        }

        @keyframes motion-fu-loop {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes motion-lian-sediment {
          0%,
          100% {
            transform: translateY(-1px);
            opacity: 0.9;
          }

          50% {
            transform: translateY(2px);
            opacity: 1;
          }
        }

        @keyframes motion-jie-contain {
          0%,
          100% {
            outline: 0 solid color-mix(in srgb, var(--character-color), transparent 100%);
          }

          50% {
            outline: 1px solid color-mix(in srgb, var(--character-color), transparent 82%);
            outline-offset: -5px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .yangming-character-mark,
          .yangming-character-mark * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
