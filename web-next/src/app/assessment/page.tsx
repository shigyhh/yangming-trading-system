"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { AssessmentShell, GlassPanel, PrimaryButton, SecondaryButton, StatusPill } from "@/features/assessment/components"
import { MirrorGateway } from "@/features/assessment/MirrorGateway"
import { MirrorRevelation } from "@/features/assessment/MirrorRevelation"
import { assessmentQuestions } from "@/features/assessment/questions"
import { generateMirrorReport } from "@/features/assessment/report"
import type { AssessmentAnswer } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage, hasSavedPhone, setStorage } from "@/features/assessment/storage"
import { cn } from "@/lib/utils"

function sanitizeAnswers(answers: AssessmentAnswer[]) {
  return answers.filter((answer) => {
    const question = assessmentQuestions.find((item) => item.id === answer.questionId)
    return Boolean(question?.options.some((option) => option.id === answer.optionId))
  })
}

function shuffleQuestionIds() {
  const ids = assessmentQuestions.map((item) => item.id)

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]]
  }

  return ids.slice(0, 12)
}

function normalizeQuestionOrder(savedOrder: string[]) {
  const questionIds = new Set(assessmentQuestions.map((item) => item.id))
  const cleanOrder = savedOrder.filter((id) => questionIds.has(id))

  if (cleanOrder.length) {
    const missingIds = assessmentQuestions
      .map((item) => item.id)
      .filter((id) => !cleanOrder.includes(id))

    return [...cleanOrder, ...missingIds].slice(0, 12)
  }

  return shuffleQuestionIds()
}

export default function AssessmentPage() {
  const router = useRouter()
  const questionTopRef = useRef<HTMLDivElement | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [questionOrder, setQuestionOrder] = useState(() => assessmentQuestions.map((item) => item.id).slice(0, 12))
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isSealing, setIsSealing] = useState(false)
  const [gatewayDone, setGatewayDone] = useState(false)
  const [showLoadingRecovery, setShowLoadingRecovery] = useState(false)

  useEffect(() => {
    if (!hasSavedPhone()) {
      router.replace("/assessment-login")
      const fallbackTimer = window.setTimeout(() => {
        if (window.location.pathname === "/assessment") {
          window.location.assign("/assessment-login")
        }
      }, 420)

      return () => window.clearTimeout(fallbackTimer)
    }

    const recoveryTimer = window.setTimeout(() => {
      setShowLoadingRecovery(true)
    }, 1400)

    if (loaded) {
      window.clearTimeout(recoveryTimer)
      return
    }

    const timer = window.setTimeout(() => {
      const restoredAnswers = sanitizeAnswers(getStorage<AssessmentAnswer[]>(assessmentStorageKeys.answers, []))
      const restoredIndex = getStorage<number>(assessmentStorageKeys.currentIndex, 0)
      const restoredOrder = normalizeQuestionOrder(getStorage<string[]>(assessmentStorageKeys.questionOrder, []))

      setQuestionOrder(restoredOrder)
      setAnswers(restoredAnswers)
      setCurrentIndex(Math.min(Math.max(Number(restoredIndex) || 0, 0), restoredOrder.length - 1))
      const cameFromCycle = new URLSearchParams(window.location.search).get("fromCycle") === "1"
      setGatewayDone(cameFromCycle || restoredAnswers.length > 0 || Number(restoredIndex) > 0)
      setStorage(assessmentStorageKeys.questionOrder, restoredOrder)
      setLoaded(true)
      setShowLoadingRecovery(false)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(recoveryTimer)
    }
  }, [loaded, router])

  const orderedQuestions = useMemo(
    () =>
      questionOrder
        .map((id) => assessmentQuestions.find((item) => item.id === id))
        .filter((item): item is (typeof assessmentQuestions)[number] => Boolean(item)),
    [questionOrder],
  )
  const question = orderedQuestions[currentIndex]
  const selectedOptionId = useMemo(
    () => answers.find((answer) => answer.questionId === question?.id)?.optionId ?? "",
    [answers, question?.id],
  )
  const answeredCount = answers.length
  const progress = Math.round(((currentIndex + 1) / orderedQuestions.length) * 100)
  const isLast = currentIndex === orderedQuestions.length - 1
  const isCompactQuestion = currentIndex > 0

  useEffect(() => {
    if (!loaded) return

    window.requestAnimationFrame(() => {
      questionTopRef.current?.scrollIntoView({ block: "start" })
      window.scrollTo({ top: 0, left: 0 })
    })
  }, [currentIndex, loaded])

  const selectOption = (optionId: string) => {
    if (!question) return

    const nextAnswers = [
      ...answers.filter((answer) => answer.questionId !== question.id),
      { questionId: question.id, optionId },
    ]

    setAnswers(nextAnswers)
    setStorage(assessmentStorageKeys.answers, nextAnswers)
  }

  const setIndex = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), orderedQuestions.length - 1)
    setCurrentIndex(nextIndex)
    setStorage(assessmentStorageKeys.currentIndex, nextIndex)
  }

  const goNext = () => {
    if (!selectedOptionId || isSealing) return

    if (isLast) {
      setStorage(assessmentStorageKeys.answers, answers)
      setIsSealing(true)
      window.setTimeout(() => {
        router.push("/assessment-generating")
      }, 1550)
      return
    }

    setIndex(currentIndex + 1)
  }

  if (!loaded || !question) {
    return (
      <AssessmentShell>
        <div className="grid gap-5">
          <StatusPill>正在进入照心</StatusPill>
          {showLoadingRecovery || !question ? (
            <SecondaryButton type="button" onClick={() => router.replace(hasSavedPhone() ? "/assessment-entry" : "/assessment-login")}>
              重新进入照心
            </SecondaryButton>
          ) : null}
        </div>
      </AssessmentShell>
    )
  }

  if (!gatewayDone && currentIndex === 0 && answers.length === 0) {
    return (
      <AssessmentShell className="py-5" contentWidth="wide">
        <MirrorGateway
          onComplete={(mirrorId) => {
            const mirrorReport = generateMirrorReport(mirrorId)
            setStorage(assessmentStorageKeys.selectedMirrorId, mirrorId)
            setStorage(assessmentStorageKeys.report, mirrorReport)
            setStorage(assessmentStorageKeys.reportCreatedAt, mirrorReport.createdAt)
            router.push(`/cycle-mirror?mirror=${encodeURIComponent(mirrorId)}`)
          }}
        />
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5">
      <div className={cn("assessment-one-thought flex flex-col", isCompactQuestion && "is-compact")}>
        <div
          ref={questionTopRef}
          className="flex scroll-mt-5 items-center justify-between gap-3 font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.46)]"
        >
          <span>
            第 {currentIndex + 1} / {orderedQuestions.length} 念
          </span>
          <span>已照见 {answeredCount} 念</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#967c3f,#b49d5d)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <GlassPanel key={`stage-${question.id}`} className={cn("thought-stage mt-7", isCompactQuestion ? "p-5" : "p-6")}>
          <div className="thought-scene">
            <StatusPill>{question.scene}</StatusPill>
            <p className="mt-5 font-function text-xs tracking-[.18em] text-[rgba(180,157,93,.5)]">先看见这个瞬间</p>
            <p
              className={cn(
                "font-story font-light tracking-[.08em] text-[rgba(220,212,195,.62)]",
                isCompactQuestion ? "mt-3 text-[.98rem] leading-8" : "mt-5 text-[1.08rem] leading-9",
              )}
            >
              {question.desc}
            </p>
          </div>

          <div className="thought-question">
            <p className="mb-3 font-function text-xs tracking-[.18em] text-[rgba(180,157,93,.62)]">停一下，问此心</p>
            <h1
              className={cn(
                "font-story font-light tracking-[.065em]",
                isCompactQuestion
                  ? "text-[clamp(1.52rem,6.6vw,2.16rem)] leading-[1.42]"
                  : "text-[clamp(1.82rem,7.8vw,2.62rem)] leading-[1.48]",
              )}
            >
              {question.title}
            </h1>
          </div>
        </GlassPanel>

        <MirrorRevelation
          key={`mirrors-${question.id}`}
          questionId={question.id}
          options={question.options}
          selectedOptionId={selectedOptionId}
          compact={isCompactQuestion}
          onReveal={selectOption}
        />

        <div className="thought-action-bar sticky bottom-0 mt-6 grid grid-cols-[1fr_.84fr] gap-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-5">
          <SecondaryButton type="button" onClick={() => setIndex(currentIndex - 1)} disabled={currentIndex === 0 || isSealing}>
            再看此念
          </SecondaryButton>
          <PrimaryButton type="button" onClick={goNext} disabled={!selectedOptionId || isSealing}>
            {isLast ? "落下心证" : "照见下一念"}
          </PrimaryButton>
        </div>
      </div>
      {isSealing ? (
        <div className="completion-seal" role="status" aria-live="polite">
          <div className="completion-orb" aria-hidden="true">
            <span>照</span>
          </div>
          <p>此心已照</p>
        </div>
      ) : null}
      <style jsx>{`
        .assessment-one-thought {
          min-height: calc(100svh - 2.5rem);
        }

        .thought-stage {
          position: relative;
          overflow: hidden;
        }

        .thought-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent, rgba(172, 146, 83, 0.035), transparent),
            radial-gradient(circle at 50% 20%, rgba(216, 183, 111, 0.07), transparent 44%);
          opacity: 0.9;
          pointer-events: none;
        }

        .thought-scene,
        .thought-question {
          position: relative;
          z-index: 1;
        }

        .thought-scene {
          opacity: 0;
          animation: thought-in 220ms cubic-bezier(0.22, 1, 0.36, 1) 0ms forwards;
        }

        .thought-question {
          margin-top: 22px;
          opacity: 0;
          animation: thought-in 220ms cubic-bezier(0.22, 1, 0.36, 1) 50ms forwards;
        }

          .assessment-one-thought:not(.is-compact) .thought-scene {
            animation-duration: 560ms;
            animation-delay: 80ms;
        }

        .assessment-one-thought:not(.is-compact) .thought-question {
          margin-top: 30px;
          animation-duration: 620ms;
          animation-delay: 460ms;
        }

          .thought-action-bar {
            isolation: isolate;
          }

        .thought-action-bar::before {
          content: "";
          position: absolute;
          inset: -18px -18px 0;
          z-index: -1;
          background: radial-gradient(ellipse at 50% 52%, rgba(5, 5, 4, 0.82), rgba(5, 5, 4, 0.42) 46%, transparent 76%);
          pointer-events: none;
        }

        .completion-seal {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 48%, rgba(180, 157, 93, 0.14), transparent 31%),
            rgba(5, 5, 4, 0.86);
          backdrop-filter: blur(12px);
          animation: completion-bg-in 260ms ease-out both;
        }

        .completion-orb {
          position: relative;
          display: grid;
          width: clamp(132px, 38vw, 174px);
          height: clamp(132px, 38vw, 174px);
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.24);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.11), rgba(255, 255, 255, 0.012) 58%, transparent 74%);
          box-shadow: 0 0 56px rgba(180, 157, 93, 0.08);
          animation: completion-orb-in 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .completion-orb::before {
          content: "";
          position: absolute;
          inset: 20px;
          border: 1px dashed rgba(220, 212, 195, 0.12);
          border-radius: inherit;
        }

        .completion-orb::after {
          content: "";
          position: absolute;
          inset: 36px;
          border-radius: inherit;
          background: rgba(216, 183, 111, 0.12);
          filter: blur(26px);
          animation: completion-light 1200ms ease-out both;
        }

        .completion-orb span {
          position: relative;
          z-index: 1;
          font-family: var(--font-world);
          font-size: clamp(3.2rem, 15vw, 4.8rem);
          font-weight: 300;
          letter-spacing: 0.16em;
          color: rgba(242, 235, 220, 0.76);
          transform: translateX(0.08em);
        }

        .completion-seal p {
          margin: 28px 0 0;
          font-family: var(--font-narrative);
          font-size: clamp(1.2rem, 4.8vw, 1.52rem);
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.7);
          opacity: 0;
          animation: completion-copy-in 520ms cubic-bezier(0.22, 1, 0.36, 1) 620ms forwards;
        }

        @keyframes completion-bg-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes completion-orb-in {
          0% {
            opacity: 0;
            transform: scale(1.16);
          }

          62% {
            opacity: 1;
            transform: scale(0.96);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes completion-light {
          from {
            opacity: 0.2;
            transform: scale(1.32);
          }

          to {
            opacity: 0.55;
            transform: scale(0.92);
          }
        }

        @keyframes completion-copy-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes thought-in {
          0% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(8px);
          }

          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .thought-scene,
          .thought-question,
          .completion-seal,
          .completion-orb,
          .completion-seal p {
            opacity: 1;
            animation: none;
            filter: none;
            transform: none;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
