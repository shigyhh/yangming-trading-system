import type {
  CreateKlineSegmentInput,
  KlineSegment,
  KlineSegmentListFilters,
  KlineSegmentListResponse,
  KlineSegmentResponse,
  UpdateKlineSegmentInput,
} from "@yangming/contracts/kline-segment"

const klineApiBaseUrl = (
  process.env.NEXT_PUBLIC_YM_KLINE_API_BASE_URL ||
  process.env.NEXT_PUBLIC_YM_API_BASE_URL ||
  "http://127.0.0.1:8787"
).replace(/\/$/, "")

export type KlineSegmentDraft = CreateKlineSegmentInput

export async function fetchKlineSegments(filters: KlineSegmentListFilters = {}) {
  const query = buildKlineSegmentQuery(filters)
  const data = await requestKlineSegmentJson<KlineSegmentListResponse>(`/api/v1/kline-segments${query}`)
  const segments = Array.isArray(data.kline_segments)
    ? data.kline_segments
    : Array.isArray(data.klineSegments)
      ? data.klineSegments
      : []

  return segments.map(normalizeKlineSegment)
}

export async function fetchKlineSegment(id: string) {
  const data = await requestKlineSegmentJson<KlineSegmentResponse>(`/api/v1/kline-segments/${encodeURIComponent(id)}`)
  return normalizeKlineSegment(data.kline_segment || data.klineSegment)
}

export async function createKlineSegment(input: KlineSegmentDraft) {
  const data = await requestKlineSegmentJson<KlineSegmentResponse>("/api/v1/kline-segments", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return normalizeKlineSegment(data.kline_segment || data.klineSegment)
}

export async function updateKlineSegment(id: string, input: UpdateKlineSegmentInput) {
  const data = await requestKlineSegmentJson<KlineSegmentResponse>(`/api/v1/kline-segments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return normalizeKlineSegment(data.kline_segment || data.klineSegment)
}

export async function setKlineSegmentEnabled(id: string, enabled: boolean) {
  const data = await requestKlineSegmentJson<KlineSegmentResponse>(`/api/v1/kline-segments/${encodeURIComponent(id)}/enabled`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  })
  return normalizeKlineSegment(data.kline_segment || data.klineSegment)
}

export function normalizeKlineSegment(segment: Partial<KlineSegment> = {}): KlineSegment {
  const startDate = segment.startDate || segment.start_date || ""
  const endDate = segment.endDate || segment.end_date || ""
  const sceneTags = Array.isArray(segment.sceneTags)
    ? segment.sceneTags
    : Array.isArray(segment.scene_tags)
      ? segment.scene_tags
      : []
  const errorTypes = Array.isArray(segment.errorTypes)
    ? segment.errorTypes
    : Array.isArray(segment.error_types)
      ? segment.error_types
      : []
  const trainingPackIds = Array.isArray(segment.trainingPackIds)
    ? segment.trainingPackIds
    : Array.isArray(segment.training_pack_ids)
      ? segment.training_pack_ids
      : []
  const createdAt = segment.createdAt || segment.created_at || ""
  const updatedAt = segment.updatedAt || segment.updated_at || ""

  return {
    ...segment,
    id: segment.id || "",
    symbol: segment.symbol || "",
    name: segment.name || "",
    period: segment.period || "",
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    sceneTags,
    scene_tags: sceneTags,
    errorTypes,
    error_types: errorTypes,
    trainingPackIds,
    training_pack_ids: trainingPackIds,
    difficulty: segment.difficulty || "初级",
    note: segment.note || "",
    enabled: segment.enabled !== false,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
  }
}

function buildKlineSegmentQuery(filters: KlineSegmentListFilters) {
  const query = new URLSearchParams()
  if (filters.includeDisabled || filters.include_disabled) query.set("include_disabled", "true")
  if (filters.symbol) query.set("symbol", filters.symbol)
  if (filters.period) query.set("period", filters.period)
  if (filters.errorType || filters.error_type) query.set("error_type", String(filters.errorType || filters.error_type))
  if (filters.sceneTag || filters.scene_tag) query.set("scene_tag", String(filters.sceneTag || filters.scene_tag))
  if (filters.trainingPackId || filters.training_pack_id) query.set("training_pack_id", String(filters.trainingPackId || filters.training_pack_id))

  const value = query.toString()
  return value ? `?${value}` : ""
}

async function requestKlineSegmentJson<TResponse>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${klineApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || "K线片段接口暂不可用")
  }

  return data as TResponse
}
