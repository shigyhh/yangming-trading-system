import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const homeShellUrl = new URL("./cinematic-home.tsx", import.meta.url)
const heroUrl = new URL("./hero-section.tsx", import.meta.url)
const entryUrl = new URL("./personality-entry-section.tsx", import.meta.url)
const topNavUrl = new URL("./top-nav.tsx", import.meta.url)
const insightCardUrl = new URL("./insight-card.tsx", import.meta.url)

test("home shell keeps the current Sprint8 entry path focused", async () => {
  const homeShell = await readFile(homeShellUrl, "utf8")
  const hero = await readFile(heroUrl, "utf8")
  const entry = await readFile(entryUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")
  const insightCard = await readFile(insightCardUrl, "utf8")

  ;[
    "HeroSection",
    "MindJourneySection",
    "AiFocusSection",
    "PersonalityEntrySection",
  ].forEach((componentName) => {
    assert.ok(homeShell.includes(componentName), `missing home section: ${componentName}`)
  })

  const renderOrder = [
    "<HeroSection />",
    "<MindJourneySection />",
    "<AiFocusSection />",
    "<PersonalityEntrySection />",
  ]
  let lastIndex = -1

  renderOrder.forEach((token) => {
    const index = homeShell.indexOf(token)
    assert.ok(index > lastIndex, `home section order changed or missing: ${token}`)
    lastIndex = index
  })

  assert.ok(hero.includes('href="#personality"'), "start button must enter the worldview section first")
  assert.ok(hero.includes('document.getElementById("personality")'), "start button must scroll to the worldview section")
  assert.ok(!hero.includes("@yangming/content/brand"), "home hero should not render the removed brand mantra strip")
  assert.ok(!hero.includes("brand-mantra"), "home hero should keep the first viewport free of mantra chips")
  assert.ok(hero.includes("brand-hero-title"), "hero title must use the brand display typography system")
  assert.ok(!hero.includes("YangmingA1Mark"), "hero should avoid duplicating the navigation brand mark")
  assert.ok(!hero.includes("REFLECTIVE INTELLIGENCE"), "hero should avoid duplicating the navigation brand lockup")
  assert.ok(topNav.includes("YangmingA1Mark"), "home nav must use original A1 vector mark instead of font text")
  assert.equal(topNav.includes(">照<"), false, "home nav must not render font-based zhao logo text")
  assert.ok(insightCard.includes("YangmingGlyph"), "AI insight card should use the original UI glyph system")
  assert.ok(insightCard.includes("@yangming/content/home-insight"), "AI insight card must read the daily content source")
  assert.ok(insightCard.includes("getHomeDailyInsightCard"), "AI insight card must rotate daily insight content")
  assert.equal(homeShell.includes("BrandCharacterSection"), false, "home should not render the zhao-bone character asset board")
  assert.equal(homeShell.includes("brand-character-section"), false, "home should keep brand asset previews out of the public homepage")
  assert.ok(entry.includes("YangmingA1Mark"), "home ritual seal must use the vector A1 mark")
  assert.equal(entry.includes("<span>照</span>"), false, "home ritual seal must not render a font-based zhao glyph")
  assert.ok(entry.includes('href="/assessment-entry"'), "Sprint8 ritual entry must remain reachable after the worldview")
  assert.ok(entry.includes('router.push("/assessment-entry")'), "Sprint8 ritual entry must route to /assessment-entry")

  ;["/living-mirror-growth", "/cycle-mirror", "/mirror-archive"].forEach((href) => {
    assert.ok(topNav.includes(`href: "${href}"`), `home nav missing Sprint8+ route: ${href}`)
  })
})
