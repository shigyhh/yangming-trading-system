"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"

import styles from "./HoldToReleaseThought.module.css"

type HoldState = "idle" | "pressing" | "released" | "completed"

export type HoldToReleaseThoughtProps = {
  os: string
  durationMs?: number
  disabled?: boolean
  onComplete: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function HoldToReleaseThought({
  disabled = false,
  durationMs = 1600,
  onComplete,
  os,
}: HoldToReleaseThoughtProps) {
  const [state, setState] = useState<HoldState>("idle")
  const [progress, setProgress] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const startTimeRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const tickRef = useRef<(now: number) => void>(() => undefined)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const cancelFrame = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const complete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    cancelFrame()
    setProgress(1)
    setState("completed")
    onCompleteRef.current()
  }, [cancelFrame])

  useEffect(() => {
    tickRef.current = (now: number) => {
      const nextProgress = clamp((now - startTimeRef.current) / durationMs, 0, 1)

      setProgress(nextProgress)

      if (nextProgress >= 1) {
        complete()
        return
      }

      rafIdRef.current = window.requestAnimationFrame(tickRef.current)
    }
  }, [complete, durationMs])

  const cancelPress = useCallback(() => {
    if (completedRef.current) return
    cancelFrame()
    setState("released")
    setProgress(0)
    window.setTimeout(() => {
      if (!completedRef.current) setState("idle")
    }, 220)
  }, [cancelFrame])

  const releasePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      pointerIdRef.current = null
    }
  }, [])

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (disabled || completedRef.current) return

    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointerIdRef.current = event.pointerId
    startTimeRef.current = performance.now()
    setState("pressing")
    setProgress(0)
    cancelFrame()
    rafIdRef.current = window.requestAnimationFrame(tickRef.current)
  }, [cancelFrame, disabled])

  const onPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    releasePointer(event)
    if (!completedRef.current) cancelPress()
  }, [cancelPress, releasePointer])

  useEffect(() => {
    return () => cancelFrame()
  }, [cancelFrame])

  return (
    <div
      ref={rootRef}
      className={`${styles.root} hold-release-root`}
      data-state={disabled ? "completed" : state}
      style={{ "--progress": progress } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      role="button"
      aria-disabled={disabled || state === "completed"}
      aria-label={state === "completed" || disabled ? "已照见" : "长按这一念，让它沉入水底"}
      tabIndex={disabled || state === "completed" ? -1 : 0}
    >
      <div className={`${styles.waterPressureRing} water-pressure-ring`} aria-hidden="true" />
      <div className={`${styles.inkDissolveLayer} ink-dissolve-layer`}>
        <span className={`${styles.thoughtText} thought-text`}>「{os}」</span>
        <span className={`${styles.thoughtGhost} thought-ghost`} aria-hidden="true">「{os}」</span>
      </div>
      <div className={`${styles.releaseHint} release-hint`}>
        {state === "pressing" ? "按住，等它沉下去" : "长按这一念，让它沉入水底"}
      </div>
      <div className={`${styles.completedSeal} completed-seal`} aria-live="polite">
        已照见
      </div>
    </div>
  )
}
