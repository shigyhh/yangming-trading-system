"use client"

import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { getBrandMotionByCharacter } from "@yangming/content/brand-character-system"

import { YangmingA1Mark } from "./yangming-mark"

type ZhaoSealTone = "gold" | "cinnabar" | "ink"
type ZhaoSealSize = "xs" | "sm" | "md" | "lg" | "hero"

type YangmingZhaoSealProps = HTMLAttributes<HTMLDivElement> & {
  decorative?: boolean
  label?: string
  motion?: "none" | "system"
  showLabel?: boolean
  size?: ZhaoSealSize
  title?: string
  tone?: ZhaoSealTone
}

export function YangmingZhaoSeal({
  className,
  decorative = false,
  label,
  motion = "system",
  showLabel = false,
  size = "md",
  title,
  tone = "gold",
  ...props
}: YangmingZhaoSealProps) {
  const accessibleTitle = title || (label ? `${label}照字艺术印` : "阳明照见主照印")
  const motionDefinition = motion === "system" ? getBrandMotionByCharacter("照") : null
  const accessibilityProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": accessibleTitle } as const)

  return (
    <div
      className={cn("yangming-zhao-seal", `tone-${tone}`, `size-${size}`, motionDefinition?.className, className)}
      data-motion-key={motionDefinition?.key}
      data-motion-label={motionDefinition?.motion}
      {...accessibilityProps}
      {...props}
    >
      <span className="seal-ring outer" aria-hidden="true" />
      <span className="seal-ring inner" aria-hidden="true" />
      <YangmingA1Mark
        className="zhao-art-mark"
        title={accessibleTitle}
        role="presentation"
        aria-hidden="true"
      />
      {showLabel && label ? <span className="zhao-seal-label">{label}</span> : null}
      <style jsx>{`
        .yangming-zhao-seal {
          --zhao-seal-size: 5.4rem;
          --zhao-seal-color: rgba(216, 183, 111, 0.78);
          --zhao-seal-border: rgba(216, 183, 111, 0.42);
          --zhao-seal-glow: rgba(216, 183, 111, 0.07);
          position: relative;
          display: grid;
          width: var(--zhao-seal-size);
          height: var(--zhao-seal-size);
          flex: 0 0 auto;
          place-items: center;
          border-radius: 50%;
          color: var(--zhao-seal-color);
          background:
            radial-gradient(circle, color-mix(in srgb, var(--zhao-seal-color), transparent 90%), transparent 63%),
            rgba(8, 8, 7, 0.08);
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--zhao-seal-color), transparent 88%),
            inset 0 0 34px var(--zhao-seal-glow);
          mix-blend-mode: screen;
        }

        .tone-cinnabar {
          --zhao-seal-color: rgba(182, 91, 68, 0.82);
          --zhao-seal-border: rgba(120, 60, 45, 0.62);
          --zhao-seal-glow: rgba(120, 60, 45, 0.08);
        }

        .tone-ink {
          --zhao-seal-color: rgba(95, 132, 117, 0.78);
          --zhao-seal-border: rgba(95, 132, 117, 0.4);
          --zhao-seal-glow: rgba(95, 132, 117, 0.07);
        }

        .size-xs {
          --zhao-seal-size: 2.1rem;
        }

        .size-sm {
          --zhao-seal-size: 2.8rem;
        }

        .size-md {
          --zhao-seal-size: 5.4rem;
        }

        .size-lg {
          --zhao-seal-size: 9.2rem;
        }

        .size-hero {
          --zhao-seal-size: 100%;
        }

        .seal-ring {
          position: absolute;
          inset: 0;
          border: 1px solid var(--zhao-seal-border);
          border-radius: 50%;
          opacity: 0.9;
          pointer-events: none;
        }

        .seal-ring.inner {
          inset: 11%;
          opacity: 0.42;
        }

        :global(.zhao-art-mark) {
          width: 68%;
          height: 68%;
        }

        .size-xs :global(.zhao-art-mark),
        .size-sm :global(.zhao-art-mark) {
          width: 72%;
          height: 72%;
        }

        .zhao-seal-label {
          position: absolute;
          left: 50%;
          bottom: 11%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-family: var(--font-function);
          font-size: max(0.56rem, calc(var(--zhao-seal-size) * 0.115));
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.14em;
          color: color-mix(in srgb, var(--zhao-seal-color), rgba(244, 235, 221, 0.58) 22%);
        }

        .motion-zhao-stamp .seal-ring.outer {
          animation: motion-zhao-stamp-ring 7.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .motion-zhao-stamp :global(.zhao-art-mark) {
          animation: motion-zhao-stamp-mark 7.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes motion-zhao-stamp-ring {
          0%,
          38%,
          100% {
            opacity: 0.56;
            box-shadow: none;
          }

          48%,
          58% {
            opacity: 1;
            box-shadow: 0 0 22px color-mix(in srgb, var(--zhao-seal-color), transparent 88%);
          }
        }

        @keyframes motion-zhao-stamp-mark {
          0%,
          40%,
          100% {
            filter: drop-shadow(0 0 0 transparent);
            opacity: 0.9;
          }

          52% {
            filter: drop-shadow(0 0 14px color-mix(in srgb, var(--zhao-seal-color), transparent 82%));
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .yangming-zhao-seal,
          .yangming-zhao-seal * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
