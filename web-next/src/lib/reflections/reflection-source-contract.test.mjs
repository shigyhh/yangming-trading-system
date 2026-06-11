import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const reflectPageUrl = new URL("../../app/reflect/page.tsx", import.meta.url)
const todayOneThoughtUrl = new URL("../../data/insight-engine/today-one-thought.ts", import.meta.url)
const matcherUrl = new URL("../insight-engine/match-user-thought.ts", import.meta.url)

test("today reflection display only uses reflectionService reflectionFinal as production source", async () => {
  const reflectPage = await readFile(reflectPageUrl, "utf8")
  const todaySource = await readFile(todayOneThoughtUrl, "utf8")
  const matcherSource = await readFile(matcherUrl, "utf8")

  assert.match(todaySource, /getReflection\(scene\.sceneId,\s*item\.id\)\?\.reflectionFinal\s*\?\?\s*""/)
  assert.doesNotMatch(todaySource, /getReflection\(scene\.sceneId,\s*item\.id\)\?\.reflectionFinal\s*\?\?\s*item\.reflection/)

  ;[
    "getReflection(record.sceneId, record.thoughtId)",
    "getReflection(thought.sceneId, thought.itemId)",
    "getReflection(match.matchedSceneId, thought.itemId)",
  ].forEach((token) => {
    assert.equal(reflectPage.includes(token), true, `missing reflect final-source token: ${token}`)
  })

  ;[
    /activeRecord\?\.reflectionFinal\s*\|\|\s*activeRecord\?\.reflection/,
    /completedRecord\.reflectionFinal\s*\|\|\s*completedRecord\.reflection/,
    /match\.suggestedReflectionFinal\s*\|\|\s*match\.suggestedReflection/,
    /thought\.reflectionFinal\s*\|\|\s*thought\.reflection/,
    /record\.reflectionFinal\s*\|\|\s*record\.reflection/,
    /finalEntry\?\.reflectionFinal\s*\|\|\s*record\.reflectionFinal/,
    /finalSource:\s*finalEntry\?\.finalSource\s*\|\|\s*"legacy_fallback"/,
  ].forEach((pattern) => {
    assert.doesNotMatch(reflectPage, pattern)
  })

  assert.match(matcherSource, /getReflectionFinalText\(\{\s*\.\.\.item,\s*sceneId:\s*scene\.sceneId\s*\}\)/)
  ;[
    /getReflectionFinalText\([^)]+\)\s*\|\|\s*item\?\.reflectionFinal/,
    /item\?\.reflectionFinal\s*\|\|\s*item\?\.reflection/,
    /suggestedReflectionV2/,
  ].forEach((pattern) => {
    assert.doesNotMatch(matcherSource, pattern)
  })
})
