"use client"

import { useState } from "react"

type AssistantCandidateExportActionsProps = {
  jsonText: string
  csvText: string
}

export function AssistantCandidateExportActions({ jsonText, csvText }: AssistantCandidateExportActionsProps) {
  const [message, setMessage] = useState("")

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`${label} 已复制`)
    } catch {
      setMessage("复制失败，请手动选择文本。")
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyText(jsonText, "JSON")}
          className="rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-3 py-2 font-function text-xs text-[rgba(244,235,221,.72)] transition hover:border-[rgba(216,183,111,.34)] hover:text-[#F4EBDD]"
        >
          复制 JSON
        </button>
        <button
          type="button"
          onClick={() => copyText(csvText, "CSV")}
          className="rounded-lg border border-[rgba(217,189,122,.18)] bg-white/[.035] px-3 py-2 font-function text-xs text-[rgba(244,235,221,.72)] transition hover:border-[rgba(216,183,111,.34)] hover:text-[#F4EBDD]"
        >
          复制 CSV
        </button>
      </div>
      {message ? (
        <p className="min-h-5 font-function text-xs leading-5 text-[rgba(216,183,111,.68)]" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}
