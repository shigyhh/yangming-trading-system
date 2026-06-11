import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const homeGateUrl = new URL("./HomeEntryGate.tsx", import.meta.url)
const homeUrl = new URL("../home/cinematic-home.tsx", import.meta.url)
const stillHeroUrl = new URL("../home/HomeStillWaterHero.tsx", import.meta.url)
const storySectionsUrl = new URL("../home/story-sections.tsx", import.meta.url)
const reflectUrl = new URL("../../app/reflect/page.tsx", import.meta.url)
const lakePageUrl = new URL("../../app/lake/page.tsx", import.meta.url)
const lakeAliasUrl = new URL("../../app/one-thought-lake/page.tsx", import.meta.url)
const assessmentUrl = new URL("../../app/assessment/page.tsx", import.meta.url)
const oneThoughtLakeUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)
const archiveEngineUrl = new URL("../../features/mirror-archive/archiveEngine.ts", import.meta.url)
const scrollEngineUrl = new URL("../../features/mirror-scroll/scrollEngine.ts", import.meta.url)
const bottomNavUrl = new URL("../app-bottom-nav.tsx", import.meta.url)
const zhaoxinUrl = new URL("../../features/assessment/ZhaoxinRitualFlow.tsx", import.meta.url)

test("home gate stays disabled while everyone follows the same entry flow", async () => {
  const gate = await readFile(homeGateUrl, "utf8")
  const home = await readFile(homeUrl, "utf8")

  assert.equal(gate.trim(), `"use client"\n\nexport function HomeEntryGate() {\n  return null\n}`)
  assert.match(home, /<HomeEntryGate \/>/)
})

test("home one-thought entrances go through the assessment-entry seal", async () => {
  const stillHero = await readFile(stillHeroUrl, "utf8")
  const storySections = await readFile(storySectionsUrl, "utf8")

  ;[stillHero, storySections].forEach((source) => {
    assert.match(source, /REFLECT_ENTRY_HREF = "\/assessment-entry"/)
    assert.match(source, /router\.push\(REFLECT_ENTRY_HREF\)/)
    assert.match(source, /href=\{REFLECT_ENTRY_HREF\}/)
    assert.doesNotMatch(source, /\/reflect\?fresh=1/)
    assert.doesNotMatch(source, /router\.push\("\/reflect"\)/)
  })
})

test("reflect route becomes the daily entry instead of redirecting to assessment-entry", async () => {
  const reflect = await readFile(reflectUrl, "utf8")

  assert.doesNotMatch(reflect, /redirect\("\/assessment-entry"\)/)
  assert.match(reflect, /searchParams\.get\("fresh"\) === "1"/)
  assert.match(reflect, /searchParams\.get\("dev"\) === "1"/)
  assert.match(reflect, /searchParams\.get\("showCompleted"\) === "1"/)
  assert.match(reflect, /resume"\) === "1"/)
  assert.match(reflect, /shouldReadStoredRecord/)
  assert.match(reflect, /readStableTodayOneThought/)
  assert.match(reflect, /handleUseDailyThought/)
  assert.match(reflect, /source:\s*"daily_engine"/)
  assert.match(reflect, /今日一念暂未生成，请稍后再试。/)
  assert.match(reflect, /今天，/)
  assert.match(reflect, /你起了哪一念？/)
  assert.match(reflect, /照见此念/)
  assert.match(reflect, /照见今日一念/)
  assert.match(reflect, /继续上一次照见/)
  assert.match(reflect, /今日照见已落印/)
  assert.match(reflect, /查看心镜长卷/)
  assert.match(reflect, /查看心镜档案/)
  assert.match(reflect, /searchParams\.get\("source"\) === "lake"/)
  assert.match(reflect, /createDraftFromText\(lakeText,\s*"lake"\)/)
  assert.match(reflect, /reflectionFinal:\s*reflectionFinal/)
})

test("lake is anonymous and only hands a thought to reflect", async () => {
  const lakePage = await readFile(lakePageUrl, "utf8")
  const lakeAlias = await readFile(lakeAliasUrl, "utf8")
  const lake = await readFile(oneThoughtLakeUrl, "utf8")

  assert.match(lakePage, /<OneThoughtLakePage \/>/)
  assert.match(lakeAlias, /redirect\("\/lake"\)/)
  assert.match(lake, /action="\/reflect" method="get"/)
  assert.match(lake, /name="source" value="lake"/)
  assert.match(lake, /name="text" value=\{selectedEntryText\}/)
  assert.match(lake, /照见此念/)
  assert.doesNotMatch(lake, /saveOneThoughtRecord/)
  assert.doesNotMatch(lake, /存入我的心镜档案/)
})

test("assessment owns the water gateway while lake alias stays a compatibility redirect", async () => {
  const assessment = await readFile(assessmentUrl, "utf8")
  const lakeAlias = await readFile(lakeAliasUrl, "utf8")

  assert.match(assessment, /MirrorGateway/)
  assert.match(assessment, /<MirrorGateway/)
  assert.match(assessment, /router\.push\("\/assessment-result"\)/)
  assert.doesNotMatch(assessment, /redirect\("\/reflect/)
  assert.match(lakeAlias, /redirect\("\/lake"\)/)
})

test("archive and scroll only read sealed one-thought records", async () => {
  const archiveEngine = await readFile(archiveEngineUrl, "utf8")
  const scrollEngine = await readFile(scrollEngineUrl, "utf8")

  assert.match(archiveEngine, /loadOneThoughtRecords\(\)\.filter\(\(record\) => record\.completed\)/)
  assert.match(scrollEngine, /loadOneThoughtRecords\(\)\.filter\(\(record\) => record\.completed\)/)
})

test("completed seal marks the visitor as returning", async () => {
  const zhaoxin = await readFile(zhaoxinUrl, "utf8")

  assert.match(zhaoxin, /markHomeIntroSeen/)
  assert.match(zhaoxin, /markReflectEntered/)
  assert.match(zhaoxin, /completed:\s*true/)
  assert.match(zhaoxin, /sealedAt:\s*completedAt/)
})

test("bottom nav is product-only and uses the new app routes", async () => {
  const bottomNav = await readFile(bottomNavUrl, "utf8")

  assert.match(bottomNav, /pathname === "\/reflect"/)
  assert.match(bottomNav, /{ label: "今日照见", href: "\/reflect" }/)
  assert.match(bottomNav, /{ label: "心镜长卷", href: "\/scroll" }/)
  assert.match(bottomNav, /{ label: "众念心湖", href: "\/lake" }/)
  assert.match(bottomNav, /{ label: "我的", href: "\/me" }/)
  assert.doesNotMatch(bottomNav, /pathname === "\/"/)
})
