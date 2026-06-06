import { readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const source = readFileSync(new URL("./MirrorGateway.tsx", import.meta.url), "utf8")
const zhaoxinSource = readFileSync(new URL("./ZhaoxinRitualFlow.tsx", import.meta.url), "utf8")
const heartLakeSource = readFileSync(new URL("./HeartLakeEngine.tsx", import.meta.url), "utf8")
const stillWaterSource = readFileSync(new URL("./StillWaterIntroMirror.tsx", import.meta.url), "utf8")
const assessmentPage = readFileSync(new URL("../../app/assessment/page.tsx", import.meta.url), "utf8")

test("assessment keeps the locked mirror gateway and mounts the heart lake ritual inside it", () => {
  assert.match(assessmentPage, /MirrorGateway/)
  assert.match(assessmentPage, /<MirrorGateway/)
  assert.doesNotMatch(assessmentPage, /HeartMoonNineMirrorsScene/)
  assert.match(source, /StillWaterIntroMirror/)
  assert.match(source, /HeartLakeEngine/)
  assert.match(source, /ZhaoxinRitualFlow/)
  assert.match(source, /showZhaoxinFlow/)
  assert.match(source, /initialScene="surge"/)
  assert.match(source, /initialIntensity=\{3\}/)
  assert.doesNotMatch(source, /<RitualCanvas/)
  assert.ok(
    source.indexOf("<StillWaterIntroMirror") < source.indexOf("<HeartLakeEngine"),
    "still water intro must mount before the heart lake engine",
  )
  assert.ok(
    source.indexOf("<HeartLakeEngine") < source.indexOf("<ZhaoxinRitualFlow"),
    "lake engine must mount before the ritual flow inside the gateway",
  )
  assert.match(source, /triggerRippleKey=\{rippleKey\}/)
})

test("mirror gateway keeps the fixed heart-lake prelude before nine-mirror flow", () => {
  const requiredCopy = [
    "市场还在那里",
    "行情还在那里",
    "此刻，",
    "你心里起了什么念？",
    "一念未起时，",
    "此心本自清明。",
  ]

  for (const text of requiredCopy) {
    assert.match(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(source, /still-water-gateway-copy/)
  assert.match(source, /STILL_WATER_ENTRY_ANCHOR/)
  assert.doesNotMatch(source, /若这一念截中你，就按下照见。/)
  assert.doesNotMatch(source, /<button[^>]*>\\s*照见此念\\s*<\/button>/)
  assert.doesNotMatch(source, /currentCopy\.kicker/)
  assert.doesNotMatch(source, /currentCopy\.main/)
})

test("assessment ritual viewport does not horizontally offset the full-screen layers", () => {
  const gatewayRule = source.match(/\.moon-heart-gateway \{[\s\S]*?\n        \}/)?.[0] ?? ""
  const zhaoxinRootRule = zhaoxinSource.match(/\.zhaoxin-ritual-flow \{[\s\S]*?\n        \}/)?.[0] ?? ""
  const zhaoxinGatewayRule =
    source.match(/\.moon-heart-gateway\.is-zhaoxin-flow :global\(\.zhaoxin-ritual-flow\) \{[\s\S]*?\n        \}/)?.[0] ??
    ""

  assert.match(assessmentPage, /<AssessmentShell className="p-0 md:p-0" contentWidth="wide">/)
  assert.doesNotMatch(gatewayRule, /left:\s*50%/)
  assert.doesNotMatch(gatewayRule, /translateX\(-50%\)/)
  assert.doesNotMatch(zhaoxinRootRule, /left:\s*50%/)
  assert.doesNotMatch(zhaoxinRootRule, /translateX\(-50%\)/)
  assert.match(zhaoxinGatewayRule, /transform:\s*none;/)
})

test("one-thought lake owns the resonance confirm button", () => {
  assert.match(zhaoxinSource, /is-thought-confirm/)
  assert.match(zhaoxinSource, /照见此念/)
  assert.match(zhaoxinSource, /若这一念正是你，请轻触照见。/)
  assert.match(zhaoxinSource, /今日已照三念，宜止。/)
  assert.match(zhaoxinSource, /它藏在\$\{selectedInsight\.mirrorName\}里。/)
  assert.match(zhaoxinSource, /这不是定论，是今天开始练的一面镜。/)
  assert.match(zhaoxinSource, /YangmingZhaoSeal/)
  assert.match(zhaoxinSource, /liangzhi-title-action/)
  assert.match(zhaoxinSource, /今日落印/)
  assert.match(zhaoxinSource, /我已照见，愿照此修行/)
  assert.match(zhaoxinSource, /轻触落印，把今日心证收入心镜档案。/)
  assert.match(zhaoxinSource, /aria-label="今日落印：我已照见，愿照此修行"/)
  assert.match(zhaoxinSource, /liangzhi-step-kicker/)
  assert.match(zhaoxinSource, /liangzhi-sealed-state/)
  assert.match(zhaoxinSource, /label="已照见"/)
  assert.match(zhaoxinSource, /showLabel/)
  assert.match(zhaoxinSource, /致良知，不是消灭念头。/)
  assert.match(zhaoxinSource, /是念起时，知道是谁在下单。/)
  assert.match(zhaoxinSource, /liangzhi-title-stamp/)
  assert.match(zhaoxinSource, /liangzhiStampPress/)
  assert.match(zhaoxinSource, /getNextHeartProofSequenceNumber/)
  assert.match(zhaoxinSource, /buildDailyGrowthHeartProof/)
  assert.match(zhaoxinSource, /saveHeartProof/)
  assert.match(zhaoxinSource, /sourceType: "daily_growth"/)
  assert.match(zhaoxinSource, /照见第\{heartProofSequenceNumber\}念/)
  assert.match(zhaoxinSource, /growth-proof/)
  assert.match(zhaoxinSource, /growth-proof-ledger/)
  assert.match(zhaoxinSource, /今日照见总结生成摘要/)
  assert.match(zhaoxinSource, /今日照见总结/)
  assert.match(zhaoxinSource, /本次照见/)
  assert.match(zhaoxinSource, /起念场景/)
  assert.match(zhaoxinSource, /今日修行/)
  assert.match(zhaoxinSource, /growthEvidenceLine/)
  assert.match(zhaoxinSource, /growthPracticeLine/)
  assert.match(zhaoxinSource, /onClick=\{completeLiangzhiHold\}/)
  assert.match(zhaoxinSource, /onRipple\?\.\(\)/)
  assert.match(zhaoxinSource, /stage === "thief" && revealStep === "mirrorName"[\s\S]*\? selectedInsight\.mirrorName/)
  assert.match(zhaoxinSource, /content: "你照见了";/)
  assert.doesNotMatch(zhaoxinSource, /你照见了：/)
  assert.match(zhaoxinSource, /stage === "thief" && revealStep === "evidence"[\s\S]*\? selectedInsight\.evidence/)
  assert.match(zhaoxinSource, /content: "今日心证";/)
  assert.doesNotMatch(zhaoxinSource, /title: "致良知"/)
  assert.doesNotMatch(zhaoxinSource, /liangzhi-sealed-title/)
  assert.doesNotMatch(zhaoxinSource, /liangzhi-inline-action/)
  assert.doesNotMatch(zhaoxinSource, /liangzhi-stamp-stage/)
  assert.doesNotMatch(zhaoxinSource, /is-liangzhi-hold/)
  assert.match(zhaoxinSource, /ritual-limit-actions/)
  assert.match(zhaoxinSource, /看心镜档案/)
  assert.match(zhaoxinSource, /进入成长谱/)
  assert.match(zhaoxinSource, /confirmThought/)
  assert.match(zhaoxinSource, /allowTodayOneThoughtPreviewLimitBypass/)
  assert.match(zhaoxinSource, /process\.env\.NODE_ENV !== "production"/)
  assert.match(zhaoxinSource, /stage === "thought"/)
  assert.match(zhaoxinSource, /scene01Insight/)
  assert.match(zhaoxinSource, /scene-01-chase-surge\.json/)
  assert.match(zhaoxinSource, /scene-03-small-position\.json/)
  assert.match(zhaoxinSource, /scene-04-sold-too-early\.json/)
  assert.match(zhaoxinSource, /scene-05-sold-too-late\.json/)
  assert.match(zhaoxinSource, /scene-06-floating-gain-fear\.json/)
  assert.match(zhaoxinSource, /scene-07-unwilling-stop-loss\.json/)
  assert.match(zhaoxinSource, /scene-08-hold-loss\.json/)
  assert.match(zhaoxinSource, /scene-09-average-down\.json/)
  assert.match(zhaoxinSource, /scene-10-more-average-down\.json/)
  assert.match(zhaoxinSource, /scene-11-revenge-trade\.json/)
  assert.match(zhaoxinSource, /scene-12-overconfidence\.json/)
  assert.match(zhaoxinSource, /scene-13-heavy-position\.json/)
  assert.match(zhaoxinSource, /scene-14-all-in\.json/)
  assert.match(zhaoxinSource, /scene-15-empty-position\.json/)
  assert.match(zhaoxinSource, /scene-16-change-plan\.json/)
  assert.match(zhaoxinSource, /scene-17-stop-loss-regret\.json/)
  assert.match(zhaoxinSource, /scene-18-profit-regret\.json/)
  assert.match(zhaoxinSource, /scene-19-open-impulse\.json/)
  assert.match(zhaoxinSource, /scene-20-close-impulse\.json/)
  assert.match(zhaoxinSource, /scene-21-after-close-regret\.json/)
  assert.match(zhaoxinSource, /scene-22-avoid-review\.json/)
  assert.match(zhaoxinSource, /scene-23-news-trigger\.json/)
  assert.match(zhaoxinSource, /scene-24-follow-call\.json/)
  assert.match(zhaoxinSource, /scene-25-hot-theme\.json/)
  assert.match(zhaoxinSource, /scene-26-bottom-fishing\.json/)
  assert.match(zhaoxinSource, /scene-27-high-buy\.json/)
  assert.match(zhaoxinSource, /scene-28-breakeven-obsession\.json/)
  assert.match(zhaoxinSource, /scene-29-unlock-obsession\.json/)
  assert.match(zhaoxinSource, /scene-30-see-right-no-buy\.json/)
  assert.match(zhaoxinSource, /scene-31-instant-regret\.json/)
  assert.match(zhaoxinSource, /scene-32-account-checking\.json/)
  assert.match(zhaoxinSource, /scene-33-stock-hopping\.json/)
  assert.match(zhaoxinSource, /scene-34-news-trading\.json/)
  assert.match(zhaoxinSource, /scene-35-fear-holding\.json/)
  assert.match(zhaoxinSource, /scene-36-fear-of-being-wrong\.json/)
  assert.match(zhaoxinSource, /selectedThought\.tradeMoment/)
  assert.match(zhaoxinSource, /selectedThought\.reflection/)
  assert.match(zhaoxinSource, /selectedThought\.thief/)
  assert.match(zhaoxinSource, /selectedThought\.evidence/)
  assert.match(zhaoxinSource, /selectedThought\.practice/)
  assert.doesNotMatch(zhaoxinSource, /hiddenThought/)
  assert.match(zhaoxinSource, /average_down:\s*"hold"/)
  assert.match(zhaoxinSource, /change_plan:\s*"hesitate"/)
  assert.match(zhaoxinSource, /revenge_trade:\s*"gamble"/)
  assert.match(zhaoxinSource, /overconfidence:\s*"gamble"/)
  assert.match(zhaoxinSource, /heavy_position:\s*"gamble"/)
  assert.match(zhaoxinSource, /all_in:\s*"gamble"/)
  assert.match(zhaoxinSource, /empty_position:\s*"anxiety"/)
  assert.match(zhaoxinSource, /stop_loss_regret:\s*"hesitate"/)
  assert.match(zhaoxinSource, /profit_regret:\s*"fantasy"/)
  assert.match(zhaoxinSource, /open_impulse:\s*"chase"/)
  assert.match(zhaoxinSource, /close_impulse:\s*"chase"/)
  assert.match(zhaoxinSource, /after_close_regret:\s*"delay"/)
  assert.match(zhaoxinSource, /avoid_review:\s*"delay"/)
  assert.match(zhaoxinSource, /news_trigger:\s*"herd"/)
  assert.match(zhaoxinSource, /follow_call:\s*"herd"/)
  assert.match(zhaoxinSource, /hot_theme:\s*"herd"/)
  assert.match(zhaoxinSource, /bottom_fishing:\s*"gamble"/)
  assert.match(zhaoxinSource, /high_buy:\s*"chase"/)
  assert.match(zhaoxinSource, /breakeven_obsession:\s*"hold"/)
  assert.match(zhaoxinSource, /unlock_obsession:\s*"hold"/)
  assert.match(zhaoxinSource, /see_right_no_buy:\s*"hesitate"/)
  assert.match(zhaoxinSource, /instant_regret:\s*"anxiety"/)
  assert.match(zhaoxinSource, /account_checking:\s*"anxiety"/)
  assert.match(zhaoxinSource, /stock_hopping:\s*"anxiety"/)
  assert.match(zhaoxinSource, /news_trading:\s*"herd"/)
  assert.match(zhaoxinSource, /fear_holding:\s*"anxiety"/)
  assert.match(zhaoxinSource, /fear_of_being_wrong:\s*"hold"/)
  assert.match(zhaoxinSource, /insightMirrors/)
  assert.match(zhaoxinSource, /readOrCreateTodayOneThought/)
  assert.match(zhaoxinSource, /drawTodayOneThought/)
  assert.match(zhaoxinSource, /confirmTodayOneThought/)
  assert.match(zhaoxinSource, /remainingConfirmations/)
  assert.match(zhaoxinSource, /ONE_THOUGHT_INITIAL_FLOAT_DELAY_MS\s*=\s*4200/)
  assert.match(zhaoxinSource, /ONE_THOUGHT_FLOAT_INTERVAL_MS\s*=\s*4200/)
  assert.match(zhaoxinSource, /floatTimer = window\.setTimeout\(floatToNextThought,\s*ONE_THOUGHT_INITIAL_FLOAT_DELAY_MS\)/)
  assert.match(zhaoxinSource, /floatTimer = window\.setTimeout\(floatToNextThought,\s*ONE_THOUGHT_FLOAT_INTERVAL_MS\)/)
  assert.doesNotMatch(zhaoxinSource, /window\.setInterval\(floatToNextThought/)
  assert.doesNotMatch(zhaoxinSource, /window\.setTimeout\(floatToNextThought,\s*1400\)/)
  assert.match(zhaoxinSource, /stage === "thought"[\s\S]*todayOneThought\.thoughtId/)
  assert.doesNotMatch(zhaoxinSource, /换一念/)
  assert.doesNotMatch(zhaoxinSource, /is-thought-change/)
  assert.match(zhaoxinSource, /setSelectedScene\(thoughtScene\)/)
  assert.match(zhaoxinSource, /setSelectedIntensity\(thoughtIntensity\)/)
  assert.doesNotMatch(zhaoxinSource, /那一句一念，正在照亮最贴近的一面心镜。/)
  assert.doesNotMatch(zhaoxinSource, /九镜从湖面远处浮现。/)
  assert.doesNotMatch(zhaoxinSource, /mirror-touch-hint/)
  assert.doesNotMatch(zhaoxinSource, /入心镜报告/)
  assert.doesNotMatch(zhaoxinSource, /stage === "empty"/)
})

test("liangzhi lake mode does not overexpose the heart lake when refreshed", () => {
  assert.match(source, /data-lake-mode=\{lakeMode\}/)
  assert.match(source, /opacity=\{lakeMode === "liangzhi" \? 0\.64/)
  assert.match(source, /moonPathIntensity=\{lakeMode === "liangzhi" \? 0\.34/)
  assert.match(source, /bloomScale=\{lakeMode === "liangzhi" \? 0\.42/)
  assert.match(source, /data-lake-mode="liangzhi"[\s\S]*opacity:\s*0\.12;/)
  assert.match(source, /data-lake-mode="liangzhi"[\s\S]*brightness\(0\.72\)/)
  assert.match(heartLakeSource, /liangzhi:\s*\{[\s\S]*shininess:\s*170/)
  assert.match(heartLakeSource, /liangzhi:\s*\{[\s\S]*bloom:\s*1\.35/)
  assert.match(heartLakeSource, /liangzhi:\s*\{[\s\S]*maskWidth:\s*0\.34/)
})

test("one-thought reveal cannot be frozen by stale hover pause state", () => {
  assert.match(zhaoxinSource, /const pauseReveal = \(\) => \{[\s\S]*stage === "thief" && revealStep !== "thought"/)
  assert.match(zhaoxinSource, /const resumeReveal = \(\) => \{[\s\S]*setIsRevealPaused\(false\)/)
  assert.match(zhaoxinSource, /onPointerEnter=\{pauseReveal\}/)
  assert.match(zhaoxinSource, /onPointerLeave=\{resumeReveal\}/)
  assert.match(zhaoxinSource, /setIsRevealPaused\(false\)[\s\S]*setStage\("thief"\)[\s\S]*setRevealStep\("reflectionOne"\)/)
})

test("one-thought trade moment copy is legible but lighter than the main OS", () => {
  const tradeMomentRule = zhaoxinSource.match(/\.thought-stage-sign strong \{[\s\S]*?\n        \}/)?.[0] ?? ""

  assert.match(tradeMomentRule, /font-size:\s*clamp\(0\.92rem,\s*1\.5vw,\s*1\.16rem\);/)
  assert.match(tradeMomentRule, /font-weight:\s*400;/)
  assert.match(tradeMomentRule, /letter-spacing:\s*0\.18em;/)
})

test("heart lake has natural moving glints and pressure-based pointer ripples", () => {
  assert.match(heartLakeSource, /import \* as THREE from "three"/)
  assert.match(heartLakeSource, /EffectComposer/)
  assert.match(heartLakeSource, /UnrealBloomPass/)
  assert.match(heartLakeSource, /PerspectiveCamera/)
  assert.match(heartLakeSource, /PlaneGeometry/)
  assert.match(heartLakeSource, /ShaderMaterial/)
  assert.match(heartLakeSource, /u_rippleStrength/)
  assert.match(heartLakeSource, /u_entryProgress/)
  assert.match(heartLakeSource, /normalFromHeight/)
  assert.match(heartLakeSource, /moonBandLayer/)
  assert.match(heartLakeSource, /rippleRing/)
  assert.match(heartLakeSource, /onPointerMove/)
  assert.match(heartLakeSource, /event\.pressure/)
  assert.match(heartLakeSource, /triggerPointerRipple\(event\.clientX, event\.clientY, "move"/)
  assert.match(heartLakeSource, /triggerPointerRipple\(event\.clientX, event\.clientY, "press"/)
  assert.doesNotMatch(heartLakeSource, /compileShader/)
  assert.doesNotMatch(heartLakeSource, /gl\.drawArrays/)
})

test("still water intro keeps touch ripples without periodic center ripples", () => {
  assert.match(stillWaterSource, /stirAtPointer/)
  assert.match(stillWaterSource, /pointermove/)
  assert.doesNotMatch(stillWaterSource, /lastAutoDrop/)
  assert.doesNotMatch(stillWaterSource, /autoInterval/)
  assert.doesNotMatch(stillWaterSource, /for \(let ring = 0; ring < 8/)
})

test("mirror gateway presents emotional payoff before naming the thieves", () => {
  assert.match(source, /你怕的不是错过行情/)
  assert.match(source, /那个“又慢了一步”的自己/)
  assert.match(source, /贪：想抓住更多/)
  assert.match(source, /急：怕慢一步就失去机会/)
  assert.ok(
    source.indexOf("照回情绪收益") < source.indexOf("心贼现形"),
    "emotional payoff must be shown before the thief seal",
  )

  const forbiddenCopy = ["推荐买入", "推荐卖出", "收益保证", "必赚", "抄底", "逃顶"]

  for (const text of forbiddenCopy) {
    assert.doesNotMatch(source, new RegExp(text))
  }
})

test("mirror gateway is not a nine-option questionnaire", () => {
  const mirrorNames = [
    "追涨之镜",
    "扛单之镜",
    "幻想之镜",
    "赌性之镜",
    "从众之镜",
    "犹疑之镜",
    "拖延之镜",
    "焦虑之镜",
    "良知之镜",
  ]

  for (const name of mirrorNames) {
    assert.match(source, new RegExp(name))
  }

  assert.doesNotMatch(source, /onComplete\(mirror\.id\)/)
  assert.doesNotMatch(source, /selectedMirrorId/)
  assert.doesNotMatch(source, /heart-mirror-side/)
  assert.doesNotMatch(source, /assessmentStorageKeys/)
  assert.match(source, /MAIN_MIRROR_ID: MirrorId = "chasing"/)
  assert.match(source, /onComplete\(MAIN_MIRROR_ID\)/)
})

test("assessment entry into water gateway is not skipped by old questionnaire cache", () => {
  assert.match(assessmentPage, /setAnswers\(\[\]\)/)
  assert.match(assessmentPage, /setCurrentIndex\(0\)/)
  assert.doesNotMatch(assessmentPage, /restoredAnswers\.length > 0/)
  assert.doesNotMatch(assessmentPage, /restoredIndex/)
  assert.match(assessmentPage, /router\.push\("\/assessment-result"\)/)
  assert.doesNotMatch(assessmentPage, /router\.push\(`\/cycle-mirror\?mirror=/)
  assert.doesNotMatch(assessmentPage, /router\.push\("\/mirror-archive"\)/)
})
