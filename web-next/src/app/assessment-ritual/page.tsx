"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AssessmentShell, StatusPill } from "@/features/assessment/components"

export default function AssessmentRitualPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/assessment-entry")
  }, [router])

  return (
    <AssessmentShell>
      <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center">
        <StatusPill>正在回到照心入口</StatusPill>
      </div>
    </AssessmentShell>
  )
}
