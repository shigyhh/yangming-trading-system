"use client"

import { useEffect } from "react"

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function format(value: number, decimals = 3) {
  return value.toFixed(decimals)
}

export function HomePerspectiveField() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    if (reduceMotion.matches) {
      return
    }

    let frame = 0

    const updatePerspective = () => {
      frame = 0

      const viewportHeight = window.innerHeight || 1
      const rollPlanes = Array.from(document.querySelectorAll<HTMLElement>("[data-home-roll-plane]"))

      for (const plane of rollPlanes) {
        const rect = plane.getBoundingClientRect()
        const centerY = rect.top + rect.height * 0.5
        const distance = (centerY - viewportHeight * 0.5) / viewportHeight
        const rawDepth = clamp(0, Math.abs(distance), 2.1)
        const depth = Math.max(0, rawDepth - 0.24)
        const scale = clamp(0.42, 1 - depth * 0.28, 1)
        const opacity = clamp(0.26, 1 - depth * 0.46, 1)
        const blur = clamp(0, depth * 6.2, 10)
        const y = clamp(-74, distance * 58, 74)
        const z = -clamp(0, depth * 460, 620)
        const brightness = clamp(0.62, 1 - depth * 0.2, 1)
        const fog = clamp(0.02, depth * 0.24, 0.56)

        plane.style.setProperty("--home-roll-scale", format(scale))
        plane.style.setProperty("--home-roll-opacity", format(opacity))
        plane.style.setProperty("--home-roll-blur", `${format(blur, 2)}px`)
        plane.style.setProperty("--home-roll-y", `${format(y, 1)}px`)
        plane.style.setProperty("--home-roll-z", `${format(z, 1)}px`)
        plane.style.setProperty("--home-roll-brightness", format(brightness))
        plane.style.setProperty("--home-roll-fog", format(fog))
        plane.toggleAttribute("data-home-roll-active", rawDepth < 0.34)
      }
    }

    const requestUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updatePerspective)
    }

    updatePerspective()
    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", requestUpdate)

    return () => {
      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="home-perspective-atmosphere" aria-hidden="true">
        <span className="home-perspective-path home-perspective-path-left" />
        <span className="home-perspective-path home-perspective-path-right" />
        <span className="home-perspective-far-mist" />
      </div>
      <style jsx global>{`
        .heart-lake-world {
          perspective: 1400px;
          perspective-origin: 50% 42%;
        }

        [data-home-roll] {
          transform-style: preserve-3d;
        }

        [data-home-roll-plane] {
          --home-roll-scale: 1;
          --home-roll-opacity: 1;
          --home-roll-blur: 0px;
          --home-roll-y: 0px;
          --home-roll-z: 0px;
          --home-roll-brightness: 1;
          --home-roll-fog: 0.03;
          transform: translate3d(0, var(--home-roll-y), var(--home-roll-z)) scale(var(--home-roll-scale));
          transform-origin: 50% 48%;
          transform-style: preserve-3d;
          opacity: var(--home-roll-opacity);
          filter: blur(var(--home-roll-blur)) brightness(var(--home-roll-brightness));
          transition:
            opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 520ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity, filter;
        }

        [data-home-roll-plane]::before {
          content: "";
          position: absolute;
          inset: -10%;
          z-index: 16;
          border-radius: 38% 62% 58% 42% / 46% 40% 60% 54%;
          background:
            radial-gradient(ellipse at 50% 42%, rgba(8, 8, 7, 0), rgba(8, 8, 7, 0.12) 52%, rgba(8, 8, 7, 0.48) 100%),
            radial-gradient(ellipse at 50% 76%, rgba(216, 183, 111, 0.035), transparent 58%);
          opacity: var(--home-roll-fog);
          pointer-events: none;
          transition: opacity 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        [data-home-roll-plane][data-home-roll-active]::before {
          opacity: 0.02;
        }

        .home-perspective-atmosphere {
          position: fixed;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
        }

        .home-perspective-path,
        .home-perspective-far-mist {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .home-perspective-path {
          top: 9%;
          bottom: -10%;
          width: 1px;
          transform-origin: 50% 100%;
          background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.035) 26%, rgba(95, 132, 117, 0.035) 64%, transparent);
          filter: blur(0.4px);
          opacity: 0.58;
          mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 78%, transparent 100%);
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 78%, transparent 100%);
        }

        .home-perspective-path-left {
          left: 32%;
          transform: rotate(7deg) scaleY(1.18);
        }

        .home-perspective-path-right {
          right: 32%;
          transform: rotate(-7deg) scaleY(1.18);
        }

        .home-perspective-far-mist {
          left: 50%;
          top: 42%;
          width: min(72vw, 64rem);
          height: min(42vh, 28rem);
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 48%, rgba(244, 235, 221, 0.024), transparent 52%),
            radial-gradient(ellipse at 50% 70%, rgba(95, 132, 117, 0.05), transparent 68%);
          filter: blur(32px);
          opacity: 0.44;
          animation: home-perspective-mist 14s ease-in-out infinite;
        }

        @keyframes home-perspective-mist {
          0%,
          100% {
            opacity: 0.34;
            transform: translate(-50%, -50%) scale(0.98);
          }

          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.04);
          }
        }

        @media (max-width: 760px) {
          .heart-lake-world {
            perspective: 950px;
          }

          [data-home-roll-plane] {
            transform: translate3d(0, calc(var(--home-roll-y) * 0.42), calc(var(--home-roll-z) * 0.42))
              scale(clamp(0.72, var(--home-roll-scale), 1));
          }

          [data-home-roll-plane]::before {
            inset: -5%;
          }

          .home-perspective-path-left {
            left: 18%;
          }

          .home-perspective-path-right {
            right: 18%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-home-roll-plane] {
            opacity: 1;
            filter: none;
            transform: none;
            transition: none;
          }

          [data-home-roll-plane]::before,
          .home-perspective-atmosphere {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
