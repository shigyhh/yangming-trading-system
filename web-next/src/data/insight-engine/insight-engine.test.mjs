import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const engineDir = new URL("./", import.meta.url)
const scenesDir = new URL("./scenes/", engineDir)
const manifest = JSON.parse(readFileSync(new URL("./scenes/manifest.json", engineDir), "utf8"))
const scene01 = JSON.parse(readFileSync(new URL("./scenes/scene-01-chase-surge.json", engineDir), "utf8"))
const schemaSource = readFileSync(new URL("./schema.ts", engineDir), "utf8")

const requiredRecordFields = [
  "sceneId",
  "sceneName",
  "mirrorId",
  "intensity",
  "thought",
  "reflection",
  "thief",
  "evidence",
  "practice",
]

function assertInsightRecord(record) {
  assert.deepEqual(Object.keys(record), requiredRecordFields)
  assert.equal(typeof record.sceneId, "string")
  assert.equal(typeof record.sceneName, "string")
  assert.equal(typeof record.mirrorId, "string")
  assert.ok(Number.isInteger(record.intensity))
  assert.ok(record.intensity >= 1 && record.intensity <= 5)
  assert.equal(typeof record.thought, "string")
  assert.equal(typeof record.reflection, "string")
  assert.equal(typeof record.thief, "string")
  assert.equal(typeof record.evidence, "string")
  assert.equal(typeof record.practice, "string")
}

test("insight engine reserves a 36-scene structure without generating all scenes", () => {
  const sceneFiles = readdirSync(scenesDir).filter((file) => /^scene-\d{2}-.+\.json$/.test(file))

  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.targetSceneCount, 36)
  assert.equal(manifest.filenamePattern, "scene-XX-slug.json")
  assert.deepEqual(manifest.recordFlow, ["scene", "thought", "reflection", "thief", "evidence", "practice"])
  assert.deepEqual(manifest.recordFields, requiredRecordFields)
  assert.ok(sceneFiles.length < manifest.targetSceneCount)
})

test("scene files use the unified scene-to-practice schema", () => {
  assert.equal(scene01.schemaVersion, 1)
  assert.equal(scene01.sceneId, "scene-01-chase-surge")
  assert.equal(scene01.sceneName, "急涨时")
  assert.equal(scene01.status, "draft")
  assert.ok(Array.isArray(scene01.records))

  for (const record of scene01.records) {
    assertInsightRecord(record)
    assert.equal(record.sceneId, scene01.sceneId)
    assert.equal(record.sceneName, scene01.sceneName)
  }
})

test("schema exposes the shared engine contract for future callers", () => {
  assert.match(schemaSource, /export type InsightRecord/)
  assert.match(schemaSource, /export type InsightSceneFile/)
  assert.match(schemaSource, /INSIGHT_ENGINE_TARGET_SCENE_COUNT = 36/)
  assert.match(schemaSource, /makeInsightKey/)
  assert.match(schemaSource, /isInsightIntensity/)
})
