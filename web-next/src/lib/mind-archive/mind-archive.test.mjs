import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typesUrl = new URL("./types.ts", import.meta.url)
const eventRepoUrl = new URL("./oneThoughtEventRepository.ts", import.meta.url)
const ritualFlowUrl = new URL("../../features/assessment/ZhaoxinRitualFlow.tsx", import.meta.url)
const ritualFacadeUrl = new URL("../../features/assessment/OneThoughtRitualFlow.tsx", import.meta.url)
const gatewayUrl = new URL("../../features/assessment/MirrorGateway.tsx", import.meta.url)
const entryPageUrl = new URL("../../app/assessment-entry/page.tsx", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)

test("OneThoughtEvent contract names the P0 ritual boundary", async () => {
  const types = await readFile(typesUrl, "utf8")

  ;[
    'PRIVATE_REFLECTION_VERSION = "reflection_final_shenji_zeyou_v1"',
    'ONE_THOUGHT_RITUAL_NAME = "照见一念仪轨"',
    'ONE_THOUGHT_RITUAL_VERSION = "one_thought_ritual_v1"',
    "export type OneThoughtReaction",
    '"seen"',
    '"not_hit"',
    '"stopped"',
    '"still_moving"',
    "export interface OneThoughtEvent",
    "heartEvidence?: string",
    "practiceText?: string",
    "ritualName?: OneThoughtRitualName",
    "ritualVersion?: OneThoughtRitualVersion",
    "ritualStatus?: RitualStatus",
    "sealStage?: OneThoughtSealStage",
    "zhaojianThisHeartAt?: string",
    "zhaojianThisThoughtAt?: string",
    '"one_thought_ritual"',
  ].forEach((token) => {
    assert.equal(types.includes(token), true, `missing P0 type token: ${token}`)
  })
})

test("OneThoughtRitual facade owns the public process name", async () => {
  const facade = await readFile(ritualFacadeUrl, "utf8")
  const gateway = await readFile(gatewayUrl, "utf8")

  assert.match(facade, /export \{ default \} from "\.\/ZhaoxinRitualFlow"/)
  assert.match(gateway, /OneThoughtRitualFlow/)
  assert.match(gateway, /<OneThoughtRitualFlow/)
  assert.doesNotMatch(gateway, /<ZhaoxinRitualFlow/)
})

test("首页照见一念 enters the ritual through the existing entry route", async () => {
  const entryPage = await readFile(entryPageUrl, "utf8")

  ;[
    "照",
    "照见此心",
    "/assessment",
  ].forEach((token) => {
    assert.equal(entryPage.includes(token), true, `missing entry ritual token: ${token}`)
  })
})

test("OneThoughtRitual contains the fixed P0 nodes and reflectionFinal source", async () => {
  const ritualFlow = await readFile(ritualFlowUrl, "utf8")

  ;[
    'aria-label="照见一念仪轨"',
    "oneThoughtReactionOptions",
    '{ value: "seen", label: "照见了" }',
    '{ value: "not_hit", label: "没照到" }',
    '{ value: "stopped", label: "愿止一念" }',
    '{ value: "still_moving", label: "心还在动" }',
    "照见此念",
    "selectedInsight.reflection",
    "selectedInsight.thief",
    "selectedInsight.evidence",
    "selectedInsight.practice",
    "落印入档",
    "getReflection(selectedThought.sceneId, selectedThought.id)",
    "reflectionFinal: finalReflectionEntry.reflectionFinal",
    "reflectionVersion: PRIVATE_REFLECTION_VERSION",
  ].forEach((token) => {
    assert.equal(ritualFlow.includes(token), true, `missing ritual flow token: ${token}`)
  })
})

test("落印 finalizes a sealed oneThoughtEvent with selected feedback", async () => {
  const ritualFlow = await readFile(ritualFlowUrl, "utf8")
  const eventRepo = await readFile(eventRepoUrl, "utf8")

  ;[
    "createOneThoughtEvent",
    "ONE_THOUGHT_RITUAL_NAME",
    "ONE_THOUGHT_RITUAL_VERSION",
    'ritualStatus: "sealed"',
    'source: "one_thought_ritual"',
    "userReaction: selectedReaction",
    "userReactionAt: completedAt",
    "reflectionSeen: true",
    "sealedAt: completedAt",
  ].forEach((token) => {
    assert.equal(ritualFlow.includes(token), true, `missing sealed event token: ${token}`)
  })

  assert.match(eventRepo, /event\.ritualStatus === "sealed"/)
  assert.match(eventRepo, /if \(value === "zhaojian_yinian_ritual"\) return "one_thought_ritual"/)
})

test("众念心湖 remains isolated from sealed OneThoughtRitual events", async () => {
  const lakePage = await readFile(lakePageUrl, "utf8")

  assert.doesNotMatch(lakePage, /createOneThoughtEvent/)
  assert.doesNotMatch(lakePage, /ritualStatus:\s*"sealed"/)
  assert.doesNotMatch(lakePage, /ONE_THOUGHT_RITUAL_VERSION/)
})
