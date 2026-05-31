"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

const shadowWords = ["执念", "恐惧", "幻想", "焦虑"]
const finalLines = ["每个人都在交易，", "但真正交易的，", "是人格。"]

const dust = [
  ["14%", "24%", "0s"],
  ["31%", "70%", "1.8s"],
  ["50%", "19%", "3.2s"],
  ["68%", "78%", "0.9s"],
  ["84%", "34%", "2.7s"],
]

export function PersonalityRevealSection() {
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let revertGsap: (() => void) | undefined
    let canceled = false

    async function setupPersonalityReveal() {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")

      if (!rootRef.current || canceled) return

      gsap.registerPlugin(ScrollTrigger)

      const context = gsap.context(() => {
        const words = gsap.utils.toArray<HTMLElement>("[data-shadow-word]")
        const echoes = gsap.utils.toArray<HTMLElement>("[data-shadow-echo]")
        const auras = gsap.utils.toArray<HTMLElement>("[data-shadow-aura]")
        const finalText = gsap.utils.toArray<HTMLElement>("[data-personality-final]")
        const finalGlow = gsap.utils.toArray<HTMLElement>("[data-final-glow]")
        const mountain = gsap.utils.toArray<HTMLElement>("[data-personality-mountain]")
        const qi = gsap.utils.toArray<HTMLElement>("[data-personality-qi]")
        const veil = gsap.utils.toArray<HTMLElement>("[data-personality-veil]")
        const lens = gsap.utils.toArray<HTMLElement>("[data-personality-lens]")
        const particles = gsap.utils.toArray<HTMLElement>("[data-personality-dust]")

        gsap.set(words, {
          opacity: 0,
          y: 52,
          scale: 0.86,
          filter: "blur(42px)",
        })
        gsap.set(echoes, {
          opacity: 0,
          y: 16,
          scale: 0.72,
          filter: "blur(54px)",
        })
        gsap.set(auras, {
          opacity: 0,
          scale: 0.72,
          filter: "blur(42px)",
        })
        gsap.set(finalText, {
          opacity: 0,
          y: 38,
          scale: 0.985,
          filter: "blur(22px)",
        })
        gsap.set(finalGlow, { opacity: 0, scale: 0.86, filter: "blur(36px)" })
        gsap.set(mountain, { opacity: 0.025, y: 20, scale: 0.99 })
        gsap.set(qi, { opacity: 0.05, x: "-8%" })
        gsap.set(veil, { opacity: 0.07, scale: 0.88 })
        gsap.set(lens, { scale: 1, y: 0 })
        gsap.set(particles, { opacity: 0, y: 18, scale: 0.72 })

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 82%",
            end: "bottom 12%",
            scrub: 2.35,
          },
        })

        timeline
          .to(lens, { scale: 1.055, y: -14, duration: 18, ease: "none" }, 0)
          .to(mountain, { opacity: 0.072, y: 0, scale: 1.018, duration: 5.2, ease: "power2.out" }, 0.2)
          .to(veil, { opacity: 0.16, scale: 1, duration: 4.6, ease: "power2.out" }, 0.4)
          .to(qi, { opacity: 0.18, x: "5%", duration: 10.5, ease: "power1.inOut" }, 0.5)
          .to(
            particles,
            {
              opacity: 0.22,
              y: 0,
              scale: 1,
              stagger: 0.28,
              duration: 2.4,
              ease: "power2.out",
            },
            0.9
          )

        shadowWords.forEach((_, index) => {
          const startAt = 1.25 + index * 3.25

          timeline
            .to(
              veil,
              {
                opacity: 0.3,
                scale: 1.045,
                duration: 1.95,
                ease: "power2.out",
              },
              startAt - 0.36
            )
            .to(
              auras[index],
              {
                opacity: 0.2,
                scale: 1,
                filter: "blur(32px)",
                duration: 1.8,
                ease: "power2.out",
              },
              startAt - 0.18
            )
            .to(
              echoes[index],
              {
                opacity: 0.18,
                y: 0,
                scale: 1.02,
                filter: "blur(28px)",
                duration: 2.15,
                ease: "power2.out",
              },
              startAt
            )
            .to(
              words[index],
              {
                opacity: 0.88,
                y: 0,
                scale: 1,
                filter: "blur(0.6px)",
                duration: 2.25,
                ease: "power3.out",
              },
              startAt + 0.22
            )
            .to(
              words[index],
              {
                opacity: 0.09,
                y: -52,
                scale: 1.06,
                filter: "blur(40px)",
                duration: 2.15,
                ease: "power2.inOut",
              },
              startAt + 2.32
            )
            .to(
              echoes[index],
              {
                opacity: 0,
                y: -28,
                scale: 1.28,
                filter: "blur(58px)",
                duration: 2.25,
                ease: "power1.out",
              },
              startAt + 2.3
            )
            .to(
              auras[index],
              {
                opacity: 0,
                scale: 1.4,
                filter: "blur(52px)",
                duration: 2.35,
                ease: "power1.out",
              },
              startAt + 2.22
            )
            .to(
              veil,
              {
                opacity: 0.14,
                scale: 1.015,
                duration: 1.8,
                ease: "power1.inOut",
              },
              startAt + 2.72
            )
        })

        timeline
          .to(particles, { opacity: 0.1, y: -18, duration: 1.8, ease: "power1.inOut" }, 14)
          .to(finalGlow, { opacity: 0.22, scale: 1, filter: "blur(28px)", duration: 2.7, ease: "power2.out" }, 14.35)
          .to(veil, { opacity: 0.24, scale: 1.035, duration: 2.6, ease: "power2.out" }, 14.35)
          .to(
            finalText,
            {
              opacity: 0.88,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              stagger: 0.52,
              duration: 2.15,
              ease: "power3.out",
            },
            14.75
          )
          .to(qi, { opacity: 0.12, x: "8%", duration: 2.2, ease: "power1.inOut" }, 16.2)
      }, rootRef)

      revertGsap = () => context.revert()
    }

    void setupPersonalityReveal()

    return () => {
      canceled = true
      revertGsap?.()
    }
  }, [])

  return (
    <section
      id="personality"
      ref={rootRef}
      aria-label="交易人格显现"
      className="relative z-10 min-h-[390svh] overflow-clip px-4 md:px-8"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,7,.16),rgba(8,8,7,.58)_36%,rgba(8,8,7,.74)_72%,rgba(8,8,7,.32))]" />

      <div className="sticky top-0 mx-auto grid min-h-[100svh] w-full max-w-[1240px] place-items-center py-24 md:py-28">
        <motion.div
          data-personality-mountain
          aria-hidden="true"
          className="absolute inset-x-[-14vw] bottom-[5vh] h-[46vh] opacity-[.04] blur-[3px]"
          animate={{ x: ["0vw", "1.1vw", "0vw"], y: ["0vh", "-.8vh", "0vh"] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="h-full w-[128vw]" viewBox="0 0 1440 380" preserveAspectRatio="none">
            <path
              d="M0 260C120 228 210 126 330 146c126 21 170 104 300 54 104-40 164-152 282-106 110 42 132 138 266 92 104-36 168-82 262-68v262H0Z"
              fill="rgba(244,235,221,.34)"
            />
            <path
              d="M0 312C158 270 230 222 368 244c132 22 178-48 304-32 116 15 176 76 306 42 130-34 230-72 462-34v160H0Z"
              fill="rgba(95,132,117,.22)"
            />
          </svg>
        </motion.div>

        <div
          data-personality-veil
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[66vh] w-[82vw] max-w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.075),rgba(95,132,117,.03)_38%,rgba(8,8,7,0)_72%)] blur-3xl"
        />

        <motion.span
          data-personality-qi
          aria-hidden="true"
          className="absolute left-1/2 top-[50%] h-px w-[72vw] max-w-[860px] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.12),transparent)]"
          animate={{ opacity: [0.05, 0.16, 0.05], x: ["-1.5%", "1.5%", "-1.5%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />

        {dust.map(([left, top, delay], index) => (
          <motion.span
            key={`${left}-${top}`}
            data-personality-dust
            aria-hidden="true"
            className="absolute size-1 rounded-full bg-[#d8b76f]/20 blur-[.8px]"
            style={{ left, top }}
            animate={{ y: [-8, 10, -8], opacity: [0.06, 0.22, 0.06] }}
            transition={{
              delay: Number.parseFloat(delay),
              duration: 9 + index * 1.6,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}

        <div
          data-personality-lens
          className="relative grid min-h-[70svh] w-full place-items-center"
        >
          <span className="sr-only">
            {shadowWords.join("，")}。每个人都在交易，但真正交易的，是人格。
          </span>

          {shadowWords.map((word) => (
            <div
              key={word}
              className="pointer-events-none absolute inset-0 grid place-items-center"
              aria-hidden="true"
            >
              <span
                data-shadow-aura
                className="absolute h-[44vh] w-[72vw] max-w-[820px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.13),rgba(95,132,117,.035)_42%,transparent_74%)]"
              />
              <span
                data-shadow-echo
                className="font-worldview absolute text-[clamp(5rem,28vw,13rem)] font-normal leading-none text-[rgba(216,183,111,.14)]"
                style={{ letterSpacing: "0.18em", textShadow: "0 0 38px rgba(216,183,111,.07)" }}
              >
                {word}
              </span>
              <strong
                data-shadow-word
                className="font-worldview relative block text-[clamp(5rem,25vw,12rem)] font-normal leading-none text-[rgba(244,235,221,.84)]"
                style={{ letterSpacing: "0.16em", textShadow: "0 0 34px rgba(244,235,221,.08)" }}
              >
                {word}
              </strong>
            </div>
          ))}

          <div
            className="pointer-events-none absolute inset-0 grid place-items-center text-center"
            aria-hidden="true"
          >
            <span
              data-final-glow
              className="absolute h-[42vh] w-[70vw] max-w-[760px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.11),rgba(95,132,117,.035)_44%,transparent_76%)]"
            />
            <div className="font-story relative flex flex-col gap-4 text-[clamp(2rem,8vw,4.9rem)] font-light leading-[1.35] text-[rgba(244,235,221,.86)] md:gap-5 md:leading-[1.32]">
              {finalLines.map((line) => (
                <span key={line} data-personality-final>
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
