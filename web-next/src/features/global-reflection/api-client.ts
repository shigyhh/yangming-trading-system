"use client"

import type {
  GlobalReflectionChoice,
  GlobalReflectionSummary,
  GlobalReflectionVotePayload,
  GlobalReflectionVoteResponse,
} from "@yangming/contracts/global-reflection"

type GlobalReflectionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const fallbackGlobalReflectionChoices: GlobalReflectionChoice[] = [
  { key: "fear_missing_out", label: "怕错过", note: "看到快速波动时，第一念想立刻跟上。" },
  { key: "unwilling_to_accept", label: "不甘心", note: "结果不如预期时，第一念想证明自己没错。" },
  { key: "wait_a_bit_more", label: "再等等", note: "明知该停，却想把边界再往后挪一点。" },
  { key: "afraid_to_choose", label: "怕选错", note: "机会出现时，第一念先担心自己判断不够好。" },
  { key: "want_to_win_back", label: "想扳回", note: "失守之后，第一念想立刻补回那口气。" },
]

export function buildFallbackGlobalReflectionSummary(): GlobalReflectionSummary {
  return {
    dateKey: new Date().toISOString().slice(0, 10),
    totalVotes: 0,
    choices: fallbackGlobalReflectionChoices.map((choice) => ({ ...choice, count: 0, percentage: 0 })),
    leadingThought: null,
    mirrors: [],
    scroll: [],
    compliance: "全球照见层仅用于匿名交易心理观察与风险教育；不构成投资建议。",
  }
}

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787"

export async function fetchGlobalReflectionToday() {
  return requestGetJson<{ summary: GlobalReflectionSummary }>("/api/v1/global-reflection/today")
}

export async function fetchGlobalReflectionChoices() {
  return requestGetJson<{ choices: GlobalReflectionChoice[] }>("/api/v1/global-reflection/options")
}

export async function submitGlobalReflectionVote(payload: GlobalReflectionVotePayload) {
  return requestPostJson<GlobalReflectionVotePayload, GlobalReflectionVoteResponse>("/api/v1/global-reflection/vote", payload)
}

async function requestGetJson<TResponse>(path: string): Promise<GlobalReflectionResult<TResponse>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch(`${defaultApiBaseUrl}${path}`, {
      method: "GET",
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data?.ok === false) {
      return { ok: false, error: String(data?.error || "全球照见数据读取失败") }
    }

    return { ok: true, data: data as TResponse }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "全球照见数据读取超时"
      : "server 未启动，使用本地预览"
    return { ok: false, error: message }
  } finally {
    window.clearTimeout(timer)
  }
}

async function requestPostJson<TPayload, TResponse>(
  path: string,
  payload: TPayload,
): Promise<GlobalReflectionResult<TResponse>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1800)

  try {
    const response = await fetch(`${defaultApiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data?.ok === false) {
      return { ok: false, error: String(data?.error || "今日一念记录失败") }
    }

    return { ok: true, data: data as TResponse }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "今日一念记录超时"
      : "server 未启动，今日一念暂存失败"
    return { ok: false, error: message }
  } finally {
    window.clearTimeout(timer)
  }
}
