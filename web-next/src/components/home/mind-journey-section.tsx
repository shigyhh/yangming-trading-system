"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"

type JourneyMoment = {
  kind?: "reflection" | "final"
  lines: string[]
  scene?: string[]
  emotion?: string[]
}

const personalityMomentPool: JourneyMoment[] = [
  {
    kind: "reflection",
    scene: ["空仓时，", "总觉得错过机会。"],
    emotion: ["焦虑"],
    lines: ["焦虑型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["明知该止损，", "却还在等反弹。"],
    emotion: ["执念"],
    lines: ["扛单型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["一笔没做到完美，", "就反复怀疑计划。"],
    emotion: ["苛责"],
    lines: ["完美型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["亏损之后，", "总想一笔翻回来。"],
    emotion: ["侥幸"],
    lines: ["赌徒型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["别人都在买，", "自己也开始动摇。"],
    emotion: ["从众"],
    lines: ["从众型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["明明盘面变了，", "还是只信原来的判断。"],
    emotion: ["偏执"],
    lines: ["偏执型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["计划早就写好，", "临盘却迟迟不执行。"],
    emotion: ["拖延"],
    lines: ["拖延型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["看到拉升，", "手已经先点进去了。"],
    emotion: ["冲动"],
    lines: ["冲动型交易人格"],
  },
  {
    kind: "reflection",
    scene: ["行情再热，", "也能等到自己的位置。"],
    emotion: ["定力"],
    lines: ["平衡型交易人格"],
  },
]

const defaultReflectionMoments = personalityMomentPool.slice(0, 4)

function pickRandomPersonalityMoments(count = 4) {
  const shuffled = [...personalityMomentPool]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled.slice(0, count)
}

function buildJourneyMoments(reflections: JourneyMoment[]): JourneyMoment[] {
  return [
    { lines: ["你以为你亏给了行情"] },
    { lines: ["其实"] },
    { lines: ["你亏给了自己"] },
    { lines: ["临盘那一念"] },
    { lines: ["不是技术不够", "是那一念，先动了"] },
    ...reflections,
    { kind: "final", lines: ["这些人格，", "不是孤立出现的。", "它们会形成循环。"] },
  ]
}

function getMomentSpeech(moment: JourneyMoment) {
  if (moment.kind === "reflection") {
    return [...(moment.scene ?? []), ...(moment.emotion ?? []), ...moment.lines].join("")
  }

  return moment.lines.join("")
}

const momentGap = 6.12

const dust = [
  ["10%", "22%", "0s"],
  ["24%", "72%", "2.2s"],
  ["42%", "18%", "3.8s"],
  ["62%", "78%", "1.1s"],
  ["80%", "28%", "2.9s"],
  ["90%", "60%", "4.6s"],
]

export function MindJourneySection() {
  const rootRef = useRef<HTMLElement | null>(null)
  const [reflectionMoments, setReflectionMoments] = useState(defaultReflectionMoments)
  const moments = useMemo(() => buildJourneyMoments(reflectionMoments), [reflectionMoments])
  const journeyNarration = useMemo(() => `心性探索长卷：${moments.map(getMomentSpeech).join("")}`, [moments])
  const sectionMinHeight = `${Math.max(720, moments.length * 72)}svh`

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setReflectionMoments(pickRandomPersonalityMoments())
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const section = rootRef.current
    if (!section) return

    let frame = 0
    let pendingDelta = 0

    const normalizeWheelDelta = (event: WheelEvent) => {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight
      return event.deltaY
    }

    const handleWheel = (event: WheelEvent) => {
      const rect = section.getBoundingClientRect()
      const isSectionVisible = rect.top < window.innerHeight && rect.bottom > 0

      if (!isSectionVisible || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

      pendingDelta += normalizeWheelDelta(event)

      if (event.cancelable) {
        event.preventDefault()
      }

      if (frame) return

      frame = window.requestAnimationFrame(() => {
        window.scrollBy({ top: pendingDelta, left: 0, behavior: "instant" })
        pendingDelta = 0
        frame = 0
      })
    }

    section.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      section.removeEventListener("wheel", handleWheel)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let revertGsap: (() => void) | undefined
    let canceled = false

    async function setupJourney() {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")

      if (!rootRef.current || canceled) return

      gsap.registerPlugin(ScrollTrigger)

      const context = gsap.context(() => {
        const momentEls = gsap.utils.toArray<HTMLElement>("[data-journey-moment]")
        const copyEls = gsap.utils.toArray<HTMLElement>("[data-journey-copy]")
        const sceneEls = gsap.utils.toArray<HTMLElement>("[data-journey-scene]")
        const emotionEls = gsap.utils.toArray<HTMLElement>("[data-journey-emotion]")
        const personalityEls = gsap.utils.toArray<HTMLElement>("[data-journey-personality]")
        const glows = gsap.utils.toArray<HTMLElement>("[data-journey-glow]")
        const mountain = gsap.utils.toArray<HTMLElement>("[data-journey-mountain]")
        const qi = gsap.utils.toArray<HTMLElement>("[data-journey-qi]")
        const veil = gsap.utils.toArray<HTMLElement>("[data-journey-veil]")
        const lens = gsap.utils.toArray<HTMLElement>("[data-journey-lens]")
        const particles = gsap.utils.toArray<HTMLElement>("[data-journey-dust]")

        gsap.set(momentEls, { opacity: 1 })
        gsap.set(copyEls, {
          opacity: 0,
          y: 34,
          scale: 0.97,
          filter: "blur(7px)",
        })
        gsap.set(sceneEls, {
          opacity: 0,
          y: 22,
          scale: 0.98,
          filter: "blur(5px)",
        })
        gsap.set(emotionEls, {
          opacity: 0,
          y: 20,
          scale: 0.96,
          filter: "blur(4px)",
        })
        gsap.set(personalityEls, {
          opacity: 0,
          y: 18,
          scale: 0.98,
          filter: "blur(2px)",
        })
        gsap.set(glows, { opacity: 0, scale: 0.96, filter: "blur(18px)" })
        gsap.set(mountain, { opacity: 0.034, y: 14, scale: 0.995 })
        gsap.set(qi, { opacity: 0.025, x: "-5%" })
        gsap.set(veil, { opacity: 0.06, scale: 0.96 })
        gsap.set(lens, { scale: 1, y: 0 })
        gsap.set(particles, { opacity: 0, y: 12, scale: 0.62 })

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 82%",
            end: "bottom bottom",
            scrub: 1.8,
          },
        })

        timeline
          .to(lens, { scale: 1.035, y: -10, duration: 29, ease: "none" }, 0)
          .to(mountain, { opacity: 0.062, y: 0, scale: 1.008, duration: 7.2, ease: "power2.out" }, 0.2)
          .to(veil, { opacity: 0.13, scale: 1, duration: 5.2, ease: "power2.out" }, 0.4)
          .to(qi, { opacity: 0.075, x: "3%", duration: 18, ease: "power1.inOut" }, 0.5)
          .to(
            particles,
            {
              opacity: 0.1,
              y: 0,
              scale: 1,
              stagger: 0.38,
              duration: 2.6,
              ease: "power2.out",
            },
            0.9
          )

        moments.forEach((moment, index) => {
          const startAt = 0.25 + index * momentGap
          const isFinal = moment.kind === "final"
          const isReflection = moment.kind === "reflection"
          const copy = momentEls[index]?.querySelector<HTMLElement>("[data-journey-copy]")
          const scene = momentEls[index]?.querySelector<HTMLElement>("[data-journey-scene]")
          const emotion = momentEls[index]?.querySelector<HTMLElement>("[data-journey-emotion]")
          const personality = momentEls[index]?.querySelector<HTMLElement>("[data-journey-personality]")

          timeline
            .to(
              glows[index],
              {
                opacity: isFinal ? 0.12 : isReflection ? 0.08 : 0.065,
                scale: 1,
                filter: "blur(18px)",
                duration: 1.9,
                ease: "power2.out",
              },
              startAt - 0.24
            )
            .to(
              veil,
              {
                opacity: isFinal ? 0.18 : isReflection ? 0.14 : 0.12,
                scale: isReflection ? 1.012 : 1.008,
                duration: 1.9,
                ease: "power2.out",
              },
              startAt - 0.18
            )

          if (isReflection) {
            if (scene) {
              timeline.to(
                scene,
                {
                  opacity: 0.88,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  duration: 1.05,
                  ease: "power3.out",
                },
                startAt
              )
            }

            if (emotion) {
              timeline.to(
                emotion,
                {
                  opacity: 0.96,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  duration: 1.02,
                  ease: "power3.out",
                },
                startAt + 1.68
              )
            }

            if (personality) {
              timeline
                .to(
                  glows[index],
                  {
                    opacity: 0.08,
                    scale: 1.006,
                    filter: "blur(18px)",
                    duration: 1.15,
                    ease: "power2.out",
                  },
                  startAt + 3.55
                )
                .to(
                  veil,
                  {
                    opacity: 0.12,
                    scale: 1.006,
                    duration: 1.15,
                    ease: "power2.out",
                  },
                  startAt + 3.55
                )
                .to(
                  personality,
                  {
                    opacity: 0.92,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    duration: 1.05,
                    ease: "power3.out",
                  },
                  startAt + 3.2
                )
                .to(
                  personality,
                  {
                    opacity: 0,
                    y: -16,
                    scale: 1.004,
                    filter: "blur(2px)",
                    duration: 0.98,
                    ease: "power2.inOut",
                  },
                  startAt + 5.92
                )
            }

            if (emotion) {
              timeline.to(
                emotion,
                {
                  opacity: 0,
                  y: -12,
                  scale: 1.004,
                  filter: "blur(2px)",
                  duration: 0.82,
                  ease: "power2.inOut",
                },
                startAt + 6.02
              )
            }

            if (scene) {
              timeline.to(
                scene,
                {
                  opacity: 0,
                  y: -12,
                  scale: 1.004,
                  filter: "blur(2px)",
                  duration: 0.86,
                  ease: "power2.inOut",
                },
                startAt + 6.12
              )
            }

            timeline
              .to(
                glows[index],
                {
                  opacity: 0,
                  scale: 1.035,
                  filter: "blur(18px)",
                  duration: 0.98,
                  ease: "power1.out",
                },
                startAt + 5.92
              )
              .to(
                veil,
                {
                  opacity: 0.09,
                  scale: 1.004,
                  duration: 1.05,
                  ease: "power1.inOut",
                },
                startAt + 6.12
              )

            return
          }

          if (copy) {
            timeline.to(
              copy,
              {
                opacity: isFinal ? 0.88 : 0.78,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: 1.75,
                ease: "power3.out",
              },
              startAt
            )
          }

          if (!isFinal) {
            timeline
              .to(
                copy,
                {
                  opacity: 0,
                  y: -28,
                  scale: 1.012,
                  filter: "blur(8px)",
                  duration: 1.35,
                  ease: "power2.inOut",
                },
                startAt + 4.65
              )
              .to(
                glows[index],
                {
                  opacity: 0,
                  scale: 1.08,
                  filter: "blur(24px)",
                  duration: 1.45,
                  ease: "power1.out",
                },
                startAt + 4.55
              )
              .to(
                veil,
                {
                  opacity: 0.075,
                  scale: 1.004,
                  duration: 1.8,
                  ease: "power1.inOut",
                },
                startAt + 4.85
              )
          }
        })

        timeline.to(
          lens,
          {
            scale: 1.04,
            duration: 4,
            ease: "none",
          },
          1.2 + (moments.length - 1) * momentGap + 3.2
        )
      }, rootRef)

      revertGsap = () => context.revert()
    }

    void setupJourney()

    return () => {
      canceled = true
      revertGsap?.()
    }
  }, [moments])

  return (
    <section
      id="personality"
      ref={rootRef}
      aria-label="心性探索长卷"
      className="relative z-10 overflow-clip px-4 md:px-8"
      style={{ minHeight: sectionMinHeight }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,7,.01),rgba(8,8,7,.18)_22%,rgba(8,8,7,.34)_68%,rgba(8,8,7,.1))]" />

      <div className="sticky top-0 mx-auto grid min-h-[100svh] w-full max-w-[1240px] place-items-center py-24 md:py-28">
        <motion.div
          data-journey-mountain
          aria-hidden="true"
          className="absolute inset-x-[-18vw] bottom-[3vh] h-[42vh] opacity-[.028] blur-[2.8px]"
          animate={{ x: ["0vw", "1.2vw", "0vw"], y: ["0vh", "-.9vh", "0vh"] }}
          transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="h-full w-[136vw]" viewBox="0 0 1440 380" preserveAspectRatio="none">
            <path
              d="M0 262C132 226 214 126 340 148c124 22 170 104 304 52 106-42 166-156 286-108 106 42 134 140 268 92 110-38 172-82 242-68v264H0Z"
              fill="rgba(244,235,221,.34)"
            />
            <path
              d="M0 318C162 270 238 224 376 246c136 22 184-50 312-32 118 16 178 78 308 42 134-36 232-76 444-36v160H0Z"
              fill="rgba(95,132,117,.22)"
            />
          </svg>
        </motion.div>

        <div
          data-journey-veil
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[50vh] w-[58vw] max-w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.032),rgba(95,132,117,.018)_42%,rgba(8,8,7,0)_72%)] blur-3xl"
        />

        <motion.span
          data-journey-qi
          aria-hidden="true"
          className="absolute left-1/2 top-[50%] h-px w-[48vw] max-w-[620px] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.055),transparent)]"
          animate={{ opacity: [0.025, 0.07, 0.025], x: ["-.8%", ".8%", "-.8%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />

        {dust.map(([left, top, delay], index) => (
          <motion.span
            key={`${left}-${top}`}
            data-journey-dust
            aria-hidden="true"
            className="absolute size-1 rounded-full bg-[#d8b76f]/10 blur-[.8px]"
            style={{ left, top }}
            animate={{ y: [-6, 8, -6], opacity: [0.025, 0.09, 0.025] }}
            transition={{
              delay: Number.parseFloat(delay),
              duration: 9 + index * 1.7,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}

        <div
          data-journey-lens
          className="relative grid min-h-[72svh] w-full place-items-center text-center"
        >
          <span className="sr-only">
            {journeyNarration}
          </span>

          {moments.map((moment, index) => {
            const isReflection = moment.kind === "reflection"
            const isFinal = moment.kind === "final"

            return (
              <div
                key={`${moment.lines.join("")}-${index}`}
                className="pointer-events-none absolute inset-0 grid place-items-center"
                aria-hidden="true"
              >
                <span
                  data-journey-glow
                  className={[
                    "absolute rounded-full",
                    isFinal
                      ? "h-[34vh] w-[52vw] max-w-[620px] bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.055),rgba(95,132,117,.018)_44%,transparent_76%)]"
                      : isReflection
                        ? "h-[32vh] w-[50vw] max-w-[600px] bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.052),rgba(95,132,117,.016)_42%,transparent_74%)]"
                        : "h-[30vh] w-[48vw] max-w-[560px] bg-[radial-gradient(ellipse_at_center,rgba(216,183,111,.038),rgba(95,132,117,.014)_46%,transparent_74%)]",
                  ].join(" ")}
                />
                <div
                  data-journey-moment
                  className={[
                    "relative mx-auto flex max-w-[960px] flex-col items-center justify-center",
                    isFinal
                      ? "font-worldview type-level-3-cinematic gap-3 md:gap-5 md:leading-[1.26]"
                      : isReflection
                        ? "type-level-2 type-level-2-cinematic"
                        : "font-worldview type-level-3-cinematic",
                  ].join(" ")}
                  style={
                    isReflection
                      ? { textShadow: "0 0 24px rgba(244,235,221,.1)" }
                      : { textShadow: "0 0 24px rgba(216,183,111,.04)" }
                  }
                >
                  {isReflection && moment.scene ? (
                    <span data-journey-scene className="type-level-3 type-level-3-scene mb-5 flex flex-col gap-2 tracking-normal text-[rgba(244,235,221,.92)] md:mb-7 md:gap-3">
                      {moment.scene.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  ) : null}
                  {isReflection && moment.emotion ? (
                    <span data-journey-emotion className="font-worldview mb-6 flex flex-col gap-1 text-[clamp(4.4rem,18vw,10rem)] font-normal leading-[.95] tracking-[.045em] text-[rgba(244,235,221,.94)] md:mb-8 md:text-[clamp(6.8rem,11vw,11rem)] md:tracking-[.075em]">
                      {moment.emotion.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  ) : null}
                  <span
                    data-journey-copy={isReflection ? undefined : true}
                    data-journey-personality={isReflection ? true : undefined}
                    className={
                      isReflection
                        ? "font-worldview text-[clamp(1.45rem,5.4vw,3.25rem)] leading-[1.32] tracking-[.12em] text-[rgba(216,183,111,.84)] md:text-[clamp(2.15rem,3.8vw,4.1rem)] md:tracking-[.16em]"
                        : "flex flex-col gap-4 md:gap-5"
                    }
                  >
                    {moment.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
