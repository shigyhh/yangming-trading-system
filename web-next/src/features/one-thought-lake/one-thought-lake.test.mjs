import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./OneThoughtLakePage.tsx", import.meta.url)
const engineUrl = new URL("./oneThoughtLakeEngine.ts", import.meta.url)
const thoughtFieldUrl = new URL("./visual/ThoughtField.tsx", import.meta.url)
const configUrl = new URL("./visual/config.ts", import.meta.url)
const noiseUrl = new URL("./visual/noise.ts", import.meta.url)
const readmeUrl = new URL("./visual/README.md", import.meta.url)
const shadersUrl = new URL("./visual/shaders.ts", import.meta.url)
const routeUrl = new URL("../../app/lake/page.tsx", import.meta.url)
const aliasRouteUrl = new URL("../../app/one-thought-lake/page.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)
const returnHomeUrl = new URL("../../components/navigation/ReturnHomeLink.tsx", import.meta.url)

test("one thought lake route and entrances exist without becoming a forum", async () => {
  const page = await readFile(pageUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const route = await readFile(routeUrl, "utf8")
  const aliasRoute = await readFile(aliasRouteUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")
  const returnHome = await readFile(returnHomeUrl, "utf8")

  assert.match(route, /OneThoughtLakePage/)
  assert.match(aliasRoute, /redirect\("\/lake"\)/)
  assert.match(route, /one-thought-lake-page/)
  assert.match(route, /radial-gradient\(circle at 50% 38%/)
  assert.match(route, /lake-header/)
  assert.match(page, /众念心湖/)
  assert.match(page, /匿名看见众人的一念，也匿名放下自己的一念。/)
  assert.match(page, /匿名漂浮一念/)
  assert.match(page, /今日共照/)
  assert.match(page, /\.lake-header h1/)
  assert.match(page, /color: rgba\(244, 235, 221, 0\.96\)/)
  assert.match(page, /\.lake-focus-panel h2/)
  assert.match(page, /众念心湖只照见交易中的念头，不提供投资建议。/)
  assert.doesNotMatch(page, /众念心湖是匿名共照空间，不写入私人心镜档案。/)
  assert.match(page, /ReturnHomeLink/)
  assert.match(returnHome, /aria-label="回到首页"/)
  assert.match(returnHome, /← 回首页/)
  assert.doesNotMatch(page, /回首页 →/)
  assert.match(page, /我也有这一念/)
  assert.match(page, /写下我的一念/)
  assert.match(page, /写下你的一念/)
  assert.match(page, /同念回响/)
  assert.match(page, /同一念的人，会收到这里的回响。/)
  assert.match(page, /matchUserThought/)
  assert.match(page, /action="\/reflect" method="get"/)
  assert.match(page, /name="source" value="lake"/)
  assert.match(page, /name="text" value=\{selectedEntryText\}/)
  assert.match(page, /照见此念/)
  assert.match(page, /投念入湖/)
  assert.match(page, /湖中归类/)
  assert.match(page, /这念的力/)
  assert.match(page, /镜影/)
  assert.match(page, /若想把这一念照成自己的心证，请进入今日照见。/)
  assert.doesNotMatch(page, /照回这一念/)
  assert.doesNotMatch(page, /这一念落在：/)
  assert.doesNotMatch(page, /镜中显影：/)
  assert.doesNotMatch(page, /saveOneThoughtRecord/)
  assert.doesNotMatch(page, /createOneThoughtEvent/)
  assert.doesNotMatch(page, /oneThoughtEventRepository/)
  assert.doesNotMatch(page, /ONE_THOUGHT_EVENT_STORAGE_KEY/)
  assert.doesNotMatch(engine, /createOneThoughtEvent/)
  assert.doesNotMatch(engine, /oneThoughtEventRepository/)
  assert.doesNotMatch(engine, /ONE_THOUGHT_EVENT_STORAGE_KEY/)
  assert.doesNotMatch(page, /hiddenThought/)
  assert.doesNotMatch(page, /<p className="lake-kicker">匿名共照<\/p>/)
  assert.doesNotMatch(page, /帖子/)
  assert.doesNotMatch(page, /点赞榜/)
  assert.doesNotMatch(page, /头像/)
  assert.match(topNav, /众念心湖/)
  assert.match(topNav, /href: "\/lake"/)
  assert.doesNotMatch(topNav, /one-thought-bottom-nav/)
})

test("one thought lake renders a Three.js thought cloud instead of the old sphere", async () => {
  const page = await readFile(pageUrl, "utf8")
  const thoughtField = await readFile(thoughtFieldUrl, "utf8")
  const config = await readFile(configUrl, "utf8")
  const shaders = await readFile(shadersUrl, "utf8")
  const noise = await readFile(noiseUrl, "utf8")

  assert.match(page, /ThoughtField/)
  assert.doesNotMatch(page, /lake-sphere/)
  assert.doesNotMatch(page, /buildSpherePoint/)
  assert.doesNotMatch(page, /sphereEntries/)

  ;[
    "new THREE.WebGLRenderer",
    "ShaderMaterial",
    "BufferGeometry",
    "THREE.Points",
    "LineSegments",
    "requestAnimationFrame",
    "createSeededRandom",
    "fractalNoise2d",
    "innerVoidRadius",
    "monkeyMindStrength",
    "horseMindStrength",
    "centerFireIntensity",
    "preserveDrawingBuffer",
    "wan-nian-gui-xin.png",
    "Space 暂停",
    "H 隐藏",
    "R 重置",
    "S 截图",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "DEBUG_PANEL_ENABLED && showDebug",
    "target?.tagName === \"INPUT\"",
    "target?.tagName === \"TEXTAREA\"",
  ].forEach((token) => {
    assert.equal(thoughtField.includes(token), true, `missing thought field token: ${token}`)
  })

  assert.match(config, /particleCount:\s*1240/)
  assert.match(config, /maxThreads:\s*72/)
  assert.match(config, /threadOpacity:\s*0\.042/)
  assert.match(shaders, /gl_PointSize/)
  assert.match(shaders, /smoothstep/)
  assert.match(noise, /createSeededRandom/)
  assert.doesNotMatch(thoughtField, /hiddenThought/)
  assert.doesNotMatch(thoughtField, /thought-debug-toggle/)
  assert.doesNotMatch(thoughtField, />\s*调\s*</)
  assert.doesNotMatch(page, /lake-thought-slip/, "heart lake should no longer use flat floating slips")
})

test("anonymous thoughts stay separated from the official thought cloud", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "anonymousColors",
    "isAnonymousLakeEntry",
    "getEntryDisplayText",
    "entry.anonymousText",
    "seedEntries",
    "anonymousEntries",
    "entries.filter((entry) => !isAnonymousLakeEntry(entry))",
    "entries.filter(isAnonymousLakeEntry)",
    "lake-anonymous-band",
    "lake-anonymous-node",
    "lake-hover-preview",
    "--node-color",
    "匿名放入众念心湖",
    "照见此念",
    "getTodayLiveBase",
    "36 + (getTodayLiveSeed() % 18)",
    "Math.min(96",
    "getDisplayTopEntry",
    "const localEntries = entries.filter(isAnonymousLakeEntry)",
    "getOneThoughtLakeStats(seedEntries)",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing anonymous thought token: ${token}`)
  })

  assert.doesNotMatch(page, /className=.*is-anonymous/)
  assert.doesNotMatch(page, /lake-sphere/)
  assert.doesNotMatch(page, /hiddenThought/)
  assert.doesNotMatch(page, /const countedEntries/)
  assert.doesNotMatch(page, /stats\.total \+ liveTotalOffset/)
  assert.doesNotMatch(page, /getOneThoughtLakeStats\(lakeComments\)/)
})

test("one thought lake limits daily submitted thoughts without limiting comments", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "DAILY_LAKE_THOUGHT_LIMIT = 3",
    "今日已放三念，今日宜止。",
    "getTodayLocalThoughtCount",
    "dailyThoughtLimitReached",
    "todayLocalThoughtCount",
    "今日已放 {todayLocalThoughtCount}/{DAILY_LAKE_THOUGHT_LIMIT} 念",
    "handleToggleCompose",
    "setDraftEntry(null)",
    "playThoughtSinkEffect",
    "thoughtSinkActive",
    "is-sinking",
    "lakeThoughtSink",
    "lakeThoughtSinkRipple",
    "lake-compose-trigger",
    "收起这一念",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing daily limit token: ${token}`)
  })

  assert.doesNotMatch(page, /lake-compose-head/)
  assert.doesNotMatch(page, />\s*写一念\s*</)

  const commentBlock = page.match(/function handleComment[\s\S]*?function handleToggleCompose/)?.[0] ?? ""
  const matchBlock = page.match(/function handleMatch[\s\S]*?function handlePlaceIntoLake/)?.[0] ?? ""
  const placeBlock = page.match(/function handlePlaceIntoLake[\s\S]*?return \(/)?.[0] ?? ""

  assert.doesNotMatch(commentBlock, /dailyThoughtLimitReached|DAILY_LAKE_THOUGHT_LIMIT/)
  assert.match(matchBlock, /dailyThoughtLimitReached/)
  assert.match(placeBlock, /dailyThoughtLimitReached/)
})

test("one thought lake engine seeds the full one-thought pool and screens risky content", async () => {
  const engine = await readFile(engineUrl, "utf8")

  ;[
    "buildMockOneThoughtLakeEntries",
    "for (const thought of sourceItems)",
    "createOneThoughtLakeEntry",
    "getReflection(thought.sceneId, thought.itemId)?.reflectionFinal",
    "itemId: thought.itemId",
    "reflectionFinal",
    "readOneThoughtLakeEntries",
    "saveOneThoughtLakeEntry",
    "resonateWithOneThoughtLakeEntry",
    "screenOneThoughtLakeInput",
    "blockedPatterns",
    "tradingThoughtPattern",
    "ONE_THOUGHT_LAKE_BLOCKED_INPUT_REASON",
    "ONE_THOUGHT_LAKE_UNRELATED_INPUT_REASON",
    "/^[\\d\\s+-]+$/",
    "股票代码",
    "收益数字",
    "\\b\\d{10,}\\b",
    "目标价",
    "荐股",
    "喊单",
    "带单",
    "推荐买入",
    "联系方式",
    "sameThoughtCount",
    "seedCounts = [42, 38, 35",
    "ONE_THOUGHT_LAKE_COMMENT_KEY",
    "readOneThoughtLakeComments",
    "createOneThoughtLakeComment",
    "saveOneThoughtLakeComment",
  ].forEach((token) => {
    assert.equal(engine.includes(token), true, `missing engine token: ${token}`)
  })

  assert.doesNotMatch(engine, /selected\.length >= 12/, "seed pool must not stop at twelve entries")
  assert.doesNotMatch(engine, /hiddenThought/)
})

test("one thought lake blocks phone numbers and contact-like digit strings", async () => {
  const engine = await readFile(engineUrl, "utf8")

  assert.match(engine, /1\[3-9\]/, "engine should block mainland mobile number patterns")
  assert.match(engine, /\/\^\[\\d\\s\+-\]\+\$\//, "engine should block pure digit-like input")
  assert.match(engine, /\\b\\d\{10,\}\\b/, "engine should block long contact-like digit strings")
  assert.match(engine, /手机号\|联系方式/)
})

test("one thought lake rejects blocked input before generating a match", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "liveInputScreen",
    "inputRejected",
    "handleInputTextChange",
    "ONE_THOUGHT_LAKE_BLOCKED_INPUT_REASON",
    "ONE_THOUGHT_LAKE_UNRELATED_INPUT_REASON",
    "aria-invalid={inputRejected}",
    "disabled={inputRejected}",
    "setDraftEntry(null)",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing live block token: ${token}`)
  })
})

test("thought field README documents runtime controls and tuning parameters", async () => {
  const readme = await readFile(readmeUrl, "utf8")

  ;[
    "Next.js",
    "Three.js",
    "particleCount",
    "innerVoidRadius",
    "cloudRadius",
    "outerScatter",
    "goldIntensity",
    "threadOpacity",
    "mistOpacity",
    "animationSpeed",
    "monkeyMindStrength",
    "horseMindStrength",
    "returnStrength",
    "centerFireIntensity",
    "backgroundGrain",
    "Space",
    "H",
    "R",
    "S",
  ].forEach((token) => {
    assert.equal(readme.includes(token), true, `missing README token: ${token}`)
  })
})
