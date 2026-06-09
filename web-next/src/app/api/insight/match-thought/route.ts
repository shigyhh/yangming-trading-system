import {
  applyAIThoughtMatch,
  matchUserThought,
  matchUserThoughtWithAI,
  shouldUseAIFallback,
} from "@/lib/insight-engine/match-user-thought"

export const runtime = "nodejs"

function readInputText(value: unknown) {
  if (!value || typeof value !== "object") return ""
  const inputText = (value as { inputText?: unknown }).inputText
  return typeof inputText === "string" ? inputText : ""
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const inputText = readInputText(body).trim()
  if (!inputText) return Response.json({ error: "INPUT_TEXT_REQUIRED" }, { status: 400 })

  const localMatch = matchUserThought(inputText)
  const enableAI = Boolean((body as { enableAI?: unknown }).enableAI)
  const serverAIEnabled = process.env.INSIGHT_MATCH_AI_ENABLED === "true"
  const apiKey = process.env.OPENAI_API_KEY
  const shouldFallback = shouldUseAIFallback(localMatch)
  const shouldCallAI = enableAI && serverAIEnabled && Boolean(apiKey) && shouldFallback

  const aiMatch = shouldCallAI
    ? await matchUserThoughtWithAI(inputText, localMatch.candidates, {
        apiKey,
        model: process.env.INSIGHT_MATCH_AI_MODEL || "gpt-4o-mini",
      })
    : null
  const match = aiMatch ? applyAIThoughtMatch(localMatch, aiMatch) : localMatch

  return Response.json({
    match,
    ai: {
      enabled: enableAI && serverAIEnabled,
      attempted: shouldCallAI,
      used: Boolean(aiMatch),
      fallbackTriggered: shouldFallback,
    },
  })
}
