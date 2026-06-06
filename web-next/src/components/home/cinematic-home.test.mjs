import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const homeShellUrl = new URL("./cinematic-home.tsx", import.meta.url)
const heroUrl = new URL("./hero-section.tsx", import.meta.url)
const entryUrl = new URL("./personality-entry-section.tsx", import.meta.url)
const perspectiveUrl = new URL("./home-perspective-field.tsx", import.meta.url)
const journeyUrl = new URL("./mind-journey-section.tsx", import.meta.url)
const aiFocusUrl = new URL("./ai-focus-section.tsx", import.meta.url)
const topNavUrl = new URL("./top-nav.tsx", import.meta.url)
const insightCardUrl = new URL("./insight-card.tsx", import.meta.url)
const flowButtonUrl = new URL("./flow-button.tsx", import.meta.url)
const globalsUrl = new URL("../../app/globals.css", import.meta.url)

test("home shell keeps the current Sprint8 entry path focused", async () => {
  const homeShell = await readFile(homeShellUrl, "utf8")
  const hero = await readFile(heroUrl, "utf8")
  const entry = await readFile(entryUrl, "utf8")
  const perspective = await readFile(perspectiveUrl, "utf8")
  const journey = await readFile(journeyUrl, "utf8")
  const aiFocus = await readFile(aiFocusUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")
  const insightCard = await readFile(insightCardUrl, "utf8")
  const flowButton = await readFile(flowButtonUrl, "utf8")
  const globals = await readFile(globalsUrl, "utf8")

  ;[
    "HeroSection",
    "HomePerspectiveField",
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
  assert.ok(hero.includes("hero-heart-lake"), "hero should share the heart lake visual world with later seeing pages")
  assert.ok(hero.includes("hero-lake-ripple"), "hero should include restrained lake ripples")
  assert.ok(hero.includes("hero-lake-particle"), "hero should include subtle floating particles")
  assert.ok(hero.includes("--ym-motion-fade-in"), "hero should use shared motion tokens")
  assert.ok(hero.includes('data-home-roll="hero"'), "hero must be a perspective scroll roll")
  assert.ok(hero.includes("data-home-roll-plane"), "hero must expose a perspective roll plane")
  assert.ok(homeShell.includes("HomePerspectiveField"), "home should install the perspective scroll field")
  assert.ok(homeShell.includes("<HomePerspectiveField />"), "home perspective field must render before public sections")
  assert.ok(homeShell.includes("<HomePerspectiveField />") && homeShell.indexOf("<HomePerspectiveField />") < homeShell.indexOf("<HeroSection />"))
  assert.ok(perspective.includes("[data-home-roll-plane]"), "perspective field must target roll planes")
  assert.ok(perspective.includes("--home-roll-scale"), "perspective field must expose scale depth token")
  assert.ok(perspective.includes("--home-roll-blur"), "perspective field must expose blur depth token")
  assert.ok(perspective.includes("--home-roll-z"), "perspective field must expose z-depth token")
  assert.ok(perspective.includes("home-perspective-atmosphere"), "perspective field should add shared long-scroll atmosphere")
  assert.ok(!perspective.includes("scrollLeft"), "perspective long-scroll must not use horizontal scrolling")
  assert.ok(journey.includes('data-home-roll="mind-journey"'), "mind journey must be a perspective scroll roll")
  assert.ok(journey.includes("data-home-roll-plane"), "mind journey sticky scene must expose a perspective roll plane")
  assert.ok(aiFocus.includes('data-home-roll="ai-focus"'), "cycle mirror section must be a perspective scroll roll")
  assert.ok(aiFocus.includes("data-home-roll-plane"), "cycle mirror section must expose a perspective roll plane")
  assert.ok(flowButton.includes("--ym-border-gold-low"), "home buttons should use shared seeing-system border tokens")
  assert.ok(flowButton.includes("--ym-motion-ease-out"), "home buttons should use shared seeing-system motion tokens")
  assert.ok(globals.includes("--ym-bg-deep-lake"), "global design tokens must define the deep lake background")
  assert.ok(globals.includes("--ym-text-primary"), "global design tokens must define warm ivory text")
  assert.ok(globals.includes("--ym-accent-gold"), "global design tokens must define muted gold accent")
  assert.ok(globals.includes("--ym-seal-cinnabar"), "global design tokens must define cinnabar seal color")
  assert.ok(globals.includes("--ym-motion-ripple"), "global motion tokens must define ripple timing")
  assert.ok(globals.includes("@keyframes ym-lake-ripple"), "global motion keyframes must expose shared lake ripple")
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
  assert.ok(entry.includes('data-home-roll="personality-entry"'), "ritual entry must be a perspective scroll roll")
  assert.ok(entry.includes("data-home-roll-plane"), "ritual entry must expose a perspective roll plane")
  assert.equal(entry.includes("<span>照</span>"), false, "home ritual seal must not render a font-based zhao glyph")
  assert.ok(entry.includes('href="/assessment-entry"'), "Sprint8 ritual entry must remain reachable after the worldview")
  assert.ok(entry.includes('router.push("/assessment-entry")'), "Sprint8 ritual entry must route to /assessment-entry")

  ;["/one-thought-lake", "/living-mirror-growth", "/trade-review", "/mirror-archive"].forEach((href) => {
    assert.ok(topNav.includes(`href: "${href}"`), `home nav missing Sprint8+ route: ${href}`)
  })
  assert.ok(topNav.includes("one-thought-bottom-nav"), "home should expose a mobile bottom entry into the heart lake")
  assert.ok(topNav.includes(">心湖</a>"), "mobile bottom nav should include the short 心湖 label")
})
