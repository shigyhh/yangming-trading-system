"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

const emotions = [
  {
    name: "恐惧",
    className: "lg:left-[7%] lg:top-[14%]",
  },
  {
    name: "贪婪",
    className: "lg:right-[2%] lg:top-[28%]",
  },
  {
    name: "急躁",
    className: "lg:left-[18%] lg:bottom-[18%]",
  },
  {
    name: "幻想",
    className: "lg:right-[10%] lg:bottom-[6%]",
  },
]

export function StorySections() {
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let revertGsap: (() => void) | undefined
    let canceled = false

    async function setupScrollStory() {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")

      if (!rootRef.current || canceled) return

      gsap.registerPlugin(ScrollTrigger)

      const context = gsap.context(() => {
        const lines = gsap.utils.toArray<HTMLElement>("[data-story-line]")
        const closing = gsap.utils.toArray<HTMLElement>("[data-story-closing]")
        const emotionItems = gsap.utils.toArray<HTMLElement>("[data-emotion]")
        const emotionAura = gsap.utils.toArray<HTMLElement>("[data-emotion-aura]")
        const inkVeil = gsap.utils.toArray<HTMLElement>("[data-ink-veil]")
        const depth = gsap.utils.toArray<HTMLElement>("[data-story-depth]")
        const qi = gsap.utils.toArray<HTMLElement>("[data-story-qi]")
        const lens = gsap.utils.toArray<HTMLElement>("[data-story-lens]")
        const dust = gsap.utils.toArray<HTMLElement>("[data-story-dust]")
        const waves = gsap.utils.toArray<HTMLElement>("[data-conscious-wave]")

        gsap.set(lines, { opacity: 0, y: 46, filter: "blur(22px)", scale: 0.985 })
        gsap.set(closing, { opacity: 0, y: 28, filter: "blur(18px)", scale: 0.98 })
        gsap.set(emotionItems, { opacity: 0, y: 34, scale: 0.94, filter: "blur(18px)" })
        gsap.set(emotionAura, { opacity: 0, scale: 0.72 })
        gsap.set(inkVeil, { opacity: 0.12, scale: 0.92 })
        gsap.set(depth, { opacity: 0.025, y: 18, scale: 0.985 })
        gsap.set(qi, { opacity: 0.08, x: "-8%" })
        gsap.set(lens, { scale: 1, y: 0 })
        gsap.set(dust, { opacity: 0, y: 16, scale: 0.75 })
        gsap.set(waves, { opacity: 0, scale: 0.72, filter: "blur(18px)" })

        gsap
          .timeline({
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 82%",
              end: "bottom 18%",
              scrub: 1.9,
            },
          })
          .to(lens, { scale: 1.035, y: -10, duration: 7.6, ease: "none" }, 0)
          .to(depth, { opacity: 0.075, y: 0, scale: 1.012, duration: 3.4, ease: "power2.out" }, 0)
          .to(qi, { opacity: 0.26, x: "4%", duration: 5.8, ease: "power1.inOut" }, 0.3)
          .to(inkVeil, { opacity: 0.42, scale: 1, duration: 3.2, ease: "power2.out" }, 0.4)
          .to(
            lines[0],
            {
              opacity: 0.72,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
              duration: 1.9,
              ease: "power2.out",
            },
            0.8
          )
          .to(
            lines[1],
            {
              opacity: 0.94,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
              duration: 2.1,
              ease: "power3.out",
            },
            2.55
          )
          .to(
            waves[0],
            {
              opacity: 0.12,
              scale: 1.22,
              filter: "blur(22px)",
              duration: 1.75,
              ease: "power2.out",
            },
            2.58
          )
          .to(waves[0], { opacity: 0, scale: 1.54, duration: 1.8, ease: "power1.out" }, 3.55)
          .to(inkVeil, { opacity: 0.48, duration: 1.2, ease: "power1.out" }, 2.7)
          .to(inkVeil, { opacity: 0.36, duration: 1.5, ease: "power1.inOut" }, 3.55)
          .to(
            lines[2],
            {
              opacity: 0.92,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
              duration: 2.2,
              ease: "power3.out",
            },
            4.55
          )
          .to(
            waves[1],
            {
              opacity: 0.1,
              scale: 1.18,
              filter: "blur(24px)",
              duration: 1.9,
              ease: "power2.out",
            },
            4.62
          )
          .to(waves[1], { opacity: 0, scale: 1.5, duration: 1.9, ease: "power1.out" }, 5.72)
          .to(depth, { opacity: 0.092, scale: 1.018, y: -2, duration: 1.6, ease: "power1.out" }, 4.7)
          .to(depth, { opacity: 0.07, scale: 1.01, y: 0, duration: 1.8, ease: "power1.inOut" }, 5.72)
          .to(
            dust,
            {
              opacity: 0.36,
              y: 0,
              scale: 1,
              stagger: 0.2,
              duration: 1.6,
              ease: "power2.out",
            },
            4.9
          )
          .to(
            lines[3],
            {
              opacity: 0.92,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 2.25,
              ease: "power3.out",
            },
            6.75
          )
          .to(
            closing,
            {
              opacity: 0.82,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 2.35,
              ease: "power3.out",
            },
            8.2
          )
          .to(
            waves[2],
            {
              opacity: 0.11,
              scale: 1.24,
              filter: "blur(26px)",
              duration: 2.1,
              ease: "power2.out",
            },
            6.9
          )
          .to(waves[2], { opacity: 0, scale: 1.62, duration: 2.25, ease: "power1.out" }, 8.05)
          .to(qi, { opacity: 0.34, x: "6%", duration: 1.65, ease: "power1.out" }, 6.95)
          .to(qi, { opacity: 0.22, x: "4%", duration: 2, ease: "power1.inOut" }, 8.05)
          .to(
            emotionAura,
            {
              opacity: 0.24,
              scale: 1,
              stagger: 0.34,
              duration: 1.8,
              ease: "power2.out",
            },
            7.35
          )
          .to(
            emotionItems,
            {
              opacity: 0.86,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              stagger: 0.42,
              duration: 1.7,
              ease: "power3.out",
            },
            7.6
          )
      }, rootRef)

      revertGsap = () => context.revert()
    }

    void setupScrollStory()

    return () => {
      canceled = true
      revertGsap?.()
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative z-10 min-h-[245svh] overflow-clip px-4 md:px-8"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,7,0),rgba(8,8,7,.34)_24%,rgba(8,8,7,.58)_58%,rgba(8,8,7,.22))]" />
      <motion.div
        data-story-depth
        aria-hidden="true"
        className="absolute inset-x-[-16vw] top-[10vh] h-[46vh] opacity-[.05] blur-[2.4px]"
        animate={{ x: ["-.8vw", ".8vw", "-.8vw"], y: ["0vh", "-.5vh", "0vh"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg className="h-full w-[132vw]" viewBox="0 0 1440 420" preserveAspectRatio="none">
          <path
            d="M0 318C124 270 178 166 292 192c112 26 154 108 275 62 94-36 132-170 260-132 92 28 128 130 250 92 124-38 180-126 363-78v284H0Z"
            fill="rgba(244,235,221,.44)"
          />
          <path
            d="M0 362C140 318 216 246 334 268c130 24 164-70 290-54 120 16 172 82 298 50 126-32 210-88 518-38v194H0Z"
            fill="rgba(95,132,117,.28)"
          />
        </svg>
      </motion.div>

      <div className="sticky top-0 mx-auto grid min-h-[100svh] w-full max-w-[1240px] items-center py-24 md:py-28">
        <div
          data-ink-veil
          className="absolute left-1/2 top-1/2 h-[74vh] w-[96vw] max-w-[1180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_48%_52%,rgba(216,183,111,.09),rgba(95,132,117,.045)_34%,rgba(8,8,7,0)_68%)] blur-3xl"
        />
        <motion.div
          data-story-qi
          aria-hidden="true"
          className="absolute inset-x-0 top-[18%] h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.16),transparent)] opacity-20"
          animate={{ x: ["-8%", "8%", "-8%"], opacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            data-conscious-wave
            aria-hidden="true"
            className="absolute rounded-full border border-[rgba(244,235,221,.05)] bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.035),rgba(95,132,117,.018)_34%,transparent_70%)] blur-2xl"
            style={{
              height: `${46 + item * 8}vh`,
              left: `${38 + item * 8}%`,
              top: `${45 + item * 4}%`,
              transform: "translate(-50%, -50%)",
              width: `${70 + item * 10}vw`,
            }}
          />
        ))}

        <div data-story-lens className="relative grid gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center lg:gap-20">
          <div className="max-w-[640px]">
            <p
              data-story-line
              className="text-base leading-8 text-muted-cream md:text-xl md:leading-10"
            >
              你以为你亏给了行情。
            </p>
            <div className="font-worldview cinema-text-balance mt-12 flex flex-col gap-5 text-[clamp(3rem,13vw,6.2rem)] font-normal leading-[1.18] text-cream md:mt-16 md:gap-7 md:text-[clamp(4.8rem,7vw,7rem)] md:leading-[1.16]">
              <span data-story-line>其实，</span>
              <span data-story-line>你亏给了自己</span>
              <span data-story-line>临盘那一念。</span>
            </div>
            <p
              data-story-closing
              className="font-story mx-auto mt-12 max-w-[520px] text-center text-base font-light leading-9 text-muted-cream md:mt-16 md:text-xl md:leading-10"
            >
              不是技术不够。
              <br />
              是那一念，
              <br />
              先动了。
            </p>
          </div>

          <div className="relative min-h-[360px] md:min-h-[460px] lg:min-h-[620px]">
            <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(217,189,122,.06)] bg-[radial-gradient(circle,rgba(216,183,111,.035),transparent_62%)] blur-[.2px]" />
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(244,235,221,.045)]"
              animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.16, 0.3, 0.16] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            {[0, 1, 2, 3, 4].map((item) => (
              <span
                key={item}
                data-story-dust
                className="absolute size-1 rounded-full bg-[#d8b76f]/30 blur-[.5px]"
                style={{
                  left: `${18 + item * 16}%`,
                  top: `${24 + (item % 3) * 18}%`,
                }}
              />
            ))}
            {emotions.map((emotion, index) => (
              <div
                key={emotion.name}
                className={[
                  "relative mb-10 flex items-baseline gap-5 lg:absolute lg:mb-0 lg:block",
                  emotion.className,
                ].join(" ")}
              >
                <span
                  data-emotion-aura
                  className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,183,111,.12),transparent_68%)] blur-2xl lg:h-40 lg:w-40"
                />
                <div data-emotion className="relative">
                  <span className="font-function mb-3 hidden text-xs text-gold opacity-40 lg:block">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="font-worldview block text-[clamp(3.3rem,16vw,6.5rem)] font-normal leading-none text-cream opacity-90 lg:text-[clamp(4.2rem,5.7vw,6.8rem)]">
                    {emotion.name}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
