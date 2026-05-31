"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { FlowButton } from "@/components/home/flow-button"

const mirrorThoughts = [
  {
    thought: "先卖一点吧，\n万一跌下来呢？",
    mirror: "焦虑之镜",
  },
  {
    thought: "再不上车，\n就来不及了。",
    mirror: "追涨之镜",
  },
  {
    thought: "再等等，\n说不定能回来。",
    mirror: "扛单之镜",
  },
  {
    thought: "这一把做对，\n就能全回来。",
    mirror: "赌性之镜",
  },
] as const

export function HeroSection() {
  const [thoughtIndex, setThoughtIndex] = useState(0)
  const activeThought = mirrorThoughts[thoughtIndex]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setThoughtIndex((current) => (current + 1) % mirrorThoughts.length)
    }, 4800)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section
      id="hero"
      aria-label="九面行为心镜首屏"
      className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1240px] flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-24 text-center md:px-8 md:pb-16 md:pt-28"
    >
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[11%] h-px w-[min(520px,72vw)] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.18),transparent)] opacity-40"
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: 0.4, scaleX: 1 }}
        transition={{ duration: 1.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="relative flex w-full flex-col items-center">
        <motion.div
          className="mb-4 flex flex-col items-center md:mb-6"
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 1.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="type-level-4 text-[rgba(216,183,111,.5)]">
            九面行为心镜
          </span>
          <h1 className="sr-only">
            九面行为心镜，照见交易里最先动的那一念
          </h1>
        </motion.div>

        <motion.div
          className="heart-mirror-shell"
          initial={{ opacity: 0, scale: 0.88, y: 26, filter: "blur(18px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.35, delay: 1.48, ease: [0.22, 1, 0.36, 1] }}
          aria-label={`心镜照见：${activeThought.thought.replace("\n", "")}`}
        >
          <span className="hero-mirror-aura hero-mirror-aura-one" />
          <span className="hero-mirror-aura hero-mirror-aura-two" />
          <span className="hero-mirror-frame-line hero-mirror-frame-line-one" />
          <span className="hero-mirror-frame-line hero-mirror-frame-line-two" />

          <div className="heart-mirror-water">
            <span className="hero-mirror-surface-shine" />
            <span className="hero-mirror-ripple hero-mirror-ripple-one" />
            <span className="hero-mirror-ripple hero-mirror-ripple-two" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeThought.thought}
                className="hero-mirror-thought-wrap"
                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
                transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-worldview hero-mirror-thought">
                  {activeThought.thought}
                </p>
                <p className="type-level-4 hero-mirror-name">
                  此念显影 · {activeThought.mirror}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          className="mt-7 flex w-full max-w-[620px] flex-col items-center md:mt-9"
          initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 2.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-story max-w-[520px] text-[1.02rem] font-light leading-[2] tracking-[.02em] text-[rgba(244,235,221,.68)] md:text-[1.16rem]">
            不是行情反复伤你，
            <br className="sm:hidden" />
            是同一个念头反复牵动你。
          </p>
          <p className="font-worldview mt-3 text-[1.45rem] font-light leading-tight tracking-[.08em] text-[rgba(244,235,221,.8)] md:mt-4 md:text-[1.78rem]">
            心不静，交易必乱。
          </p>

          <div className="mt-7 flex w-full justify-center md:mt-8">
            <FlowButton href="/assessment-entry" className="w-full max-w-[340px] sm:w-auto">
              入照心
            </FlowButton>
          </div>
          <a
            href="#compliance"
            className="type-level-5 mt-4 text-[rgba(244,235,221,.34)] no-underline transition duration-700 hover:text-[rgba(244,235,221,.62)]"
          >
            只做交易认知与风险教育
          </a>
        </motion.div>
      </div>

      <style jsx global>{`
        .heart-mirror-shell {
          position: relative;
          width: clamp(286px, 56vw, 540px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(41, 37, 28, 0.38), rgba(11, 10, 8, 0.74) 61%, rgba(6, 6, 5, 0.96) 78%),
            conic-gradient(from 132deg, rgba(114, 82, 41, 0.16), rgba(218, 184, 104, 0.34), rgba(74, 54, 30, 0.2), rgba(218, 184, 104, 0.3), rgba(114, 82, 41, 0.16));
          border: 1px solid rgba(199, 162, 86, 0.26);
          box-shadow:
            0 32px 120px rgba(0, 0, 0, 0.36),
            0 0 82px rgba(175, 138, 65, 0.08),
            inset 0 0 46px rgba(216, 183, 111, 0.055);
        }

        .heart-mirror-shell::before,
        .heart-mirror-shell::after {
          content: "";
          position: absolute;
          inset: -8%;
          border-radius: inherit;
          border: 1px solid rgba(202, 166, 86, 0.12);
          pointer-events: none;
        }

        .heart-mirror-shell::after {
          inset: -17%;
          border-color: rgba(202, 166, 86, 0.07);
          filter: blur(0.2px);
        }

        .hero-mirror-aura,
        .hero-mirror-frame-line {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }

        .hero-mirror-aura-one {
          inset: -24%;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.08), transparent 62%);
          filter: blur(30px);
          animation: hero-mirror-aura-breath 9s ease-in-out infinite;
        }

        .hero-mirror-aura-two {
          inset: 8%;
          background: radial-gradient(circle at 50% 38%, rgba(82, 109, 98, 0.11), transparent 58%);
          filter: blur(18px);
          opacity: 0.56;
        }

        .hero-mirror-frame-line-one {
          inset: 3.6%;
          border: 1px solid rgba(216, 183, 111, 0.22);
          box-shadow: inset 0 0 24px rgba(216, 183, 111, 0.04);
        }

        .hero-mirror-frame-line-two {
          inset: 10.8%;
          border: 1px dashed rgba(230, 204, 142, 0.14);
          opacity: 0.8;
        }

        .heart-mirror-water {
          position: absolute;
          inset: 13%;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 28%, rgba(232, 220, 188, 0.12), transparent 18%),
            radial-gradient(circle at 48% 58%, rgba(43, 55, 52, 0.52), rgba(13, 17, 16, 0.82) 46%, rgba(4, 5, 5, 0.96) 74%),
            linear-gradient(145deg, rgba(20, 25, 23, 0.86), rgba(3, 4, 4, 0.95));
          border: 1px solid rgba(226, 202, 148, 0.1);
          box-shadow:
            inset 0 0 48px rgba(0, 0, 0, 0.72),
            inset 0 0 78px rgba(92, 118, 106, 0.08),
            0 0 34px rgba(216, 183, 111, 0.05);
        }

        .heart-mirror-water::before {
          content: "";
          position: absolute;
          inset: -25%;
          background:
            repeating-radial-gradient(ellipse at 50% 52%, rgba(244, 235, 221, 0.055) 0 1px, transparent 2px 16px),
            linear-gradient(105deg, transparent 0 36%, rgba(244, 235, 221, 0.07) 46%, transparent 57% 100%);
          opacity: 0.38;
          transform: rotate(-8deg);
          animation: hero-mirror-water-drift 12s ease-in-out infinite;
        }

        .hero-mirror-surface-shine {
          position: absolute;
          left: 12%;
          top: 20%;
          width: 76%;
          height: 20%;
          border-radius: 999px;
          background: linear-gradient(100deg, transparent, rgba(247, 235, 204, 0.12), transparent);
          filter: blur(8px);
          transform: rotate(-11deg);
          opacity: 0.46;
        }

        .hero-mirror-ripple {
          position: absolute;
          inset: 22%;
          border-radius: 999px;
          border: 1px solid rgba(232, 204, 143, 0.08);
          opacity: 0;
          animation: hero-mirror-ripple 4.8s ease-out infinite;
        }

        .hero-mirror-ripple-two {
          animation-delay: 2.35s;
        }

        .hero-mirror-thought-wrap {
          position: relative;
          z-index: 2;
          width: min(78%, 360px);
          text-align: center;
        }

        .hero-mirror-thought {
          white-space: pre-line;
          font-size: clamp(30px, 5.2vw, 54px);
          line-height: 1.42;
          letter-spacing: 0.045em;
          font-weight: 300;
          color: rgba(244, 235, 221, 0.9);
          text-shadow:
            0 0 24px rgba(216, 183, 111, 0.1),
            0 0 46px rgba(0, 0, 0, 0.45);
        }

        .hero-mirror-name {
          margin-top: clamp(18px, 3vw, 28px);
          color: rgba(216, 183, 111, 0.5);
        }

        @keyframes hero-mirror-aura-breath {
          0%,
          100% {
            opacity: 0.7;
            transform: scale(0.98);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
          }
        }

        @keyframes hero-mirror-water-drift {
          0%,
          100% {
            transform: translate3d(-1.5%, 0, 0) rotate(-8deg);
          }
          50% {
            transform: translate3d(1.5%, 1%, 0) rotate(-5deg);
          }
        }

        @keyframes hero-mirror-ripple {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }
          18% {
            opacity: 0.42;
          }
          100% {
            opacity: 0;
            transform: scale(1.85);
          }
        }

        @media (max-width: 420px) {
          .heart-mirror-shell {
            width: min(78vw, 304px);
          }

          .hero-mirror-thought {
            font-size: clamp(28px, 8.1vw, 34px);
            line-height: 1.48;
          }
        }
      `}</style>
    </section>
  )
}
