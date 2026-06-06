"use client"

import { motion } from "framer-motion"
import type { MouseEvent } from "react"

import { FlowButton } from "@/components/home/flow-button"
import { InsightCard } from "@/components/home/insight-card"

export function HeroSection() {
  function enterWorldview(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("personality")
    if (!target) return

    event.preventDefault()
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", "#personality")
  }

  return (
    <section
      id="hero"
      data-home-roll="hero"
      aria-label="阳明心学交易系统首屏"
      className="relative z-10 min-h-[100svh] w-full overflow-hidden text-left md:min-h-[min(100svh,920px)] xl:min-h-[min(100svh,980px)]"
    >
      <div className="hero-quiet-field" aria-hidden="true">
        <span className="hero-quiet-moon" />
        <span className="hero-quiet-ring hero-quiet-ring-one" />
        <span className="hero-quiet-ring hero-quiet-ring-two" />
        <span className="hero-quiet-dust hero-quiet-dust-one" />
        <span className="hero-quiet-dust hero-quiet-dust-two" />
        <span className="hero-heart-lake" />
        <span className="hero-lake-waterline" />
        <span className="hero-lake-ripple hero-lake-ripple-one" />
        <span className="hero-lake-ripple hero-lake-ripple-two" />
        <span className="hero-lake-particle hero-lake-particle-one" />
        <span className="hero-lake-particle hero-lake-particle-two" />
        <span className="hero-lake-particle hero-lake-particle-three" />
      </div>

      <div
        data-home-roll-plane
        className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-[1500px] items-start gap-10 px-5 pb-10 pt-[6.75rem] md:min-h-[min(100svh,920px)] md:px-8 md:pb-14 md:pt-28 lg:grid-cols-[minmax(0,760px)_minmax(420px,520px)] lg:justify-center lg:gap-16 lg:pt-32 xl:min-h-[min(100svh,980px)] xl:gap-20"
      >
        <motion.div
          className="w-full max-w-[760px] lg:flex lg:min-h-[560px] lg:flex-col"
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.15, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="brand-hero-title max-w-[760px]" aria-label="心不静，交易必乱。">
            <span className="brand-title-line">
              <span className="brand-title-phrase">心不静</span>
              <span className="brand-title-punct">，</span>
            </span>
            <span className="brand-title-line">
              <span className="brand-title-phrase">交易必乱</span>
              <span className="brand-title-punct">。</span>
            </span>
          </h1>

          <motion.div
            className="mt-6 grid w-full max-w-[480px] grid-cols-[1fr_auto_1fr] items-center gap-3 text-center font-story text-[1.16rem] font-light leading-relaxed tracking-[.08em] md:mt-7 md:text-[1.34rem]"
          >
            <motion.span
              className="text-[var(--ym-text-muted)]"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.82, delay: 1.38, ease: [0.22, 1, 0.36, 1] }}
            >
              市场照见价格
            </motion.span>
            <motion.span
              aria-hidden="true"
              className="h-9 w-px bg-[linear-gradient(180deg,transparent,rgba(216,183,111,.26),rgba(95,132,117,.16),transparent)]"
              initial={{ opacity: 0, scaleY: 0.42 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.72, delay: 1.68, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="text-[rgba(216,183,111,.62)]"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.82, delay: 1.88, ease: [0.22, 1, 0.36, 1] }}
            >
              心镜照见自己
            </motion.span>
          </motion.div>

          <p className="mt-7 max-w-[700px] text-[1.05rem] font-medium leading-[1.9] tracking-[.01em] text-[rgba(220,212,195,.68)] md:mt-8 md:text-[1.2rem]">
            这不是一个预测行情的网站，而是一套帮助交易者照见自己、重建纪律、训练执行的心学系统。
          </p>

          <div className="mt-7 grid w-full max-w-[560px] gap-3 sm:grid-cols-2 md:mt-8 lg:mt-auto">
            <FlowButton href="#personality" className="w-full" onClick={enterWorldview}>
              开始照见
            </FlowButton>
            <FlowButton href="/risk-education" variant="ghost" className="w-full">
              风险教育
            </FlowButton>
          </div>
        </motion.div>

        <div className="relative z-10 hidden w-full max-w-[520px] justify-self-end lg:block">
          <InsightCard />
        </div>
      </div>

      <style jsx global>{`
        .hero-quiet-field {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 31% 17%, rgba(244, 235, 221, 0.024), transparent 30rem),
            radial-gradient(ellipse at 72% 44%, rgba(95, 132, 117, 0.068), transparent 48%),
            radial-gradient(ellipse at 50% 74%, rgba(216, 183, 111, 0.052), transparent 42%),
            linear-gradient(180deg, rgba(0, 3, 5, 0.1), rgba(0, 0, 0, 0.52));
          animation: ym-fade-in var(--ym-motion-fade-in) var(--ym-motion-ease-out) both;
        }

        .hero-quiet-field::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 18%, rgba(244, 235, 221, 0.34) 0 1px, transparent 1.6px),
            radial-gradient(circle at 24% 34%, rgba(244, 235, 221, 0.18) 0 1px, transparent 1.7px),
            radial-gradient(circle at 52% 13%, rgba(244, 235, 221, 0.2) 0 1px, transparent 1.7px),
            radial-gradient(circle at 82% 28%, rgba(244, 235, 221, 0.15) 0 1px, transparent 1.7px),
            radial-gradient(circle at 68% 62%, rgba(216, 183, 111, 0.16) 0 1px, transparent 1.8px);
          opacity: 0.56;
          filter: blur(0.25px);
        }

        .hero-quiet-field::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(115deg, transparent 0 38%, rgba(244, 235, 221, 0.04) 48%, transparent 58% 100%),
            radial-gradient(ellipse at 62% 80%, rgba(216, 183, 111, 0.08), transparent 44%);
          opacity: 0.62;
          filter: blur(10px);
        }

        .hero-quiet-moon,
        .hero-quiet-ring,
        .hero-quiet-dust,
        .hero-heart-lake,
        .hero-lake-waterline,
        .hero-lake-ripple,
        .hero-lake-particle {
          position: absolute;
          display: block;
          pointer-events: none;
        }

        .hero-quiet-moon {
          display: none;
        }

        .hero-quiet-ring {
          left: 43%;
          top: 46%;
          width: min(64vw, 720px);
          height: min(64vw, 720px);
          border: 1px solid rgba(216, 183, 111, 0.045);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.42;
        }

        .hero-quiet-ring-two {
          left: 55%;
          top: 54%;
          width: min(48vw, 500px);
          height: min(48vw, 500px);
          border-color: rgba(244, 235, 221, 0.035);
          opacity: 0.42;
        }

        .hero-quiet-dust {
          border-radius: 999px;
          filter: blur(18px);
          opacity: 0.38;
        }

        .hero-quiet-dust-one {
          left: 4%;
          bottom: 9%;
          width: 48%;
          height: 18%;
          background: radial-gradient(ellipse, rgba(216, 183, 111, 0.08), transparent 70%);
        }

        .hero-quiet-dust-two {
          right: 8%;
          top: 24%;
          width: 42%;
          height: 22%;
          background: radial-gradient(ellipse, rgba(88, 113, 103, 0.12), transparent 70%);
        }

        .hero-heart-lake {
          left: 50%;
          top: 56%;
          width: min(88vw, 76rem);
          height: min(46vw, 34rem);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background:
            radial-gradient(ellipse at 50% 44%, rgba(95, 132, 117, 0.105), transparent 68%),
            radial-gradient(ellipse at 50% 54%, rgba(216, 183, 111, 0.045), transparent 62%);
          filter: blur(18px);
          opacity: 0.54;
          animation: hero-heart-lake-breathe 7.2s ease-in-out infinite;
        }

        .hero-lake-waterline {
          left: 50%;
          top: 48%;
          width: min(112vw, 96rem);
          height: min(42vw, 28rem);
          transform: translateX(-50%);
          background:
            repeating-linear-gradient(180deg, rgba(216, 183, 111, 0.022) 0 1px, transparent 1px 23px),
            radial-gradient(ellipse at 50% 6%, rgba(151, 190, 190, 0.08), transparent 58%),
            linear-gradient(180deg, rgba(95, 132, 117, 0.12), transparent 36%);
          filter: blur(0.5px);
          -webkit-mask-image: radial-gradient(ellipse 78% 58% at 50% 38%, #000 0%, rgba(0, 0, 0, 0.68) 48%, transparent 82%);
          mask-image: radial-gradient(ellipse 78% 58% at 50% 38%, #000 0%, rgba(0, 0, 0, 0.68) 48%, transparent 82%);
          opacity: 0.46;
          transform-origin: center top;
          animation: hero-waterline-drift 12s ease-in-out infinite;
        }

        .hero-lake-ripple {
          left: 50%;
          top: 58%;
          width: min(66vw, 54rem);
          aspect-ratio: 1 / 0.38;
          border: 1px solid rgba(216, 183, 111, 0.095);
          border-radius: 50%;
          opacity: 0;
        }

        .hero-lake-ripple-one {
          animation: ym-lake-ripple var(--ym-motion-ripple) ease-out 1.24s both;
        }

        .hero-lake-ripple-two {
          width: min(52vw, 42rem);
          border-color: rgba(244, 235, 221, 0.065);
          animation: ym-lake-ripple 1600ms ease-out 1.74s both;
        }

        .hero-lake-particle {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.4);
          box-shadow: 0 0 18px rgba(216, 183, 111, 0.14);
          opacity: 0.18;
          animation: particle-float 8s ease-in-out infinite;
        }

        .hero-lake-particle-one {
          left: 24%;
          top: 38%;
          animation-delay: 0.8s;
        }

        .hero-lake-particle-two {
          left: 64%;
          top: 31%;
          animation-delay: 2.2s;
        }

        .hero-lake-particle-three {
          left: 76%;
          top: 68%;
          animation-delay: 3.6s;
        }

        @media (max-width: 640px) {
          .hero-quiet-field {
            inset: 0;
          }

          .hero-quiet-ring {
            left: 62%;
            top: 46%;
            width: 82vw;
            height: 82vw;
            opacity: 0.42;
          }

          .hero-quiet-ring-two {
            left: 66%;
            top: 54%;
            width: 58vw;
            height: 58vw;
          }

          .hero-heart-lake {
            top: 58%;
            width: 112vw;
            height: 58vw;
          }

          .hero-lake-waterline {
            top: 50%;
            width: 122vw;
            height: 58vw;
          }

          .hero-lake-ripple {
            top: 61%;
            width: 84vw;
          }
        }

        @keyframes hero-heart-lake-breathe {
          0%,
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }

          50% {
            opacity: 0.68;
            transform: translate(-50%, -50%) scale(1.018);
          }
        }

        @keyframes hero-waterline-drift {
          0%,
          100% {
            transform: translateX(-50%) translateY(0) scaleY(1);
          }

          50% {
            transform: translateX(-50%) translateY(-1.1svh) scaleY(1.03);
          }
        }

      `}</style>
    </section>
  )
}
