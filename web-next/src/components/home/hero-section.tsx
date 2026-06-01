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
      aria-label="阳明心学交易系统首屏"
      className="relative z-10 min-h-[100svh] w-full overflow-hidden text-left"
    >
      <div className="hero-quiet-field" aria-hidden="true">
        <span className="hero-quiet-moon" />
        <span className="hero-quiet-ring hero-quiet-ring-one" />
        <span className="hero-quiet-ring hero-quiet-ring-two" />
        <span className="hero-quiet-dust hero-quiet-dust-one" />
        <span className="hero-quiet-dust hero-quiet-dust-two" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-[1500px] items-start gap-10 px-5 pb-12 pt-[7.25rem] md:px-8 md:pb-16 md:pt-28 lg:grid-cols-[minmax(0,760px)_minmax(420px,520px)] lg:justify-center lg:gap-16 lg:pt-36 xl:gap-20">
        <motion.div
          className="w-full max-w-[760px] lg:flex lg:min-h-[560px] lg:flex-col"
          initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.15, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-worldview max-w-[760px] text-[clamp(3.5rem,7.1vw,6.55rem)] font-light leading-[1.04] tracking-[0] text-[rgba(244,235,221,.94)]">
            心不静，
            <br />
            交易必乱。
          </h1>

          <motion.div
            className="mt-6 grid w-full max-w-[480px] grid-cols-[1fr_auto_1fr] items-center gap-3 text-center font-story text-[1.16rem] font-light leading-relaxed tracking-[.08em] md:mt-7 md:text-[1.34rem]"
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 1.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[rgba(190,194,190,.58)]">
              市场照见价格
            </span>
            <span
              aria-hidden="true"
              className="h-9 w-px bg-[linear-gradient(180deg,transparent,rgba(216,183,111,.26),rgba(95,132,117,.16),transparent)]"
            />
            <span className="text-[rgba(216,183,111,.64)]">
              心镜照见自己
            </span>
          </motion.div>

          <p className="mt-7 max-w-[700px] text-[1.05rem] font-medium leading-[1.9] tracking-[.01em] text-[rgba(244,235,221,.76)] md:mt-8 md:text-[1.2rem]">
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
            radial-gradient(ellipse at 31% 17%, rgba(244, 235, 221, 0.028), transparent 30rem),
            radial-gradient(ellipse at 72% 44%, rgba(88, 113, 103, 0.06), transparent 48%),
            linear-gradient(180deg, rgba(0, 3, 5, 0.12), rgba(0, 0, 0, 0.5));
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
        .hero-quiet-dust {
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
          border: 1px solid rgba(216, 183, 111, 0.06);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.5;
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
        }
      `}</style>
    </section>
  )
}
