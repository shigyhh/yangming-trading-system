import type {
  CreateTrainingPackInput,
  TrainingPack,
  TrainingPackListResponse,
  TrainingPackResponse,
  UpdateTrainingPackInput,
} from "@yangming/contracts/training-pack"

const apiBaseUrl = (process.env.NEXT_PUBLIC_YM_API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "")

export type TrainingPackDraft = CreateTrainingPackInput

export async function fetchTrainingPacks({ includeDisabled = true } = {}) {
  const path = includeDisabled ? "/api/v1/training-packs?include_disabled=true" : "/api/v1/training-packs"
  const data = await requestTrainingPackJson<TrainingPackListResponse>(path)
  const packs = Array.isArray(data.training_packs)
    ? data.training_packs
    : Array.isArray(data.trainingPacks)
      ? data.trainingPacks
      : []

  return packs.map(normalizeTrainingPack)
}

export async function createTrainingPack(input: TrainingPackDraft) {
  const data = await requestTrainingPackJson<TrainingPackResponse>("/api/v1/training-packs", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return normalizeTrainingPack(data.training_pack || data.trainingPack)
}

export async function updateTrainingPack(id: string, input: UpdateTrainingPackInput) {
  const data = await requestTrainingPackJson<TrainingPackResponse>(`/api/v1/training-packs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return normalizeTrainingPack(data.training_pack || data.trainingPack)
}

export async function setTrainingPackEnabled(id: string, enabled: boolean) {
  const data = await requestTrainingPackJson<TrainingPackResponse>(`/api/v1/training-packs/${encodeURIComponent(id)}/enabled`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  })
  return normalizeTrainingPack(data.training_pack || data.trainingPack)
}

export function normalizeTrainingPack(pack: Partial<TrainingPack> = {}): TrainingPack {
  const errorType = pack.errorType || pack.error_type || ""
  const sceneTags = Array.isArray(pack.sceneTags)
    ? pack.sceneTags
    : Array.isArray(pack.scene_tags)
      ? pack.scene_tags
      : []
  const trainingGoal = pack.trainingGoal || pack.training_goal || ""
  const expectedAction = pack.expectedAction || pack.expected_action || ""
  const defaultPrompt = pack.defaultPrompt || pack.default_prompt || ""
  const trainingPrescription = pack.trainingPrescription || pack.training_prescription || ""
  const sortOrder = Number(pack.sortOrder ?? pack.sort_order ?? 0)
  const createdAt = pack.createdAt || pack.created_at || ""
  const updatedAt = pack.updatedAt || pack.updated_at || ""

  return {
    ...pack,
    id: pack.id || "",
    title: pack.title || "",
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    trainingGoal,
    training_goal: trainingGoal,
    expectedAction,
    expected_action: expectedAction,
    defaultPrompt,
    default_prompt: defaultPrompt,
    trainingPrescription,
    training_prescription: trainingPrescription,
    difficulty: pack.difficulty || "初级",
    enabled: pack.enabled !== false,
    sortOrder,
    sort_order: sortOrder,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
  }
}

async function requestTrainingPackJson<TResponse>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || "训练包接口暂不可用")
  }

  return data as TResponse
}
