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
const routeUrl = new URL("../../app/one-thought-lake/page.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)
const zhaoxinUrl = new URL("../assessment/ZhaoxinRitualFlow.tsx", import.meta.url)

test("one thought lake route and entrances exist without becoming a forum", async () => {
  const page = await readFile(pageUrl, "utf8")
  const route = await readFile(routeUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")
  const zhaoxin = await readFile(zhaoxinUrl, "utf8")

  assert.match(route, /OneThoughtLakePage/)
  assert.match(page, /一念心湖/)
  assert.match(page, /匿名看见众人的一念，也匿名放下自己的一念。/)
  assert.match(page, /心湖只照见交易中的念头，不提供投资建议。/)
  assert.match(page, /我也有这一念/)
  assert.match(page, /写下我的一念/)
  assert.match(page, /同念回响/)
  assert.match(page, /同一念的人，会收到这里的回响。/)
  assert.match(page, /matchUserThought/)
  assert.match(page, /saveOneThoughtRecord/)
  assert.doesNotMatch(page, /hiddenThought/)
  assert.doesNotMatch(page, /帖子/)
  assert.doesNotMatch(page, /点赞榜/)
  assert.doesNotMatch(page, /头像/)
  assert.match(topNav, /一念心湖/)
  assert.match(topNav, /href: "\/one-thought-lake"/)
  assert.match(topNav, /one-thought-bottom-nav/)
  assert.match(topNav, />心湖</)
  assert.match(zhaoxin, /去心湖看看，多少人也有这一念/)
  assert.match(zhaoxin, /href="\/one-thought-lake"/)
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
    "匿名放入心湖",
    "存入我的心镜档案",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing anonymous thought token: ${token}`)
  })

  assert.doesNotMatch(page, /className=.*is-anonymous/)
  assert.doesNotMatch(page, /lake-sphere/)
  assert.doesNotMatch(page, /hiddenThought/)
})

test("one thought lake engine seeds the full one-thought pool and screens risky content", async () => {
  const engine = await readFile(engineUrl, "utf8")

  ;[
    "buildMockOneThoughtLakeEntries",
    "for (const thought of sourceItems)",
    "createOneThoughtLakeEntry",
    "readOneThoughtLakeEntries",
    "saveOneThoughtLakeEntry",
    "resonateWithOneThoughtLakeEntry",
    "screenOneThoughtLakeInput",
    "blockedPatterns",
    "目标价",
    "推荐买入",
    "联系方式",
    "sameThoughtCount",
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
