"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"

import { adminAssistantStatuses, type AdminAssistantHandoff } from "@/features/admin/admin-data"

type AssistantHandoffFormProps = {
  userId: string
  source: "server-api" | "local-mock"
  assistant: AdminAssistantHandoff
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "")

export function AssistantHandoffForm({ userId, source, assistant }: AssistantHandoffFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<AdminAssistantHandoff["status"]>(assistant.status)
  const [owner, setOwner] = useState(assistant.owner === "未分配" ? "" : assistant.owner)
  const [note, setNote] = useState(assistant.note)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = source === "server-api" && !submitting
  const sourceLabel = useMemo(() => (
    source === "server-api" ? "将写入 server 数据绑定 API" : "当前为本地 mock fallback，启动 server 后可写入"
  ), [source])

  async function submitHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setMessage("")

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(userId)}/assistant-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          owner: owner.trim() || "未分配",
          note: note.trim() || "已记录助教承接状态，后续继续观察训练与复测变化。",
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || data?.ok === false) {
        throw new Error(String(data?.error || "承接记录保存失败"))
      }

      setMessage("承接记录已保存。")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "承接记录保存失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submitHandoff}
      className="mt-5 grid gap-3 rounded-lg border border-[rgba(217,189,122,.12)] bg-black/15 p-4"
    >
      <div className="grid gap-2">
        <label className="font-function text-xs text-[rgba(244,235,221,.44)]" htmlFor="assistant-status">
          承接状态
        </label>
        <select
          id="assistant-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as AdminAssistantHandoff["status"])}
          disabled={source !== "server-api"}
          className="min-h-10 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none disabled:opacity-55"
        >
          {adminAssistantStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <label className="grid gap-2">
        <span className="font-function text-xs text-[rgba(244,235,221,.44)]">负责人</span>
        <input
          value={owner}
          onChange={(event) => setOwner(event.target.value.slice(0, 24))}
          disabled={source !== "server-api"}
          placeholder="填写助教名称"
          className="min-h-10 rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 font-function text-sm text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)] disabled:opacity-55"
        />
      </label>

      <label className="grid gap-2">
        <span className="font-function text-xs text-[rgba(244,235,221,.44)]">承接备注</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 160))}
          disabled={source !== "server-api"}
          placeholder="记录觉察、训练、复盘相关承接动作"
          className="min-h-24 resize-none rounded-lg border border-[rgba(217,189,122,.14)] bg-[#080807] px-3 py-3 font-function text-sm leading-7 text-[rgba(244,235,221,.82)] outline-none placeholder:text-[rgba(244,235,221,.28)] disabled:opacity-55"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-10 rounded-lg border border-[rgba(217,189,122,.2)] bg-[rgba(216,183,111,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.82)] transition hover:border-[rgba(216,183,111,.42)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {submitting ? "保存中..." : "保存承接记录"}
      </button>

      <p className="font-function text-xs leading-6 text-[rgba(244,235,221,.42)]">
        {message || sourceLabel}
      </p>
    </form>
  )
}
