"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { AdminFeishuSync } from "@/features/admin/admin-data"

type FeishuSyncButtonProps = {
  userId: string
  source: "server-api" | "local-mock"
  feishuSync?: AdminFeishuSync | null
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "")

export function FeishuSyncButton({ userId, source, feishuSync }: FeishuSyncButtonProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [submittingMode, setSubmittingMode] = useState<"dry-run" | "sync" | "">("")
  const canSync = source === "server-api" && !submittingMode
  const currentStatus = useMemo(() => {
    if (!feishuSync?.status) return "尚未同步"
    if (feishuSync.status === "dry_run") return "已完成演练"
    if (feishuSync.status === "success") return "已同步"
    if (feishuSync.status === "failed") return "同步失败"
    return feishuSync.status
  }, [feishuSync])

  async function submitSync(dryRun: boolean) {
    if (!canSync) return

    setSubmittingMode(dryRun ? "dry-run" : "sync")
    setMessage("")

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(userId)}/feishu-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || data?.ok === false) {
        throw new Error(String(data?.error || "飞书同步失败"))
      }

      setMessage(dryRun ? "同步演练已完成，未发送到飞书。" : "助教摘要已同步到飞书。")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "飞书同步失败")
    } finally {
      setSubmittingMode("")
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-[rgba(217,189,122,.12)] bg-black/15 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-function text-xs text-[rgba(244,235,221,.44)]">飞书同步</p>
          <p className="mt-2 font-function text-sm text-[rgba(244,235,221,.76)]">
            {currentStatus}
            {feishuSync?.synced_at ? ` · ${feishuSync.synced_at.slice(0, 16).replace("T", " ")}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!canSync}
            onClick={() => submitSync(true)}
            className="min-h-10 rounded-lg border border-[rgba(217,189,122,.2)] bg-white/[.035] px-4 font-function text-sm text-[rgba(244,235,221,.78)] transition hover:border-[rgba(216,183,111,.42)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submittingMode === "dry-run" ? "演练中..." : "飞书同步演练"}
          </button>
          <button
            type="button"
            disabled={!canSync}
            onClick={() => submitSync(false)}
            className="min-h-10 rounded-lg border border-[rgba(217,189,122,.2)] bg-[rgba(216,183,111,.12)] px-4 font-function text-sm text-[rgba(244,235,221,.86)] transition hover:border-[rgba(216,183,111,.42)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submittingMode === "sync" ? "同步中..." : "同步到飞书"}
          </button>
        </div>
      </div>
      <p className="mt-3 font-function text-xs leading-6 text-[rgba(244,235,221,.44)]">
        {message || (source === "server-api" ? "演练只生成请求体；正式同步需要 server 配置 FEISHU_BOT_WEBHOOK。" : "当前为本地 mock fallback，启动 server 后可同步。")}
      </p>
      {feishuSync?.error ? (
        <p className="mt-2 font-function text-xs leading-6 text-[rgba(231,188,171,.78)]">{feishuSync.error}</p>
      ) : null}
    </div>
  )
}
