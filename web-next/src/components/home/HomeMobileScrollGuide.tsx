"use client"

import { useEffect } from "react"

const MOBILE_QUERY = "(max-width: 768px)"
const DESKTOP_QUERY = "(min-width: 769px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const MOBILE_SCENE_TARGET_SELECTOR = "[data-home-scene=\"3\"]"
const DESKTOP_SCENE_TARGET_SELECTOR = "[data-home-scene=\"desktop-final\"]"
const MOBILE_GUIDE_DELAY_MS = 900
const DESKTOP_GUIDE_DELAY_MS = 800
const MOBILE_GUIDE_DURATION_MS = 6200
const DESKTOP_GUIDE_DURATION_MS = 4000
const SCROLL_CANCEL_THRESHOLD = 18

const USER_INTENT_EVENTS = ["touchstart", "wheel", "pointerdown", "keydown", "click"] as const

function easeInOutSine(progress: number) {
  return -(Math.cos(Math.PI * progress) - 1) / 2
}

function isInteractiveTarget(event: Event) {
  const target = event.target
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [role='button']"))
}

export function HomeMobileScrollGuide() {
  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY)
    const desktopQuery = window.matchMedia(DESKTOP_QUERY)
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const isMobile = mobileQuery.matches
    const isDesktop = desktopQuery.matches

    if ((!isMobile && !isDesktop) || reducedMotionQuery.matches) return

    const targetSelector = isDesktop ? DESKTOP_SCENE_TARGET_SELECTOR : MOBILE_SCENE_TARGET_SELECTOR
    const guideDelay = isDesktop ? DESKTOP_GUIDE_DELAY_MS : MOBILE_GUIDE_DELAY_MS
    const guideDuration = isDesktop ? DESKTOP_GUIDE_DURATION_MS : MOBILE_GUIDE_DURATION_MS

    let stopped = false
    let started = false
    let delayTimer: number | null = null
    let rafId: number | null = null
    let expectedScrollTop = window.scrollY
    let lastProgrammaticFrame = 0

    function cleanup() {
      if (delayTimer !== null) window.clearTimeout(delayTimer)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      USER_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserIntent, true)
      })
      window.removeEventListener("scroll", handleManualScroll)
    }

    function stopGuide() {
      if (stopped) return
      stopped = true
      cleanup()
    }

    function handleUserIntent(event: Event) {
      if (!started && (event.type === "click" || event.type === "pointerdown") && !isInteractiveTarget(event)) return

      stopGuide()
    }

    function handleManualScroll() {
      if (stopped) return

      if (!started) return

      const isNearProgrammaticScroll = Math.abs(window.scrollY - expectedScrollTop) <= SCROLL_CANCEL_THRESHOLD
      const isSameFrameScroll = performance.now() - lastProgrammaticFrame < 120

      if (!isNearProgrammaticScroll && !isSameFrameScroll) stopGuide()
    }

    USER_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserIntent, { capture: true, passive: true })
    })
    window.addEventListener("scroll", handleManualScroll, { passive: true })

    function startGuide() {
      if (stopped) return

      const target = document.querySelector<HTMLElement>(targetSelector)
      if (!target) {
        stopGuide()
        return
      }

      const startTop = window.scrollY
      const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const targetTop = Math.min(maxScrollTop, Math.max(0, target.getBoundingClientRect().top + startTop))
      const distance = targetTop - startTop

      if (distance <= 24) {
        stopGuide()
        return
      }

      started = true
      const startTime = performance.now()

      function tick(now: number) {
        if (stopped) return

        const progress = Math.min((now - startTime) / guideDuration, 1)
        const nextTop = startTop + distance * easeInOutSine(progress)

        expectedScrollTop = nextTop
        lastProgrammaticFrame = now
        window.scrollTo(0, nextTop)

        if (progress < 1) {
          rafId = window.requestAnimationFrame(tick)
          return
        }

        stopped = true
        cleanup()
      }

      rafId = window.requestAnimationFrame(tick)
    }

    delayTimer = window.setTimeout(startGuide, guideDelay)

    return () => {
      stopped = true
      cleanup()
    }
  }, [])

  return null
}
