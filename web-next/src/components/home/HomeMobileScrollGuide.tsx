"use client"

import { useEffect } from "react"

const SESSION_KEY = "home_mobile_scroll_guide_seen"
const MOBILE_QUERY = "(max-width: 768px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const SCENE_TARGET_SELECTOR = "[data-home-scene=\"3\"]"
const GUIDE_DELAY_MS = 1400
const GUIDE_DURATION_MS = 8000
const SCROLL_CANCEL_THRESHOLD = 18

const USER_INTENT_EVENTS = ["touchstart", "wheel", "pointerdown", "keydown", "click"] as const

function hasSeenGuide() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1"
  } catch {
    return true
  }
}

function markGuideSeen() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1")
  } catch {
    // Session storage can be blocked in private or embedded contexts.
  }
}

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

export function HomeMobileScrollGuide() {
  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY)
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)

    if (!mobileQuery.matches || reducedMotionQuery.matches || hasSeenGuide()) return

    let stopped = false
    let started = false
    let delayTimer: number | null = null
    let rafId: number | null = null
    let expectedScrollTop = window.scrollY
    let lastProgrammaticFrame = 0
    const initialScrollTop = window.scrollY

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
      markGuideSeen()
      cleanup()
    }

    function handleUserIntent() {
      stopGuide()
    }

    function handleManualScroll() {
      if (stopped) return

      if (!started) {
        if (Math.abs(window.scrollY - initialScrollTop) > 4) stopGuide()
        return
      }

      const isNearProgrammaticScroll = Math.abs(window.scrollY - expectedScrollTop) <= SCROLL_CANCEL_THRESHOLD
      const isSameFrameScroll = performance.now() - lastProgrammaticFrame < 120

      if (!isNearProgrammaticScroll && !isSameFrameScroll) stopGuide()
    }

    USER_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserIntent, { capture: true, passive: true })
    })
    window.addEventListener("scroll", handleManualScroll, { passive: true })

    delayTimer = window.setTimeout(() => {
      if (stopped) return

      const target = document.querySelector<HTMLElement>(SCENE_TARGET_SELECTOR)
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
      markGuideSeen()
      const startTime = performance.now()

      function tick(now: number) {
        if (stopped) return

        const progress = Math.min((now - startTime) / GUIDE_DURATION_MS, 1)
        const nextTop = startTop + distance * easeInOutCubic(progress)

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
    }, GUIDE_DELAY_MS)

    return () => {
      stopped = true
      cleanup()
    }
  }, [])

  return null
}
