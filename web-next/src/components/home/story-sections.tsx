"use client"

import { useCallback, useEffect, useRef, type MouseEvent } from "react"
import { useRouter } from "next/navigation"

import heroStyles from "./HomeStillWaterHero.module.css"

const methodSeals = ["一念", "照回", "心贼", "九镜", "心证", "修行", "落印"]
const HOME_DIVE_DURATION_MS = 2400
const HOME_ROUTE_DELAY_MS = 2200

export function StorySections() {
  const router = useRouter()
  const rootRef = useRef<HTMLElement | null>(null)
  const diveRafRef = useRef<number | null>(null)
  const routeTimerRef = useRef<number | null>(null)
  const isRoutingRef = useRef(false)

  const tweenHomeDive = useCallback((to: number, duration: number) => {
    if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)

    const start = performance.now()

    function tick(now: number) {
      const raw = Math.min((now - start) / duration, 1)
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const dive = to * eased

      window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive } }))

      if (raw < 1) {
        diveRafRef.current = window.requestAnimationFrame(tick)
      }
    }

    diveRafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const enterReflectThroughWater = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      if (isRoutingRef.current) return

      event.preventDefault()

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push("/reflect")
        return
      }

      isRoutingRef.current = true
      document.documentElement.setAttribute("data-home-route-transition", "active")

      window.dispatchEvent(
        new CustomEvent("home-water-ripple", {
          detail: {
            life: 5600,
            max: Math.max(window.innerWidth, window.innerHeight) * 0.82,
            strength: 0.34,
            x: 0.5,
            y: 0.78,
          },
        }),
      )

      tweenHomeDive(1, HOME_DIVE_DURATION_MS)

      routeTimerRef.current = window.setTimeout(() => {
        router.push("/reflect")
      }, HOME_ROUTE_DELAY_MS)
    },
    [router, tweenHomeDive],
  )

  const previewReflectRipple = useCallback(() => {
    if (isRoutingRef.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    window.dispatchEvent(
      new CustomEvent("home-water-ripple", {
        detail: {
          life: 2600,
          max: Math.max(window.innerWidth, window.innerHeight) * 0.22,
          strength: 0.12,
          x: 0.5,
          y: 0.74,
        },
      }),
    )
  }, [])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let revertGsap: (() => void) | undefined
    let canceled = false

    async function setupThreeBreaths() {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")

      if (!rootRef.current || canceled) return

      gsap.registerPlugin(ScrollTrigger)

      const context = gsap.context(() => {
        const secondBreath = gsap.utils.toArray<HTMLElement>("[data-breath-panel='second']")
        const thirdBreath = gsap.utils.toArray<HTMLElement>("[data-breath-panel='third']")
        const secondLines = gsap.utils.toArray<HTMLElement>("[data-breath-line]")
        const thirdPhases = gsap.utils.toArray<HTMLElement>("[data-third-phase]")
        const lawPhase = gsap.utils.toArray<HTMLElement>("[data-third-phase='law']")
        const thoughtPhase = gsap.utils.toArray<HTMLElement>("[data-third-phase='thought']")
        const reflectionPhase = gsap.utils.toArray<HTMLElement>("[data-third-phase='reflection']")
        const closurePhase = gsap.utils.toArray<HTMLElement>("[data-third-phase='closure']")
        const thirdOpeningLines = gsap.utils.toArray<HTMLElement>("[data-third-opening]")
        const sampleThought = gsap.utils.toArray<HTMLElement>("[data-sample-thought]")
        const sampleReflectionLabel = gsap.utils.toArray<HTMLElement>("[data-sample-reflection-label]")
        const sampleReflectionFirst = gsap.utils.toArray<HTMLElement>("[data-sample-reflection='first']")
        const sampleReflectionPain = gsap.utils.toArray<HTMLElement>("[data-sample-reflection='pain']")
        const sampleClosing = gsap.utils.toArray<HTMLElement>("[data-sample-close]")
        const methodChain = gsap.utils.toArray<HTMLElement>("[data-method-chain]")
        const finalCall = gsap.utils.toArray<HTMLElement>("[data-breath-final]")
        const firstSecondLine = secondLines[0] ? [secondLines[0]] : []
        const secondDepthLines = secondLines.slice(1)

        gsap.set("[data-three-breath-stage]", { perspective: 1100 })
        gsap.set([secondBreath, thirdBreath], { transformOrigin: "50% 54%" })
        gsap.set(secondBreath, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" })
        gsap.set(thirdBreath, { opacity: 0, y: 70, scale: 0.96, filter: "blur(18px)" })
        gsap.set(thirdPhases, {
          opacity: 0,
          y: 28,
          scale: 0.98,
          filter: "blur(8px)",
          pointerEvents: "none",
          transformOrigin: "50% 56%",
          willChange: "transform, opacity, filter",
        })
        gsap.set(firstSecondLine, {
          opacity: 0.98,
          y: 0,
          scale: 1.006,
          filter: "blur(0px)",
          transformOrigin: "50% 58%",
          willChange: "transform, opacity, filter",
        })
        gsap.set(secondDepthLines, {
          opacity: 0,
          y: 22,
          scale: 0.99,
          filter: "blur(6px)",
          transformOrigin: "50% 58%",
          willChange: "transform, opacity, filter",
        })
        gsap.set([...thirdOpeningLines, ...sampleThought, ...sampleReflectionLabel, ...sampleReflectionFirst, ...sampleReflectionPain, ...sampleClosing, ...methodChain, ...finalCall], {
          opacity: 0,
          y: 18,
          scale: 0.985,
          filter: "blur(8px)",
          transformOrigin: "50% 58%",
          willChange: "transform, opacity, filter",
        })

        const activePhase = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.72, ease: "power3.out" }
        const previousPhase = { opacity: 0.18, y: -26, scale: 0.96, filter: "blur(6px)", duration: 0.78, ease: "power2.inOut" }
        const thoughtGhostPhase = { opacity: 0.08, y: -20, scale: 0.97, filter: "blur(8px)", duration: 0.82, ease: "power2.inOut" }
        const quietPhase = { opacity: 0, y: 28, scale: 0.98, filter: "blur(8px)", duration: 0.55, ease: "power2.out" }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.05,
            pin: "[data-three-breath-stage]",
            anticipatePin: 1,
          },
        })

        const secondLineRevealPlan = [
          { index: 0, at: 0, opacity: 0.98, scale: 1.006 },
          { index: 1, at: 1.1, opacity: 0.96, scale: 1.006 },
          { index: 2, at: 2.35, opacity: 1, scale: 1.012 },
          { index: 3, at: 4.1, opacity: 0.98, scale: 1.018 },
        ]

        secondLineRevealPlan.forEach(({ index, at, opacity, scale }) => {
          const line = secondLines[index]
          if (!line) return

          const previousLines = secondLines.slice(0, index)
          if (previousLines.length) {
            timeline.to(
              previousLines,
              {
                opacity: 0.82,
                y: 0,
                scale: 0.998,
                filter: "blur(0px)",
                duration: 0.55,
                ease: "power2.out",
              },
              at,
            )
          }

          timeline
            .to(
              line,
              {
                opacity,
                y: 0,
                scale,
                filter: "blur(0px)",
                duration: index === 3 ? 0.9 : 0.7,
                ease: "power3.out",
              },
              at,
            )
        })

        timeline
          .to(secondBreath, { opacity: 0, y: -78, scale: 1.032, filter: "blur(10px)", duration: 0.95, ease: "power2.inOut" }, 7.25)
          .to(thirdBreath, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.15, ease: "power3.out" }, 8.45)
          .to(lawPhase, activePhase, 8.75)
          .to(thirdOpeningLines, { opacity: 0.96, y: 0, scale: 1, filter: "blur(0px)", stagger: 0.18, duration: 0.7, ease: "power3.out" }, 8.88)
          .to(lawPhase, previousPhase, 10.25)
          .to(thoughtPhase, activePhase, 10.42)
          .to(sampleThought, { opacity: 1, y: 0, scale: 1.018, filter: "blur(0px)", duration: 0.78, ease: "power3.out" }, 10.52)
          .to(lawPhase, quietPhase, 11.48)
          .to(thoughtPhase, thoughtGhostPhase, 11.48)
          .to(reflectionPhase, activePhase, 11.62)
          .to(sampleReflectionLabel, { opacity: 0.5, y: 0, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }, 11.76)
          .to(sampleReflectionFirst, { opacity: 0.9, y: 0, scale: 1, filter: "blur(0px)", duration: 0.72, ease: "power3.out" }, 11.9)
          .to(sampleReflectionPain, { opacity: 1, y: 0, scale: 1.01, filter: "blur(0px)", duration: 0.95, ease: "power3.out" }, 12.72)
          .to(reflectionPhase, previousPhase, 15.05)
          .set(closurePhase, { pointerEvents: "auto" }, 15.2)
          .to(closurePhase, activePhase, 15.2)
          .to(sampleClosing, { opacity: 0.52, y: 0, scale: 1, filter: "blur(0px)", stagger: 0.14, duration: 0.72, ease: "power2.out" }, 15.38)
          .to(finalCall, { opacity: 1, y: 0, scale: 1.01, filter: "blur(0px)", stagger: 0.2, duration: 0.92, ease: "power3.out" }, 16.12)
          .to(methodChain, { opacity: 0.18, y: 0, scale: 1, filter: "blur(0px)", duration: 0.72, ease: "power2.out" }, 16.44)
          .to(closurePhase, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.3, ease: "none" }, 17.25)
          .to([lawPhase, thoughtPhase], quietPhase, 15.2)
      }, rootRef)

      revertGsap = () => context.revert()
    }

    void setupThreeBreaths()

    return () => {
      canceled = true
      revertGsap?.()
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-home-story-scrollbar", "quiet")

    return () => {
      document.documentElement.removeAttribute("data-home-story-scrollbar")
    }
  }, [])

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) window.clearTimeout(routeTimerRef.current)
      if (diveRafRef.current) window.cancelAnimationFrame(diveRafRef.current)
      document.documentElement.removeAttribute("data-home-route-transition")
      window.dispatchEvent(new CustomEvent("home-water-dive", { detail: { dive: 0 } }))
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="three-breaths"
      data-home-roll="three-breaths"
      aria-label="三息入照"
      className="relative z-20 min-h-[230svh] overflow-x-clip overflow-y-visible px-5 md:px-8"
    >
      <div data-three-breath-stage className="relative flex min-h-[100svh] items-start justify-center pt-[14svh] pb-24 md:pt-[12svh] md:pb-28">
        <div data-breath-panel="second" className="absolute -top-[12svh] inset-x-0 mx-auto flex min-h-[100svh] max-w-[1080px] flex-col items-center justify-center text-center md:-top-[10svh]">
          <div className="relative flex min-h-[24rem] w-full flex-col items-center justify-center gap-6 md:min-h-[30rem] md:gap-7">
            {[
              "你以为你输给了行情。",
              "其实很多时候，",
              "是下单前那一念，",
              "先替你做了主。",
            ].map((line, index) => (
              <p
                key={line}
                data-breath-line
                className={[
                  "font-worldview m-0 mx-auto max-w-[1280px] text-[clamp(1.7rem,5.2vw,3.75rem)] font-normal leading-[1.18] tracking-[.06em] text-[rgba(238,243,238,.94)] md:whitespace-nowrap",
                  index === 2 ? "[text-shadow:0_0_34px_rgba(216,183,111,.18),0_0_68px_rgba(0,0,0,.54)]" : "",
                  index === 3 ? "text-[rgba(238,243,238,.96)] [text-shadow:0_0_58px_rgba(0,0,0,.62)]" : "",
                  index < 2 ? "[text-shadow:0_0_54px_rgba(0,0,0,.62)]" : "",
                ].join(" ")}
              >
                {index === 2 ? (
                  <>
                    是
                    <span className="text-[rgba(255,239,188,.98)]">下单前那一念</span>，
                  </>
                ) : (
                  line
                )}
              </p>
            ))}
          </div>

        </div>

        <div data-breath-panel="third" className="absolute inset-x-0 top-0 mx-auto min-h-[100svh] max-w-[1100px] text-center">
          <div data-third-phase="law" className="absolute inset-x-0 top-[17svh] mx-auto flex max-w-[820px] flex-col items-center px-2 md:top-[18svh]">
            <div className="font-worldview flex flex-col gap-3 text-[clamp(1.48rem,4.4vw,2.85rem)] font-normal leading-[1.18] tracking-[.1em] text-[rgba(238,243,238,.94)] [text-shadow:0_0_42px_rgba(0,0,0,.58)] md:gap-4">
              <p data-third-opening className="m-0">照见不是预测。</p>
              <p data-third-opening className="m-0 hidden md:block">
                是把
                <span className="text-[rgba(242,209,132,.88)]">下单前那一句话</span>，
                <br />
                照出来。
              </p>
              <p data-third-opening className="m-0 md:hidden">
                是把下单前那一句话
                <br />
                照出来。
              </p>
            </div>
          </div>

          <div data-third-phase="thought" className="absolute inset-0 flex items-center justify-center px-2">
            <div data-sample-thought className="relative flex flex-col items-center gap-3">
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-36 w-72 -translate-x-1/2 -translate-y-1/2 border border-[rgba(216,183,111,.035)] opacity-90 blur-[2px]" style={{ borderRadius: "999px" }} />
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-64 -translate-x-1/2 translate-y-16 bg-[linear-gradient(90deg,transparent,rgba(216,183,111,.06),transparent)]" />
              <span className="font-story relative text-[13px] font-light tracking-[.18em] text-[rgba(216,183,111,.42)] md:text-[15px]">比如：</span>
              <p className="font-worldview relative m-0 text-[clamp(2.6rem,8vw,5.4rem)] font-normal leading-none tracking-[.08em] text-[rgba(238,243,238,.98)] [text-shadow:0_0_30px_rgba(238,243,238,.14),0_0_70px_rgba(0,0,0,.68)]">
                「再等等。」
              </p>
            </div>
          </div>

          <div data-third-phase="reflection" className="absolute inset-0 flex items-center justify-center px-2">
            <div className="font-story flex flex-col items-center gap-4 md:gap-5">
              <span data-sample-reflection-label className="text-[13px] font-light tracking-[.12em] text-[rgba(216,183,111,.5)] md:text-[15px]">照回：</span>
              <p data-sample-reflection="first" className="m-0 text-[clamp(34px,3.8vw,52px)] font-light leading-[1.28] tracking-[.06em] text-[rgba(244,235,221,.9)]">
                你等的不是机会。
              </p>
              <p data-sample-reflection="pain" className="m-0 font-light leading-[1.28] tracking-[.06em] text-[rgba(238,243,238,.94)]">
                <span className="block text-[clamp(34px,3.9vw,54px)] text-[rgba(244,235,221,.92)]">你等的是，</span>
                <br />
                <span className="block text-[clamp(42px,4.8vw,68px)] text-[rgba(238,203,128,.98)] [text-shadow:0_0_24px_rgba(216,183,111,.1),0_0_62px_rgba(0,0,0,.62)]">一个不用认错的台阶。</span>
              </p>
            </div>
          </div>

          <div data-third-phase="closure" className="absolute inset-0 flex flex-col items-center justify-center px-2 pb-8 md:pb-10">
            <div data-breath-final className="flex flex-col items-center gap-3 md:gap-4">
              <p className="font-worldview m-0 text-[clamp(36px,4vw,58px)] font-normal leading-[1.18] tracking-[.1em] text-[rgba(244,235,221,.96)]">
                今天，
                <br />
                你起了哪一念？
              </p>
              <a
                href="/reflect"
                className={heroStyles.door}
                data-story-door="third"
                onClick={enterReflectThroughWater}
                onMouseEnter={previewReflectRipple}
              >
                <span className={heroStyles.doorMain}>照见一念　→</span>
                <span className={heroStyles.doorLine} aria-hidden="true" />
              </a>
            </div>

            <div data-sample-close className="font-story mt-12 flex flex-col items-center justify-center gap-1 text-[13px] font-light leading-6 tracking-[.12em] text-[rgba(220,212,195,.38)] md:mt-14 md:text-[15px]">
              <span>心贼：<strong className="font-worldview font-normal text-[rgba(242,209,132,.58)]">执</strong></span>
              <span>今日修行：不拿结果否定过程。</span>
            </div>

            <p data-method-chain className="font-story absolute inset-x-0 bottom-[3.4rem] m-0 text-[10px] font-light leading-5 tracking-[.24em] text-[rgba(220,212,195,.14)] md:bottom-[3.7rem] md:text-xs">
              {methodSeals.join(" · ")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
