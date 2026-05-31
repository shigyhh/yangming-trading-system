"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AssessmentShell, PrimaryLink, StatusPill } from "@/features/assessment/components"
import { assessmentQuestions } from "@/features/assessment/questions"
import { generateAssessmentReport, type AssessmentAnswer } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage, setStorage } from "@/features/assessment/storage"

function hasEnoughAnswers(answers: AssessmentAnswer[]) {
  return answers.length > 0
}

export default function AssessmentGeneratingPage() {
  const router = useRouter()
  const [missingAnswers, setMissingAnswers] = useState(false)

  useEffect(() => {
    const answers = getStorage<AssessmentAnswer[]>(assessmentStorageKeys.answers, [])
    const savedOrder = getStorage<string[]>(assessmentStorageKeys.questionOrder, [])
    const reportQuestions = savedOrder.length
      ? savedOrder
          .map((id) => assessmentQuestions.find((question) => question.id === id))
          .filter((question): question is (typeof assessmentQuestions)[number] => Boolean(question))
      : assessmentQuestions
    const expectedQuestionIds = new Set(reportQuestions.map((question) => question.id))
    const validAnswers = answers.filter((answer) => expectedQuestionIds.has(answer.questionId))

    if (!hasEnoughAnswers(validAnswers) || validAnswers.length !== reportQuestions.length) {
      const missingTimer = window.setTimeout(() => setMissingAnswers(true), 0)
      return () => window.clearTimeout(missingTimer)
    }

    const selectedMirrorId = getStorage<string>(assessmentStorageKeys.selectedMirrorId, "")
    const report = generateAssessmentReport(validAnswers, reportQuestions, selectedMirrorId)
    setStorage(assessmentStorageKeys.report, report)
    setStorage(assessmentStorageKeys.reportCreatedAt, report.createdAt)

    const timer = window.setTimeout(() => {
      router.replace("/assessment-result")
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [router])

  if (missingAnswers) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>需要重新开始</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            还没有足够的照心答案。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            回到入口后，可以从测前静场重新进入。
          </p>
          <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
            回到照心入口 →
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell>
      <div className="heart-proof-generating flex flex-col items-center justify-center text-center">
        <StatusPill>心证生成中</StatusPill>
        <h1 className="proof-sentence">
          正在整理
          <br />
          你反复出现的那一念。
        </h1>
        <p className="proof-sub">稍后自动查看心证。</p>

        <style jsx>{`
          .heart-proof-generating {
            min-height: calc(100svh - 4rem);
          }

          .proof-sentence {
            margin: 30px 0 0;
            font-family: var(--font-narrative);
            font-size: clamp(1.5rem, 5.8vw, 2.08rem);
            font-weight: 300;
            line-height: 1.75;
            letter-spacing: 0.09em;
            color: rgba(242, 235, 220, 0.78);
            opacity: 0;
            animation: proof-copy-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 240ms forwards;
          }

          .proof-sub {
            margin: 22px 0 0;
            font-family: var(--font-interface);
            font-size: 0.82rem;
            line-height: 1.8;
            letter-spacing: 0.08em;
            color: rgba(220, 212, 195, 0.38);
            opacity: 0;
            animation: proof-copy-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 720ms forwards;
          }

          @keyframes proof-copy-in {
            from {
              opacity: 0;
              filter: blur(8px);
              transform: translateY(12px);
            }

            to {
              opacity: 1;
              filter: blur(0);
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </AssessmentShell>
  )
}
