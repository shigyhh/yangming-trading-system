import scene01 from "../../data/insight-engine/scenes/scene-01-chase-surge.json" with { type: "json" }
import scene02 from "../../data/insight-engine/scenes/scene-02-missed.json" with { type: "json" }
import scene03 from "../../data/insight-engine/scenes/scene-03-small-position.json" with { type: "json" }
import scene04 from "../../data/insight-engine/scenes/scene-04-sold-too-early.json" with { type: "json" }
import scene05 from "../../data/insight-engine/scenes/scene-05-sold-too-late.json" with { type: "json" }
import scene06 from "../../data/insight-engine/scenes/scene-06-floating-gain-fear.json" with { type: "json" }
import scene07 from "../../data/insight-engine/scenes/scene-07-unwilling-stop-loss.json" with { type: "json" }
import scene08 from "../../data/insight-engine/scenes/scene-08-hold-loss.json" with { type: "json" }
import scene09 from "../../data/insight-engine/scenes/scene-09-average-down.json" with { type: "json" }
import scene10 from "../../data/insight-engine/scenes/scene-10-more-average-down.json" with { type: "json" }
import scene11 from "../../data/insight-engine/scenes/scene-11-revenge-trade.json" with { type: "json" }
import scene12 from "../../data/insight-engine/scenes/scene-12-overconfidence.json" with { type: "json" }
import scene13 from "../../data/insight-engine/scenes/scene-13-heavy-position.json" with { type: "json" }
import scene14 from "../../data/insight-engine/scenes/scene-14-all-in.json" with { type: "json" }
import scene15 from "../../data/insight-engine/scenes/scene-15-empty-position.json" with { type: "json" }
import scene16 from "../../data/insight-engine/scenes/scene-16-change-plan.json" with { type: "json" }
import scene17 from "../../data/insight-engine/scenes/scene-17-stop-loss-regret.json" with { type: "json" }
import scene18 from "../../data/insight-engine/scenes/scene-18-profit-regret.json" with { type: "json" }
import scene19 from "../../data/insight-engine/scenes/scene-19-open-impulse.json" with { type: "json" }
import scene20 from "../../data/insight-engine/scenes/scene-20-close-impulse.json" with { type: "json" }
import scene21 from "../../data/insight-engine/scenes/scene-21-after-close-regret.json" with { type: "json" }
import scene22 from "../../data/insight-engine/scenes/scene-22-avoid-review.json" with { type: "json" }
import scene23 from "../../data/insight-engine/scenes/scene-23-news-trigger.json" with { type: "json" }
import scene24 from "../../data/insight-engine/scenes/scene-24-follow-call.json" with { type: "json" }
import scene25 from "../../data/insight-engine/scenes/scene-25-hot-theme.json" with { type: "json" }
import scene26 from "../../data/insight-engine/scenes/scene-26-bottom-fishing.json" with { type: "json" }
import scene27 from "../../data/insight-engine/scenes/scene-27-high-buy.json" with { type: "json" }
import scene28 from "../../data/insight-engine/scenes/scene-28-breakeven-obsession.json" with { type: "json" }
import scene29 from "../../data/insight-engine/scenes/scene-29-unlock-obsession.json" with { type: "json" }
import scene30 from "../../data/insight-engine/scenes/scene-30-see-right-no-buy.json" with { type: "json" }
import scene31 from "../../data/insight-engine/scenes/scene-31-instant-regret.json" with { type: "json" }
import scene32 from "../../data/insight-engine/scenes/scene-32-account-checking.json" with { type: "json" }
import scene33 from "../../data/insight-engine/scenes/scene-33-stock-hopping.json" with { type: "json" }
import scene34 from "../../data/insight-engine/scenes/scene-34-news-trading.json" with { type: "json" }
import scene35 from "../../data/insight-engine/scenes/scene-35-fear-holding.json" with { type: "json" }
import scene36 from "../../data/insight-engine/scenes/scene-36-fear-of-being-wrong.json" with { type: "json" }
import { sceneProfiles, type SceneProfile } from "../../data/insight-engine/scene-profiles.ts"

type InsightSceneItem = {
  id: string
  tradeMoment: string
  os: string
  hiddenThought: string
  reflection: string
  intensity: number
}

type InsightScene = {
  sceneId: string
  sceneName: string
  mirrorId: string
  thief: string
  items: InsightSceneItem[]
  evidences: string[]
  practices: string[]
}

export type UserThoughtMatch = {
  inputText: string
  matchedSceneId: string
  matchedSceneName: string
  matchedThoughtId?: string
  matchedMirrorId: string
  matchedMirrorName: string
  matchedThief: string
  confidence: number
  confidenceLabel: "high" | "medium" | "low"
  reason: string
  candidates: Array<{
    sceneId: string
    sceneName: string
    mirrorName: string
    thief: string
    score: number
    matchedTerms: string[]
  }>
  suggestedReflection: string
  suggestedEvidence: string
  suggestedPractice: string
}

export type AIThoughtMatch = Pick<
  UserThoughtMatch,
  | "matchedSceneId"
  | "matchedSceneName"
  | "matchedMirrorId"
  | "matchedMirrorName"
  | "matchedThief"
  | "confidence"
  | "reason"
>

type ScoredProfile = {
  profile: SceneProfile
  score: number
  matchedTerms: string[]
}

const insightScenes = [
  scene01,
  scene02,
  scene03,
  scene04,
  scene05,
  scene06,
  scene07,
  scene08,
  scene09,
  scene10,
  scene11,
  scene12,
  scene13,
  scene14,
  scene15,
  scene16,
  scene17,
  scene18,
  scene19,
  scene20,
  scene21,
  scene22,
  scene23,
  scene24,
  scene25,
  scene26,
  scene27,
  scene28,
  scene29,
  scene30,
  scene31,
  scene32,
  scene33,
  scene34,
  scene35,
  scene36,
] as InsightScene[]

const scenesById = new Map(insightScenes.map((scene) => [scene.sceneId, scene]))
const profilesById = new Map(sceneProfiles.map((profile) => [profile.sceneId, profile]))

const synonymGroups: Array<{ canonical: string; synonyms: string[] }> = [
  { canonical: "卖飞", synonyms: ["卖早", "卖完就涨", "一卖就涨"] },
  { canonical: "回本", synonyms: ["解套", "回来", "扳回来"] },
  { canonical: "补仓", synonyms: ["加仓", "摊低成本", "摊平"] },
  { canonical: "追高", synonyms: ["上车", "涨停", "起飞", "真拉了"] },
  { canonical: "止损", synonyms: ["割肉", "认赔", "出来"] },
  { canonical: "消息", synonyms: ["利好", "群里", "老师", "传闻"] },
  { canonical: "翻本", synonyms: ["打回来", "一把回来", "回血"] },
  { canonical: "梭哈", synonyms: ["全仓", "满仓", "一把干"] },
]

const exclusiveTermsByScene: Record<string, string[]> = {
  scene_04: ["翻本", "打回来", "梭哈", "补仓", "重仓"],
  scene_11: ["卖飞", "卖早", "卖完就涨", "一卖就涨", "下次不卖", "拿住"],
  scene_13: ["卖飞", "卖早", "卖完就涨"],
  scene_14: ["卖飞", "卖早", "卖完就涨"],
  scene_28: ["卖飞", "卖早", "卖完就涨", "打回来", "梭哈"],
  scene_29: ["卖飞", "卖早", "卖完就涨", "打回来", "梭哈"],
}

function toHalfWidth(value: string) {
  return value.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, " ")
}

export function normalizeInput(inputText: string) {
  const base = toHalfWidth(inputText)
    .trim()
    .toLowerCase()
    .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？；：、“”‘’（）【】《》…—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const additions = new Set<string>()
  for (const group of synonymGroups) {
    if (base.includes(group.canonical) || group.synonyms.some((synonym) => base.includes(synonym))) {
      additions.add(group.canonical)
    }
  }

  return [base, ...additions].filter(Boolean).join(" ")
}

function normalizeTerm(term: string) {
  return toHalfWidth(term)
    .trim()
    .toLowerCase()
    .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？；：、“”‘’（）【】《》…—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function includesTerm(input: string, term: string) {
  const normalizedTerm = normalizeTerm(term)
  if (!normalizedTerm) return false
  return input.includes(normalizedTerm)
}

function addTerm(target: Set<string>, term: string) {
  if (term.trim()) target.add(term.trim())
}

function scoreProfile(input: string, profile: SceneProfile): ScoredProfile {
  let score = 0
  const matchedTerms = new Set<string>()
  let positiveHits = 0

  for (const phrase of profile.triggerPhrases) {
    if (includesTerm(input, phrase)) {
      score += 12
      addTerm(matchedTerms, phrase)
    }
  }

  for (const alias of profile.aliases) {
    if (includesTerm(input, alias)) {
      score += 8
      positiveHits += 1
      addTerm(matchedTerms, alias)
    }
  }

  for (const keyword of profile.positiveKeywords) {
    if (includesTerm(input, keyword)) {
      score += 3
      positiveHits += 1
      addTerm(matchedTerms, keyword)
    }
  }

  for (const example of profile.examples) {
    if (includesTerm(input, example) || includesTerm(normalizeTerm(example), input)) {
      score += 10
      addTerm(matchedTerms, example)
    }
  }

  for (const keyword of profile.negativeKeywords) {
    if (includesTerm(input, keyword)) {
      score -= 6
      addTerm(matchedTerms, `-${keyword}`)
    }
  }

  for (const example of profile.avoidExamples) {
    if (includesTerm(input, example) || includesTerm(normalizeTerm(example), input)) {
      score -= 10
      addTerm(matchedTerms, `避开:${example}`)
    }
  }

  for (const term of exclusiveTermsByScene[profile.sceneId] ?? []) {
    if (includesTerm(input, term)) {
      score -= 8
      addTerm(matchedTerms, `互斥:${term}`)
    }
  }

  if (positiveHits >= 2) score += 2

  return { profile, score, matchedTerms: [...matchedTerms] }
}

function confidenceLabel(topScore: number, secondScore: number): UserThoughtMatch["confidenceLabel"] {
  if (topScore >= 14 && topScore - secondScore >= 4) return "high"
  if (topScore >= 8) return "medium"
  return "low"
}

function confidenceValue(label: UserThoughtMatch["confidenceLabel"], topScore: number, secondScore: number) {
  const spread = Math.max(0, topScore - secondScore)
  if (label === "high") return Math.min(0.95, 0.72 + topScore / 100 + spread / 100)
  if (label === "medium") return Math.min(0.72, 0.48 + topScore / 80)
  return Math.max(0.24, Math.min(0.42, 0.24 + Math.max(0, topScore) / 80))
}

function pickClosestItem(input: string, scene: InsightScene) {
  return [...scene.items]
    .map((item) => {
      const itemTerms = [item.tradeMoment, item.os, item.hiddenThought, item.reflection]
      const score = itemTerms.reduce((total, term) => total + (includesTerm(input, term) ? 1 : 0), 0)
      return { item, score }
    })
    .sort((left, right) => right.score - left.score)[0]?.item ?? scene.items[0]
}

function fallbackProfile(input: string) {
  const index = Math.abs(hashText(input || "今日一念")) % sceneProfiles.length
  return sceneProfiles[index] ?? sceneProfiles[0]
}

function hashText(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function matchUserThought(inputText: string): UserThoughtMatch {
  const normalizedInput = normalizeInput(inputText)
  const scored = sceneProfiles
    .map((profile) => scoreProfile(normalizedInput, profile))
    .sort((left, right) => right.score - left.score)

  const top = scored[0] && scored[0].score > 0 ? scored[0] : { profile: fallbackProfile(normalizedInput), score: 0, matchedTerms: [] }
  const secondScore = scored[1]?.score ?? 0
  const label = confidenceLabel(top.score, secondScore)
  const scene = scenesById.get(top.profile.sceneId) ?? insightScenes[0]
  const item = pickClosestItem(normalizedInput, scene)
  const candidates = scored.slice(0, 3).map(({ profile, score, matchedTerms }) => ({
    sceneId: profile.sceneId,
    sceneName: profile.sceneName,
    mirrorName: profile.mirrorName,
    thief: profile.thief,
    score,
    matchedTerms,
  }))

  return {
    inputText,
    matchedSceneId: top.profile.sceneId,
    matchedSceneName: top.profile.sceneName,
    matchedThoughtId: item?.id,
    matchedMirrorId: top.profile.mirrorId,
    matchedMirrorName: top.profile.mirrorName,
    matchedThief: top.profile.thief,
    confidence: confidenceValue(label, top.score, secondScore),
    confidenceLabel: label,
    reason:
      top.matchedTerms.length > 0
        ? `命中：${top.matchedTerms.filter((term) => !term.startsWith("-") && !term.startsWith("避开:") && !term.startsWith("互斥:")).join("、") || "场景画像"}`
        : "未命中高置信画像，使用本地今日一念兜底。",
    candidates,
    suggestedReflection: item?.reflection ?? "",
    suggestedEvidence: scene.evidences[0] ?? "",
    suggestedPractice: scene.practices[0] ?? "",
  }
}

export function shouldUseAIFallback(match: UserThoughtMatch) {
  const topScore = match.candidates[0]?.score ?? 0
  const secondScore = match.candidates[1]?.score ?? 0
  const closeTopCandidates = secondScore > 0 && topScore - secondScore < 3
  const longInput = match.inputText.trim().length > 30
  const competingScenes = match.candidates.filter((candidate) => candidate.score >= 8).length > 1

  return match.confidenceLabel === "low" || closeTopCandidates || longInput || competingScenes
}

export function validateAIThoughtMatch(
  value: unknown,
  candidates: UserThoughtMatch["candidates"],
): { valid: true; value: AIThoughtMatch } | { valid: false; reason: string } {
  if (!value || typeof value !== "object") return { valid: false, reason: "AI result is not an object." }

  const result = value as Partial<AIThoughtMatch>
  const candidate = candidates.find((item) => item.sceneId === result.matchedSceneId)
  if (!candidate) return { valid: false, reason: "AI chose a scene outside local candidates." }

  const profile = profilesById.get(candidate.sceneId)
  if (!profile) return { valid: false, reason: "Candidate profile is missing." }

  if (result.matchedSceneName !== candidate.sceneName) return { valid: false, reason: "AI scene name mismatch." }
  if (result.matchedMirrorName !== candidate.mirrorName) return { valid: false, reason: "AI mirror name mismatch." }
  if (result.matchedMirrorId !== profile.mirrorId) return { valid: false, reason: "AI mirror id mismatch." }
  if (result.matchedThief !== candidate.thief) return { valid: false, reason: "AI thief mismatch." }
  if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1) {
    return { valid: false, reason: "AI confidence out of range." }
  }
  if (typeof result.reason !== "string" || result.reason.trim().length === 0) {
    return { valid: false, reason: "AI reason is missing." }
  }

  return {
    valid: true,
    value: {
      matchedSceneId: candidate.sceneId,
      matchedSceneName: candidate.sceneName,
      matchedMirrorId: profile.mirrorId,
      matchedMirrorName: candidate.mirrorName,
      matchedThief: candidate.thief,
      confidence: result.confidence,
      reason: result.reason,
    },
  }
}

export function applyAIThoughtMatch(localMatch: UserThoughtMatch, aiMatch: AIThoughtMatch): UserThoughtMatch {
  const scene = scenesById.get(aiMatch.matchedSceneId) ?? scenesById.get(localMatch.matchedSceneId) ?? insightScenes[0]
  const item = pickClosestItem(normalizeInput(localMatch.inputText), scene)
  const candidate = localMatch.candidates.find((entry) => entry.sceneId === aiMatch.matchedSceneId)

  return {
    ...localMatch,
    matchedSceneId: aiMatch.matchedSceneId,
    matchedSceneName: aiMatch.matchedSceneName,
    matchedThoughtId: item?.id,
    matchedMirrorId: aiMatch.matchedMirrorId,
    matchedMirrorName: aiMatch.matchedMirrorName,
    matchedThief: aiMatch.matchedThief,
    confidence: aiMatch.confidence,
    confidenceLabel: aiMatch.confidence >= 0.72 ? "high" : aiMatch.confidence >= 0.48 ? "medium" : "low",
    reason: aiMatch.reason,
    suggestedReflection: item?.reflection ?? localMatch.suggestedReflection,
    suggestedEvidence: scene.evidences[0] ?? localMatch.suggestedEvidence,
    suggestedPractice: scene.practices[0] ?? localMatch.suggestedPractice,
    candidates: candidate
      ? [candidate, ...localMatch.candidates.filter((entry) => entry.sceneId !== candidate.sceneId)].slice(0, 3)
      : localMatch.candidates,
  }
}

function parseResponsesJson(data: unknown) {
  if (!data || typeof data !== "object") return null
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> }
  const text =
    typeof response.output_text === "string"
      ? response.output_text
      : response.output
          ?.flatMap((item) => item.content ?? [])
          .map((content) => content.text)
          .find((item): item is string => typeof item === "string")

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function matchUserThoughtWithAI(
  inputText: string,
  candidates: UserThoughtMatch["candidates"],
  options: {
    apiKey?: string
    model?: string
    fetchImpl?: typeof fetch
  } = {},
): Promise<AIThoughtMatch | null> {
  if (!options.apiKey || candidates.length === 0) return null

  const candidateSceneIds = candidates.map((candidate) => candidate.sceneId)
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "你是交易心理训练系统的场景选择器。只能从候选场景中选择一个，不允许创造新 sceneId，不输出投资建议，不输出自由文本。",
        },
        {
          role: "user",
          content: JSON.stringify({
            inputText,
            candidates: candidates.map((candidate) => ({
              sceneId: candidate.sceneId,
              sceneName: candidate.sceneName,
              mirrorId: profilesById.get(candidate.sceneId)?.mirrorId,
              mirrorName: candidate.mirrorName,
              thief: candidate.thief,
              score: candidate.score,
              matchedTerms: candidate.matchedTerms,
            })),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "insight_match_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              matchedSceneId: { type: "string", enum: candidateSceneIds },
              matchedSceneName: { type: "string" },
              matchedMirrorId: { type: "string" },
              matchedMirrorName: { type: "string" },
              matchedThief: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              reason: { type: "string" },
            },
            required: [
              "matchedSceneId",
              "matchedSceneName",
              "matchedMirrorId",
              "matchedMirrorName",
              "matchedThief",
              "confidence",
              "reason",
            ],
          },
        },
      },
    }),
  })

  if (!response.ok) return null

  const validation = validateAIThoughtMatch(parseResponsesJson(await response.json()), candidates)
  return validation.valid ? validation.value : null
}
