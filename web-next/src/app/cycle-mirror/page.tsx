"use client"

import { Suspense, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { AssessmentShell, StatusPill } from "@/features/assessment/components"
import { CycleMirror } from "@/features/assessment/CycleMirror"
import { generateMirrorReport, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage, removeStorage, setStorage } from "@/features/assessment/storage"

function CycleMirrorContent() {
  const searchParams = useSearchParams()
  const mirrorId = searchParams.get("mirror") ?? "anxiety"
  const persistMirrorSignal = useCallback((nextMirrorId: string) => {
    setStorage(assessmentStorageKeys.selectedMirrorId, nextMirrorId)

    const currentReport = getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
    if (currentReport?.answeredCount) return

    const mirrorReport = generateMirrorReport(nextMirrorId)
    setStorage(assessmentStorageKeys.report, mirrorReport)
    setStorage(assessmentStorageKeys.reportCreatedAt, mirrorReport.createdAt)
    removeStorage(assessmentStorageKeys.practiceChange)
  }, [])

  return (
    <AssessmentShell className="py-5">
      <div className="cycle-mirror-page flex flex-col">
        <CycleMirror key={mirrorId} initialMirrorId={mirrorId} onMirrorChange={persistMirrorSignal} />
        <div className="mt-3">
          <Link href="/assessment" className="cycle-back-link">
            回到九面行为心镜
          </Link>
        </div>
        <p className="cycle-compliance">
          循环之镜仅用于交易心理观察、行为训练与风险教育；不构成投资建议，不荐股，不喊单，不承诺收益。
        </p>
      </div>
      <style jsx>{`
        .cycle-mirror-page {
          animation: cycle-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .cycle-back-link {
          display: inline-flex;
          justify-content: center;
          margin: 0 auto;
          font-family: var(--font-function);
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          color: rgba(220, 212, 195, 0.48);
          text-decoration: none;
        }

        .cycle-compliance {
          margin: 1rem auto 0;
          max-width: 28em;
          text-align: center;
          font-family: var(--font-function);
          font-size: 0.68rem;
          line-height: 1.7;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.28);
        }

        @keyframes cycle-page-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

export default function CycleMirrorPage() {
  return (
    <Suspense fallback={<AssessmentShell className="py-5"><StatusPill>正在进入循环之镜</StatusPill></AssessmentShell>}>
      <CycleMirrorContent />
    </Suspense>
  )
}
