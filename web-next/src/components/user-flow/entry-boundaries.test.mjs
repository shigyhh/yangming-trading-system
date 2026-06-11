import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const stillHeroUrl = new URL("../home/HomeStillWaterHero.tsx", import.meta.url)
const storySectionsUrl = new URL("../home/story-sections.tsx", import.meta.url)
const topNavUrl = new URL("../home/top-nav.tsx", import.meta.url)
const gatesUrl = new URL("../home/HomeGatesSection.tsx", import.meta.url)
const insightCardUrl = new URL("../home/insight-card.tsx", import.meta.url)
const todaySealedUrl = new URL("../../app/today-sealed/page.tsx", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)
const lakeEngineUrl = new URL("../../features/one-thought-lake/oneThoughtLakeEngine.ts", import.meta.url)

test("home keeps one private start entrance and sends it to the still-heart ritual", async () => {
  const stillHero = await readFile(stillHeroUrl, "utf8")
  const storySections = await readFile(storySectionsUrl, "utf8")

  ;[stillHero, storySections].forEach((source) => {
    assert.match(source, /REFLECT_ENTRY_HREF = "\/assessment-entry"/)
    assert.match(source, /照见一念/)
    assert.doesNotMatch(source, /REFLECT_ENTRY_HREF = "\/reflect"/)
    assert.doesNotMatch(source, /router\.push\("\/reflect"\)/)
  })
})

test("home nav and legacy home cards route today status to 今日所照, not a duplicate start", async () => {
  const topNav = await readFile(topNavUrl, "utf8")
  const gates = await readFile(gatesUrl, "utf8")
  const insightCard = await readFile(insightCardUrl, "utf8")

  assert.match(topNav, /{ label: "今日所照", href: "\/today-sealed" }/)
  assert.doesNotMatch(topNav, /{ label: "今日照见", href: "\/reflect" }/)
  assert.equal(topNav.includes("照见一念"), false, "top nav should leave the private start action to the hero doorway")

  ;[gates, insightCard].forEach((source) => {
    assert.match(source, /今日所照/)
    assert.match(source, /\/today-sealed/)
    assert.doesNotMatch(source, /href:\s*"\/reflect"[\s\S]{0,120}(name|label):\s*"今日照见"/)
    assert.doesNotMatch(source, /(name|label):\s*"今日照见"[\s\S]{0,120}href:\s*"\/reflect"/)
  })
})

test("today sealed page reads private oneThoughtEvent records and is not a free input page", async () => {
  const page = await readFile(todaySealedUrl, "utf8")

  assert.match(page, /今日所照/)
  assert.match(page, /listOneThoughtEvents/)
  assert.match(page, /DEFAULT_MIND_ARCHIVE_USER_ID/)
  assert.match(page, /isSealedOneThoughtEvent/)
  assert.match(page, /reviewStatusLabel/)
  assert.match(page, /继续照见一念/)
  assert.match(page, /href="\/assessment-entry"/)
  assert.match(page, /reflectionFinal/)
  assert.doesNotMatch(page, /textarea/i)
  assert.doesNotMatch(page, /OneThoughtLakePage/)
})

test("crowd thought lake remains anonymous free input and does not write private events", async () => {
  const page = await readFile(lakePageUrl, "utf8")
  const engine = await readFile(lakeEngineUrl, "utf8")

  assert.match(page, /众念心湖/)
  assert.match(page, /匿名放入众念心湖/)
  assert.match(page, /投念入湖/)
  assert.match(page, /action="\/reflect" method="get"/)
  assert.match(page, /name="source" value="lake"/)
  assert.doesNotMatch(page, /众念心湖是匿名共照空间，不写入私人心镜档案。/)
  assert.doesNotMatch(page, /createOneThoughtEvent/)
  assert.doesNotMatch(page, /ONE_THOUGHT_EVENT_STORAGE_KEY/)
  assert.doesNotMatch(engine, /createOneThoughtEvent/)
  assert.doesNotMatch(engine, /ONE_THOUGHT_EVENT_STORAGE_KEY/)
})
