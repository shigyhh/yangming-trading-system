"use client"

import type {
  DataBindingAssessmentPayload,
  DataBindingKLinePayload,
  DataBindingRetestComparison,
  DataBindingRetestPayload,
  DataBindingShareCardResponse,
  DataBindingTrainingPayload,
  DataBindingUserProfile,
  DataBindingUserSummaryResponse,
} from "../../../../packages/contracts/data-binding"

import type { PracticeChangeState } from "@/features/assessment/practice-change"
import type { AssessmentAnswer, AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage, setStorage } from "@/features/assessment/storage"

type BindingClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type DataBindingSummaryResponse = DataBindingUserSummaryResponse

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787"

export function getDataBindingUserProfile(): DataBindingUserProfile {
  const userId = getOrCreateDataBindingUserId()
  const phone = getStorage<string>(assessmentStorageKeys.userPhone, "")
  const phoneTail = getStorage<string>(assessmentStorageKeys.phoneTail, "")
  const nickname = getStorage<string>(assessmentStorageKeys.userNickname, "")

  return {
    userId,
    maskedPhone: maskPhone(phone, phoneTail),
    phoneTail: phoneTail || phone.slice(-4),
    nickname: nickname || "体验学员",
    inviteSource: "web-next 本地测评",
    sourceChannel: "web-next",
  }
}

export async function syncAssessmentReportBinding({
  report,
  answers,
  questionOrder,
}: {
  report: AssessmentReport
  answers: AssessmentAnswer[]
  questionOrder: string[]
}) {
  const user = getDataBindingUserProfile()
  const payload: DataBindingAssessmentPayload = {
    user,
    report: {
      ...report,
      userId: report.userId || user.userId,
      metadata: {
        ...report.metadata,
        source: "web-next",
      },
    },
    answers,
    questionOrder,
    source: "web-next",
  }

  return requestJson("/api/v1/data-binding/assessment-report", payload)
}

export async function syncTrainingRecordBinding({
  practiceState,
  record,
}: {
  practiceState: PracticeChangeState
  record: PracticeChangeState["records"][number]
}) {
  const user = getDataBindingUserProfile()
  const payload: DataBindingTrainingPayload = {
    user,
    practiceState,
    record: {
      day: record.day,
      dateKey: record.dateKey,
      title: record.title,
      note: record.note,
      actions: record.actions,
      status: record.status,
      recordedAt: record.recordedAt,
      checkIn: record.checkIn,
      cultivationText: record.cultivationText,
    },
    source: "web-next",
  }
  const trainingResult = await requestJson(`/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/training-records`, payload)

  if (record.klineRecord) {
    const klinePayload: DataBindingKLinePayload = {
      user,
      record: {
        day: record.day,
        recordedAt: record.recordedAt,
        ...record.klineRecord,
      },
      source: "web-next",
    }
    await requestJson(`/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/kline-records`, klinePayload)
  }

  return trainingResult
}

export async function syncRetestResultBinding({
  report,
  comparison,
}: {
  report: AssessmentReport
  comparison: DataBindingRetestComparison[]
}) {
  const user = getDataBindingUserProfile()
  const payload: DataBindingRetestPayload = {
    user,
    report,
    comparison,
    source: "web-next",
  }

  return requestJson(`/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/retests`, payload)
}

export async function fetchDataBindingSummary() {
  const user = getDataBindingUserProfile()
  return requestGetJson<DataBindingSummaryResponse>(`/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/summary`)
}

export async function generateShareCardBinding() {
  const user = getDataBindingUserProfile()
  return requestJson<{ channel: string }, DataBindingShareCardResponse>(
    `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/share-card`,
    {
      channel: user.inviteSource || user.sourceChannel || "web-next",
    },
  )
}

export async function fetchShareCardBinding() {
  const user = getDataBindingUserProfile()
  return requestGetJson<DataBindingShareCardResponse>(`/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/share-card`)
}

async function requestJson<TPayload, TResponse = unknown>(
  path: string,
  payload: TPayload,
): Promise<BindingClientResult<TResponse>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 2200)

  try {
    const response = await fetch(`${defaultApiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data?.ok === false) {
      return { ok: false, error: String(data?.error || "数据同步失败") }
    }

    setStorage(assessmentStorageKeys.dataBindingLastSyncAt, new Date().toISOString())
    adoptBoundUserId(data)
    return { ok: true, data: data as TResponse }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "数据同步超时，已保留本地记录"
      : "server 未启动，已保留本地记录"
    return { ok: false, error: message }
  } finally {
    window.clearTimeout(timer)
  }
}

function adoptBoundUserId(data: unknown) {
  if (!data || typeof data !== "object") return

  const nextUserId = (data as { user?: { id?: unknown } }).user?.id
  if (typeof nextUserId === "string" && nextUserId) {
    setStorage(assessmentStorageKeys.dataBindingUserId, nextUserId)
  }
}

async function requestGetJson<TResponse>(path: string): Promise<BindingClientResult<TResponse>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch(`${defaultApiBaseUrl}${path}`, {
      method: "GET",
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data?.ok === false) {
      return { ok: false, error: String(data?.error || "数据读取失败") }
    }

    return { ok: true, data: data as TResponse }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "数据读取超时，使用本地记录"
      : "server 未启动，使用本地记录"
    return { ok: false, error: message }
  } finally {
    window.clearTimeout(timer)
  }
}

function getOrCreateDataBindingUserId() {
  const existing = getStorage<string>(assessmentStorageKeys.dataBindingUserId, "")
  if (existing) return existing

  const id = `web-${createRandomId()}`
  setStorage(assessmentStorageKeys.dataBindingUserId, id)
  return id
}

function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function maskPhone(phone: string, phoneTail: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length >= 11) return `${digits.slice(0, 3)}****${digits.slice(-4)}`
  if (phoneTail) return `*** **** ${phoneTail}`.replace(/\s/g, "")
  return "未留存"
}
