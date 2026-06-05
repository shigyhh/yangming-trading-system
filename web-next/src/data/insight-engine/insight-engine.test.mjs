import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const engineDir = new URL("./", import.meta.url)
const scenesDir = new URL("./scenes/", engineDir)
const manifest = JSON.parse(readFileSync(new URL("./scenes/manifest.json", engineDir), "utf8"))
const scene01 = JSON.parse(readFileSync(new URL("./scenes/scene-01-chase-surge.json", engineDir), "utf8"))
const scene02 = JSON.parse(readFileSync(new URL("./scenes/scene-02-missed.json", engineDir), "utf8"))
const scene03 = JSON.parse(readFileSync(new URL("./scenes/scene-03-small-position.json", engineDir), "utf8"))
const scene04 = JSON.parse(readFileSync(new URL("./scenes/scene-04-sold-too-early.json", engineDir), "utf8"))
const scene05 = JSON.parse(readFileSync(new URL("./scenes/scene-05-sold-too-late.json", engineDir), "utf8"))
const scene06 = JSON.parse(readFileSync(new URL("./scenes/scene-06-floating-gain-fear.json", engineDir), "utf8"))
const scene07 = JSON.parse(readFileSync(new URL("./scenes/scene-07-unwilling-stop-loss.json", engineDir), "utf8"))
const scene08 = JSON.parse(readFileSync(new URL("./scenes/scene-08-hold-loss.json", engineDir), "utf8"))
const scene09 = JSON.parse(readFileSync(new URL("./scenes/scene-09-average-down.json", engineDir), "utf8"))
const scene10 = JSON.parse(readFileSync(new URL("./scenes/scene-10-more-average-down.json", engineDir), "utf8"))
const scene11 = JSON.parse(readFileSync(new URL("./scenes/scene-11-revenge-trade.json", engineDir), "utf8"))
const scene12 = JSON.parse(readFileSync(new URL("./scenes/scene-12-overconfidence.json", engineDir), "utf8"))
const scene13 = JSON.parse(readFileSync(new URL("./scenes/scene-13-heavy-position.json", engineDir), "utf8"))
const scene14 = JSON.parse(readFileSync(new URL("./scenes/scene-14-all-in.json", engineDir), "utf8"))
const scene15 = JSON.parse(readFileSync(new URL("./scenes/scene-15-empty-position.json", engineDir), "utf8"))
const scene16 = JSON.parse(readFileSync(new URL("./scenes/scene-16-change-plan.json", engineDir), "utf8"))
const scene17 = JSON.parse(readFileSync(new URL("./scenes/scene-17-stop-loss-regret.json", engineDir), "utf8"))
const scene18 = JSON.parse(readFileSync(new URL("./scenes/scene-18-profit-regret.json", engineDir), "utf8"))
const scene19 = JSON.parse(readFileSync(new URL("./scenes/scene-19-open-impulse.json", engineDir), "utf8"))
const scene20 = JSON.parse(readFileSync(new URL("./scenes/scene-20-close-impulse.json", engineDir), "utf8"))
const scene21 = JSON.parse(readFileSync(new URL("./scenes/scene-21-after-close-regret.json", engineDir), "utf8"))
const scene22 = JSON.parse(readFileSync(new URL("./scenes/scene-22-avoid-review.json", engineDir), "utf8"))
const scene23 = JSON.parse(readFileSync(new URL("./scenes/scene-23-news-trigger.json", engineDir), "utf8"))
const scene24 = JSON.parse(readFileSync(new URL("./scenes/scene-24-follow-call.json", engineDir), "utf8"))
const scene25 = JSON.parse(readFileSync(new URL("./scenes/scene-25-hot-theme.json", engineDir), "utf8"))
const scene26 = JSON.parse(readFileSync(new URL("./scenes/scene-26-bottom-fishing.json", engineDir), "utf8"))
const scene27 = JSON.parse(readFileSync(new URL("./scenes/scene-27-high-buy.json", engineDir), "utf8"))
const scene28 = JSON.parse(readFileSync(new URL("./scenes/scene-28-breakeven-obsession.json", engineDir), "utf8"))
const scene29 = JSON.parse(readFileSync(new URL("./scenes/scene-29-unlock-obsession.json", engineDir), "utf8"))
const scene30 = JSON.parse(readFileSync(new URL("./scenes/scene-30-see-right-no-buy.json", engineDir), "utf8"))
const scene31 = JSON.parse(readFileSync(new URL("./scenes/scene-31-instant-regret.json", engineDir), "utf8"))
const scene32 = JSON.parse(readFileSync(new URL("./scenes/scene-32-account-checking.json", engineDir), "utf8"))
const scene33 = JSON.parse(readFileSync(new URL("./scenes/scene-33-stock-hopping.json", engineDir), "utf8"))
const scene34 = JSON.parse(readFileSync(new URL("./scenes/scene-34-news-trading.json", engineDir), "utf8"))
const scene35 = JSON.parse(readFileSync(new URL("./scenes/scene-35-fear-holding.json", engineDir), "utf8"))
const scene36 = JSON.parse(readFileSync(new URL("./scenes/scene-36-fear-of-being-wrong.json", engineDir), "utf8"))
const schemaSource = readFileSync(new URL("./schema.ts", engineDir), "utf8")
const ritualFlowSource = readFileSync(new URL("../../features/assessment/ZhaoxinRitualFlow.tsx", engineDir), "utf8")
const manifestScenePairs = manifest.scenes.map((entry) => ({
  entry,
  scene: JSON.parse(readFileSync(new URL(`./scenes/${entry.file}`, engineDir), "utf8")),
}))

const requiredItemFields = ["id", "tradeMoment", "os", "hiddenThought", "reflection", "intensity"]
const requiredSceneFields = [
  "sceneId",
  "sceneName",
  "mirrorId",
  "thief",
  "items",
  "thiefExplain",
  "evidences",
  "practices",
  "coreStatement",
]
const requiredLiveRecordFields = [
  "action",
  "scene",
  "thought",
  "hiddenThought",
  "mirror",
  "thief",
  "evidence",
  "practice",
]

function assertInsightItem(item) {
  assert.deepEqual(Object.keys(item), requiredItemFields)
  assert.equal(typeof item.id, "string")
  assert.equal(typeof item.tradeMoment, "string")
  assert.equal(typeof item.os, "string")
  assert.equal(typeof item.hiddenThought, "string")
  assert.equal(typeof item.reflection, "string")
  assert.ok(Number.isInteger(item.intensity))
  assert.ok(item.intensity >= 1 && item.intensity <= 5)
}

test("insight engine exposes the complete 36-scene V3.1 structure", () => {
  const sceneFiles = readdirSync(scenesDir).filter((file) => /^scene-\d{2}-.+\.json$/.test(file))

  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.targetSceneCount, 36)
  assert.equal(manifest.filenamePattern, "scene-XX-slug.json")
  assert.deepEqual(manifest.recordFlow, [
    "tradeMoment",
    "os",
    "reflection",
    "thief",
    "evidence",
    "practice",
    "coreStatement",
  ])
  assert.deepEqual(manifest.contentRecordFields, requiredItemFields)
  assert.deepEqual(manifest.sceneRecordFields, requiredSceneFields)
  assert.deepEqual(manifest.liveRecordFields, requiredLiveRecordFields)
  assert.equal(sceneFiles.length, manifest.targetSceneCount)
})

test("manifest entries stay aligned with their V3.1 scene files", () => {
  for (const { entry, scene } of manifestScenePairs) {
    assert.equal(entry.sceneId, scene.sceneId)
    assert.equal(entry.sceneName, scene.sceneName)
    assert.equal(entry.sceneOrder, scene.sceneOrder)
    assert.equal(entry.status, scene.status)
  }
})

test("scene files use the V3.1 tradeMoment-to-practice schema", () => {
  for (const { scene } of manifestScenePairs) {
    assert.equal(scene.schemaVersion, 1)
    assert.equal(scene.status, "active")
    assert.equal(typeof scene.sceneId, "string")
    assert.equal(typeof scene.sceneName, "string")
    assert.equal(typeof scene.mirrorId, "string")
    assert.equal(typeof scene.thief, "string")
    assert.ok(Array.isArray(scene.items))
    assert.equal(scene.items.length, 10)
    assert.ok(Array.isArray(scene.thiefExplain))
    assert.ok(Array.isArray(scene.evidences))
    assert.ok(Array.isArray(scene.practices))
    assert.equal(typeof scene.coreStatement, "string")
    assert.doesNotMatch(JSON.stringify(scene), /"records"/)
    assert.doesNotMatch(JSON.stringify(scene), /"thought"/)

    for (const item of scene.items) {
      assertInsightItem(item)
    }
  }
})

test("official scene 01 content keeps the authored V3.1 wording", () => {
  assert.equal(scene01.sceneId, "scene_01")
  assert.equal(scene01.sceneName, "急涨追高")
  assert.equal(scene01.mirrorId, "chase")
  assert.equal(scene01.thief, "贪 · 急")
  assert.equal(scene01.items[0].tradeMoment, "看着价格突然拉升时")
  assert.equal(scene01.items[0].os, "卧槽，真拉了。")
  assert.equal(scene01.items[0].hiddenThought, "我又慢了。")
  assert.equal(scene01.items[0].reflection, "这一声卧槽，不是惊讶，是后悔。")
  assert.equal(scene01.items[9].tradeMoment, "看着它越涨越远时")
  assert.equal(scene01.items[9].os, "我又慢了。")
  assert.equal(scene01.items[9].hiddenThought, "我总是落后。")
  assert.equal(scene01.items[9].reflection, "你怕的不是慢，你怕的是自己总是慢。")
  assert.deepEqual(scene01.thiefExplain, [
    "贪，是想抓住这一波，不想再看别人赚钱。",
    "急，是还没等规则确认，心已经先冲出去了。",
  ])
  assert.match(scene01.evidences[0], /我看见自己不是在追行情/)
  assert.match(scene01.practices[4], /允许机会过去/)
  assert.equal(scene01.coreStatement, "你追的不是上涨。你追的是，那个不想再错过的自己。")
})

test("official scene 02 content keeps the authored V3.1 wording", () => {
  assert.equal(scene02.sceneId, "scene_02")
  assert.equal(scene02.sceneName, "踏空焦虑")
  assert.equal(scene02.mirrorId, "hesitate")
  assert.equal(scene02.thief, "疑 · 怯 · 急")
  assert.equal(scene02.items[0].tradeMoment, "看着它连续上涨时")
  assert.equal(scene02.items[0].os, "卧槽，又涨了。")
  assert.equal(scene02.items[0].hiddenThought, "我又错过了。")
  assert.equal(scene02.items[0].reflection, "这一声卧槽，不是惊讶，是后悔。")
  assert.equal(scene02.items[9].tradeMoment, "看着趋势越来越强时")
  assert.equal(scene02.items[9].os, "不会还要继续涨吧？")
  assert.equal(scene02.items[9].hiddenThought, "机会不会等我。")
  assert.equal(scene02.items[9].reflection, "你怕的不是它继续涨，你怕的是自己再次被甩在后面。")
  assert.deepEqual(scene02.thiefExplain, [
    "疑：明明已经看见，却总觉得再等等、再确认一下。",
    "怯：不是不想做，是不敢承担做错的结果。",
    "急：错过以后，心又急着追回来。",
  ])
  assert.match(scene02.evidences[0], /我看见自己不是没机会/)
  assert.match(scene02.practices[4], /敢迈出第一步/)
  assert.equal(scene02.coreStatement, "最折磨人的，\n\n从来不是看错。\n\n而是看对了，\n\n却什么都没做。")
})

test("official scene 03 content keeps the authored V3.1 wording", () => {
  assert.equal(scene03.sceneId, "scene_03")
  assert.equal(scene03.sceneName, "买少后悔")
  assert.equal(scene03.mirrorId, "regret")
  assert.equal(scene03.thief, "贪 · 悔")
  assert.equal(scene03.items[0].tradeMoment, "看着账户开始盈利时")
  assert.equal(scene03.items[0].os, "买少了。")
  assert.equal(scene03.items[0].hiddenThought, "我又怂了。")
  assert.equal(scene03.items[0].reflection, "你难受的不是赚少了，是你觉得自己本来可以赚更多。")
  assert.equal(scene03.items[9].tradeMoment, "收盘以后")
  assert.equal(scene03.items[9].os, "白看对了。")
  assert.equal(scene03.items[9].hiddenThought, "我配不上机会。")
  assert.equal(scene03.items[9].reflection, "你真正难受的，不是仓位轻，是觉得自己没有抓住属于自己的机会。")
  assert.deepEqual(scene03.thiefExplain, [
    "贪，是赚到了还想赚更多。",
    "悔，是事情已经过去，却一直停在如果当时。",
  ])
  assert.match(scene03.evidences[0], /我看见自己不是因为赚少了难受/)
  assert.match(scene03.practices[4], /赚到属于自己的/)
  assert.equal(scene03.coreStatement, "你难受的不是赚少了。\n\n你难受的是，\n\n没有赚到全部。")
})

test("official scene 04 content keeps the authored V3.1 wording", () => {
  assert.equal(scene04.sceneId, "scene_04")
  assert.equal(scene04.sceneName, "卖飞懊恼")
  assert.equal(scene04.mirrorId, "regret")
  assert.equal(scene04.thief, "贪 · 悔")
  assert.equal(scene04.items[0].tradeMoment, "刚卖完看到继续上涨时")
  assert.equal(scene04.items[0].os, "卧槽，还涨。")
  assert.equal(scene04.items[0].hiddenThought, "我又卖早了。")
  assert.equal(scene04.items[0].reflection, "这一声卧槽，不是惊讶，是后悔。")
  assert.equal(scene04.items[9].tradeMoment, "关软件之前")
  assert.equal(scene04.items[9].os, "真难受。")
  assert.equal(scene04.items[9].hiddenThought, "我为什么总拿不住。")
  assert.equal(scene04.items[9].reflection, "真正让你难受的，不是卖飞，是不够完美。")
  assert.deepEqual(scene04.thiefExplain, [
    "贪，是赚到了还想赚更多。",
    "悔，是事情已经过去，却一直停在如果当时。",
  ])
  assert.match(scene04.evidences[0], /我看见自己不是因为卖出难受/)
  assert.match(scene04.practices[4], /赚自己该赚的/)
  assert.equal(scene04.coreStatement, "你后悔的不是卖出。\n\n你后悔的是，\n\n没有卖在最好的位置。")
})

test("official scene 05 content keeps the authored V3.1 wording", () => {
  assert.equal(scene05.sceneId, "scene_05")
  assert.equal(scene05.sceneName, "卖晚懊恼")
  assert.equal(scene05.mirrorId, "regret")
  assert.equal(scene05.thief, "贪 · 悔")
  assert.equal(scene05.items[0].tradeMoment, "看着利润开始回吐时")
  assert.equal(scene05.items[0].os, "刚才就该卖。")
  assert.equal(scene05.items[0].hiddenThought, "我又贪了。")
  assert.equal(scene05.items[0].reflection, "你后悔的不是没卖，你后悔的是自己又想多赚一点。")
  assert.equal(scene05.items[9].tradeMoment, "关软件之前")
  assert.equal(scene05.items[9].os, "下次一定卖。")
  assert.equal(scene05.items[9].hiddenThought, "可我下次还会犹豫。")
  assert.equal(scene05.items[9].reflection, "真正困住你的，不是行情，是执念。")
  assert.deepEqual(scene05.thiefExplain, [
    "贪，是赚到了还想赚更多。",
    "悔，是事情已经过去，却一直停在如果刚才。",
  ])
  assert.match(scene05.evidences[0], /我看见自己不是因为回吐难受/)
  assert.match(scene05.practices[4], /市场不会把最高点提前告诉我/)
  assert.equal(scene05.coreStatement, "你后悔的不是没卖。\n\n你后悔的是，\n\n没有卖在最好的位置。")
})

test("official scene 06 content keeps the authored V3.1 wording", () => {
  assert.equal(scene06.sceneId, "scene_06")
  assert.equal(scene06.sceneName, "浮盈回吐恐惧")
  assert.equal(scene06.mirrorId, "anxiety")
  assert.equal(scene06.thief, "惧 · 急")
  assert.equal(scene06.items[0].tradeMoment, "利润开始回吐时")
  assert.equal(scene06.items[0].os, "先卖吧。")
  assert.equal(scene06.items[0].hiddenThought, "我不想失去。")
  assert.equal(scene06.items[0].reflection, "你卖掉的不是仓位，你卖掉的是不安。")
  assert.equal(scene06.items[9].tradeMoment, "卖出以后")
  assert.equal(scene06.items[9].os, "总算卖了。")
  assert.equal(scene06.items[9].hiddenThought, "终于安心了。")
  assert.equal(scene06.items[9].reflection, "你得到的不是利润，你得到的是松一口气。")
  assert.deepEqual(scene06.thiefExplain, [
    "惧，是害怕刚得到的利润消失。",
    "急，是规则还没到，心已经先跑了。",
  ])
  assert.match(scene06.evidences[0], /我看见自己不是在保护利润/)
  assert.match(scene06.practices[4], /利润会波动/)
  assert.equal(scene06.coreStatement, "你卖掉的不是仓位。\n\n你卖掉的是，\n\n承受波动的能力。")
})

test("official scene 07 content keeps the authored V3.1 wording", () => {
  assert.equal(scene07.sceneId, "scene_07")
  assert.equal(scene07.sceneName, "不愿止损")
  assert.equal(scene07.mirrorId, "hold")
  assert.equal(scene07.thief, "痴 · 执")
  assert.equal(scene07.items[0].tradeMoment, "跌到止损位时")
  assert.equal(scene07.items[0].os, "再等等。")
  assert.equal(scene07.items[0].hiddenThought, "还没到最坏的时候。")
  assert.equal(scene07.items[0].reflection, "你等的不是反弹，你等的是不用认错。")
  assert.equal(scene07.items[9].tradeMoment, "关软件之前")
  assert.equal(scene07.items[9].os, "不急。")
  assert.equal(scene07.items[9].hiddenThought, "明天再说。")
  assert.equal(scene07.items[9].reflection, "你把今天的问题交给了明天。")
  assert.deepEqual(scene07.thiefExplain, [
    "痴，是把希望当判断。",
    "执，是已经知道错了，却还不肯放手。",
  ])
  assert.match(scene07.evidences[0], /我看见自己不是在等反弹/)
  assert.match(scene07.practices[4], /错了就认/)
  assert.equal(scene07.coreStatement, "你等的不是反弹。\n\n你等的是，\n\n不用承认自己错了。")
})

test("official scene 08 content keeps the authored V3.1 wording", () => {
  assert.equal(scene08.sceneId, "scene_08")
  assert.equal(scene08.sceneName, "扛单死撑")
  assert.equal(scene08.mirrorId, "hold")
  assert.equal(scene08.thief, "痴 · 执")
  assert.equal(scene08.items[0].tradeMoment, "已经亏损很多以后")
  assert.equal(scene08.items[0].os, "现在卖给谁？")
  assert.equal(scene08.items[0].hiddenThought, "我不能认输。")
  assert.equal(scene08.items[0].reflection, "你舍不得卖的不是股票，你舍不得的是认错。")
  assert.equal(scene08.items[9].tradeMoment, "关软件之前")
  assert.equal(scene08.items[9].os, "先放着。")
  assert.equal(scene08.items[9].hiddenThought, "以后再说。")
  assert.equal(scene08.items[9].reflection, "真正困住你的，不是股票，是执念。")
  assert.deepEqual(scene08.thiefExplain, [
    "痴，是把希望当判断。",
    "执，是已经知道有问题，却不肯放手。",
  ])
  assert.match(scene08.evidences[0], /我看见自己不是在持有/)
  assert.match(scene08.practices[4], /接受现实/)
  assert.equal(scene08.coreStatement, "你扛的不是仓位。\n\n你扛的是，\n\n不甘心。")
})

test("official scene 09 content keeps the authored V3.1 wording", () => {
  assert.equal(scene09.sceneId, "scene_09")
  assert.equal(scene09.sceneName, "补仓摊平")
  assert.equal(scene09.mirrorId, "average_down")
  assert.equal(scene09.thief, "痴 · 执")
  assert.equal(scene09.items[0].tradeMoment, "看到账户继续亏损时")
  assert.equal(scene09.items[0].os, "再补一点。")
  assert.equal(scene09.items[0].hiddenThought, "成本就下来了。")
  assert.equal(scene09.items[0].reflection, "你补的不是仓位，你补的是希望。")
  assert.equal(scene09.items[9].tradeMoment, "关软件之前")
  assert.equal(scene09.items[9].os, "总会回来的。")
  assert.equal(scene09.items[9].hiddenThought, "我还没输。")
  assert.equal(scene09.items[9].reflection, "你把希望当成了判断。")
  assert.deepEqual(scene09.thiefExplain, [
    "痴，是把希望当事实。",
    "执，是已经错了，却还想证明自己没错。",
  ])
  assert.match(scene09.evidences[0], /我看见自己不是在补仓/)
  assert.match(scene09.practices[4], /市场不认识我的成本/)
  assert.equal(scene09.coreStatement, "你补的不是仓位。\n\n你补的是，\n\n希望。")
})

test("official scene 10 content keeps the authored V3.1 wording", () => {
  assert.equal(scene10.sceneId, "scene_10")
  assert.equal(scene10.sceneName, "越跌越补")
  assert.equal(scene10.mirrorId, "average_down")
  assert.equal(scene10.thief, "痴 · 执 · 贪")
  assert.equal(scene10.items[0].tradeMoment, "再次下跌以后")
  assert.equal(scene10.items[0].os, "再补一点。")
  assert.equal(scene10.items[0].hiddenThought, "这样成本就下来了。")
  assert.equal(scene10.items[0].reflection, "你补的不是仓位，你补的是希望。")
  assert.equal(scene10.items[9].tradeMoment, "关软件之前")
  assert.equal(scene10.items[9].os, "总会回来的。")
  assert.equal(scene10.items[9].hiddenThought, "我还没输。")
  assert.equal(scene10.items[9].reflection, "你已经把希望当成了判断。")
  assert.deepEqual(scene10.thiefExplain, [
    "痴，是把希望当事实。",
    "执，是已经错了，却还想证明自己没错。",
    "贪，是想用更大的仓位把亏损一次补回来。",
  ])
  assert.match(scene10.evidences[0], /我看见自己不是在补仓/)
  assert.match(scene10.practices[4], /市场不认识我的成本/)
  assert.equal(scene10.coreStatement, "你补的不是仓位。\n\n你补的是，\n\n不肯认错的希望。")
})

test("official scene 11 content keeps the authored V3.1 wording", () => {
  assert.equal(scene11.sceneId, "scene_11")
  assert.equal(scene11.sceneName, "连续亏损后翻本")
  assert.equal(scene11.mirrorId, "revenge_trade")
  assert.equal(scene11.thief, "急 · 贪 · 痴")
  assert.equal(scene11.items[0].tradeMoment, "连续亏了几笔以后")
  assert.equal(scene11.items[0].os, "再来一笔。")
  assert.equal(scene11.items[0].hiddenThought, "我不甘心。")
  assert.equal(scene11.items[0].reflection, "你不是在找机会，你是在找安慰。")
  assert.equal(scene11.items[9].tradeMoment, "收盘前")
  assert.equal(scene11.items[9].os, "我还没输。")
  assert.equal(scene11.items[9].hiddenThought, "我不能认输。")
  assert.equal(scene11.items[9].reflection, "真正让你停不下来的，不是机会，是不甘心。")
  assert.deepEqual(scene11.thiefExplain, [
    "急，是不愿慢慢修复，只想立刻翻回来。",
    "贪，是想一次把失去的全部拿回来。",
    "痴，是已经脱离系统，开始相信运气。",
  ])
  assert.match(scene11.evidences[0], /我看见自己不是在交易/)
  assert.match(scene11.practices[4], /失去自己才可怕/)
  assert.equal(scene11.coreStatement, "你不是在找机会。\n\n你是在找安慰。")
})

test("official scene 12 content keeps the authored V3.1 wording", () => {
  assert.equal(scene12.sceneId, "scene_12")
  assert.equal(scene12.sceneName, "连续盈利后膨胀")
  assert.equal(scene12.mirrorId, "overconfidence")
  assert.equal(scene12.thief, "傲 · 贪")
  assert.equal(scene12.items[0].tradeMoment, "连续赚了几笔以后")
  assert.equal(scene12.items[0].os, "今天状态真好。")
  assert.equal(scene12.items[0].hiddenThought, "我找到感觉了。")
  assert.equal(scene12.items[0].reflection, "你开始相信的不是系统，是自己。")
  assert.equal(scene12.items[9].tradeMoment, "收盘以后")
  assert.equal(scene12.items[9].os, "今天真准。")
  assert.equal(scene12.items[9].hiddenThought, "我已经掌握节奏了。")
  assert.equal(scene12.items[9].reflection, "赚钱以后，人最容易忘记敬畏。")
  assert.deepEqual(scene12.thiefExplain, [
    "傲，是开始高估自己。",
    "贪，是开始高估机会。",
  ])
  assert.match(scene12.evidences[0], /我看见自己不是在执行系统/)
  assert.match(scene12.practices[4], /敬畏市场/)
  assert.equal(scene12.coreStatement, "真正危险的，\n\n不是亏损以后怀疑自己。\n\n而是盈利以后，\n\n开始相信自己不会错。")
})

test("official scene 13 content keeps the authored V3.1 wording", () => {
  assert.equal(scene13.sceneId, "scene_13")
  assert.equal(scene13.sceneName, "重仓冲动")
  assert.equal(scene13.mirrorId, "heavy_position")
  assert.equal(scene13.thief, "贪 · 急")
  assert.equal(scene13.items[0].tradeMoment, "看到机会时")
  assert.equal(scene13.items[0].os, "这次得上重仓。")
  assert.equal(scene13.items[0].hiddenThought, "机会难得。")
  assert.equal(scene13.items[0].reflection, "你开始觉得，这一次和以前不一样。")
  assert.equal(scene13.items[9].tradeMoment, "关掉软件之前")
  assert.equal(scene13.items[9].os, "这一把要干票大的。")
  assert.equal(scene13.items[9].hiddenThought, "我要赚回来。")
  assert.equal(scene13.items[9].reflection, "你想放大的，不只是利润，还有欲望。")
  assert.deepEqual(scene13.thiefExplain, [
    "贪，是总觉得这一次机会特别大。",
    "急，是还没验证风险，仓位已经放大。",
  ])
  assert.match(scene13.evidences[0], /我看见自己不是在把握机会/)
  assert.match(scene13.practices[4], /仓位是保护系统/)
  assert.equal(scene13.coreStatement, "你放大的不是仓位。\n\n你放大的是，\n\n自己的欲望。")
})

test("official scene 14 content keeps the authored V3.1 wording", () => {
  assert.equal(scene14.sceneId, "scene_14")
  assert.equal(scene14.sceneName, "梭哈冲动")
  assert.equal(scene14.mirrorId, "all_in")
  assert.equal(scene14.thief, "贪 · 赌 · 急")
  assert.equal(scene14.items[0].tradeMoment, "看见自认为确定机会时")
  assert.equal(scene14.items[0].os, "干一把。")
  assert.equal(scene14.items[0].hiddenThought, "这次不一样。")
  assert.equal(scene14.items[0].reflection, "所有梭哈的人，都觉得这次不一样。")
  assert.equal(scene14.items[9].tradeMoment, "收盘之前")
  assert.equal(scene14.items[9].os, "这一把翻身。")
  assert.equal(scene14.items[9].hiddenThought, "我要改变命运。")
  assert.equal(scene14.items[9].reflection, "你已经不在交易，你开始赌人生。")
  assert.deepEqual(scene14.thiefExplain, [
    "贪，是总觉得赚得还不够。",
    "赌，是开始相信一把改变结果。",
    "急，是想一次解决所有问题。",
  ])
  assert.match(scene14.evidences[0], /我看见自己不是在把握机会/)
  assert.match(scene14.practices[4], /活下来/)
  assert.equal(scene14.coreStatement, "你梭哈的不是仓位。\n\n你梭哈的是，\n\n自己的欲望。")
})

test("official scene 15 content keeps the authored V3.1 wording", () => {
  assert.equal(scene15.sceneId, "scene_15")
  assert.equal(scene15.sceneName, "空仓焦虑")
  assert.equal(scene15.mirrorId, "empty_position")
  assert.equal(scene15.thief, "急 · 贪")
  assert.equal(scene15.items[0].tradeMoment, "看着行情上涨时")
  assert.equal(scene15.items[0].os, "又涨了。")
  assert.equal(scene15.items[0].hiddenThought, "我又空仓。")
  assert.equal(scene15.items[0].reflection, "最难受的不是上涨，是你没参与。")
  assert.equal(scene15.items[9].tradeMoment, "关软件之前")
  assert.equal(scene15.items[9].os, "明天一定上。")
  assert.equal(scene15.items[9].hiddenThought, "我不能再错过。")
  assert.equal(scene15.items[9].reflection, "你害怕的不是空仓，你害怕的是再次错过。")
  assert.deepEqual(scene15.thiefExplain, [
    "急，是看见机会就想参与。",
    "贪，是总觉得外面还有自己没赚到的钱。",
  ])
  assert.match(scene15.evidences[0], /我看见自己不是在寻找机会/)
  assert.match(scene15.practices[4], /没有机会/)
  assert.equal(scene15.coreStatement, "你焦虑的不是空仓。\n\n你焦虑的是，\n\n别人在赚钱，\n\n而你没有参与。")
})

test("official scene 16 content keeps the authored V3.1 wording", () => {
  assert.equal(scene16.sceneId, "scene_16")
  assert.equal(scene16.sceneName, "临盘改计划")
  assert.equal(scene16.mirrorId, "change_plan")
  assert.equal(scene16.thief, "急 · 疑")
  assert.equal(scene16.items[0].tradeMoment, "开盘后走势和预期不同时")
  assert.equal(scene16.items[0].os, "先看看再说。")
  assert.equal(scene16.items[0].hiddenThought, "计划可能不对。")
  assert.equal(scene16.items[0].reflection, "你开始怀疑的，不是行情，是自己的计划。")
  assert.equal(scene16.items[9].tradeMoment, "收盘复盘时")
  assert.equal(scene16.items[9].os, "下次不改了。")
  assert.equal(scene16.items[9].hiddenThought, "希望记住。")
  assert.equal(scene16.items[9].reflection, "真正的问题不是计划不好，而是你总想临时改变计划。")
  assert.deepEqual(scene16.thiefExplain, [
    "急，是总觉得眼前机会比计划重要。",
    "疑，是总觉得原计划不够好。",
  ])
  assert.match(scene16.evidences[0], /我看见自己不是在适应市场/)
  assert.match(scene16.practices[4], /计划是用来执行的/)
  assert.equal(scene16.coreStatement, "真正毁掉计划的，\n\n不是行情变化。\n\n而是你总觉得，\n\n这次可以例外。")
})

test("official scene 17 content keeps the authored V3.1 wording", () => {
  assert.equal(scene17.sceneId, "scene_17")
  assert.equal(scene17.sceneName, "止损后又涨")
  assert.equal(scene17.mirrorId, "stop_loss_regret")
  assert.equal(scene17.thief, "悔 · 疑")
  assert.equal(scene17.items[0].tradeMoment, "刚止损以后")
  assert.equal(scene17.items[0].os, "卖完就涨。")
  assert.equal(scene17.items[0].hiddenThought, "我是不是卖错了。")
  assert.equal(scene17.items[0].reflection, "最难受的不是止损，是止损以后它涨了。")
  assert.equal(scene17.items[9].tradeMoment, "收盘以后")
  assert.equal(scene17.items[9].os, "下次不止损了。")
  assert.equal(scene17.items[9].hiddenThought, "止损根本没用。")
  assert.equal(scene17.items[9].reflection, "你开始怀疑的，不是这笔交易，是规则本身。")
  assert.deepEqual(scene17.thiefExplain, [
    "悔，是不断停留在如果刚才。",
    "疑，是开始怀疑规则、怀疑自己。",
  ])
  assert.match(scene17.evidences[0], /我看见自己不是因为止损难受/)
  assert.match(scene17.practices[4], /规则的价值/)
  assert.equal(scene17.coreStatement, "最难受的不是止损。\n\n是止损以后，\n\n它涨了。")
})

test("official scene 18 content keeps the authored V3.1 wording", () => {
  assert.equal(scene18.sceneId, "scene_18")
  assert.equal(scene18.sceneName, "止盈后继续涨")
  assert.equal(scene18.mirrorId, "profit_regret")
  assert.equal(scene18.thief, "悔 · 贪")
  assert.equal(scene18.items[0].tradeMoment, "刚卖完以后")
  assert.equal(scene18.items[0].os, "卧槽，还涨。")
  assert.equal(scene18.items[0].hiddenThought, "我又卖早了。")
  assert.equal(scene18.items[0].reflection, "最难受的不是卖出，是卖完以后它还在涨。")
  assert.equal(scene18.items[9].tradeMoment, "关软件之前")
  assert.equal(scene18.items[9].os, "下次我一定拿住。")
  assert.equal(scene18.items[9].hiddenThought, "希望下次能做到。")
  assert.equal(scene18.items[9].reflection, "真正困住你的，不是行情，是执念。")
  assert.deepEqual(scene18.thiefExplain, [
    "悔，是不断停留在如果刚才。",
    "贪，是赚到了还想赚更多。",
  ])
  assert.match(scene18.evidences[0], /我看见自己不是因为卖出难受/)
  assert.match(scene18.practices[4], /赚自己该赚的/)
  assert.equal(scene18.coreStatement, "你后悔的不是卖出。\n\n你后悔的是，\n\n卖出以后，\n\n它还在涨。")
})

test("official scene 19 content keeps the authored V3.1 wording", () => {
  assert.equal(scene19.sceneId, "scene_19")
  assert.equal(scene19.sceneName, "开盘冲动")
  assert.equal(scene19.mirrorId, "open_impulse")
  assert.equal(scene19.thief, "急 · 贪")
  assert.equal(scene19.items[0].tradeMoment, "刚开盘看到异动时")
  assert.equal(scene19.items[0].os, "卧槽，动了。")
  assert.equal(scene19.items[0].hiddenThought, "我不能错过。")
  assert.equal(scene19.items[0].reflection, "开盘最危险的不是波动，是冲动。")
  assert.equal(scene19.items[9].tradeMoment, "收盘复盘时")
  assert.equal(scene19.items[9].os, "开盘又冲动了。")
  assert.equal(scene19.items[9].hiddenThought, "我总是管不住手。")
  assert.equal(scene19.items[9].reflection, "真正让你亏钱的，不是开盘，是控制不住自己。")
  assert.deepEqual(scene19.thiefExplain, [
    "急，是害怕慢一步。",
    "贪，是总觉得机会就在眼前。",
  ])
  assert.match(scene19.evidences[0], /我看见自己不是在执行计划/)
  assert.match(scene19.practices[4], /快，不等于对/)
  assert.equal(scene19.coreStatement, "开盘最危险的，\n\n不是波动。\n\n而是你总想，\n\n比规则更快一步。")
})

test("official scene 20 content keeps the authored V3.1 wording", () => {
  assert.equal(scene20.sceneId, "scene_20")
  assert.equal(scene20.sceneName, "尾盘冲动")
  assert.equal(scene20.mirrorId, "close_impulse")
  assert.equal(scene20.thief, "急 · 贪")
  assert.equal(scene20.items[0].tradeMoment, "临近收盘时")
  assert.equal(scene20.items[0].os, "今天总得买点。")
  assert.equal(scene20.items[0].hiddenThought, "不然白看一天。")
  assert.equal(scene20.items[0].reflection, "你开始为了有仓位而交易。")
  assert.equal(scene20.items[9].tradeMoment, "收盘以后")
  assert.equal(scene20.items[9].os, "又是尾盘买的。")
  assert.equal(scene20.items[9].hiddenThought, "我还是没忍住。")
  assert.equal(scene20.items[9].reflection, "真正让你后悔的，不是尾盘，是冲动。")
  assert.deepEqual(scene20.thiefExplain, [
    "急，是害怕等待。",
    "贪，是总觉得还有最后一次机会。",
  ])
  assert.match(scene20.evidences[0], /我看见自己不是在抓机会/)
  assert.match(scene20.practices[4], /空仓过夜/)
  assert.equal(scene20.coreStatement, "你冲进去的，\n\n不是机会。\n\n你冲进去的是，\n\n对等待的不耐烦。")
})

test("official scene 21 content keeps the authored V3.1 wording", () => {
  assert.equal(scene21.sceneId, "scene_21")
  assert.equal(scene21.sceneName, "收盘后后悔")
  assert.equal(scene21.mirrorId, "after_close_regret")
  assert.equal(scene21.thief, "悔 · 执")
  assert.equal(scene21.items[0].tradeMoment, "收盘以后打开账户时")
  assert.equal(scene21.items[0].os, "我今天到底在干嘛。")
  assert.equal(scene21.items[0].hiddenThought, "我又搞砸了。")
  assert.equal(scene21.items[0].reflection, "真正让你难受的，不是行情，是自己。")
  assert.equal(scene21.items[9].tradeMoment, "睡前回想交易时")
  assert.equal(scene21.items[9].os, "真不该。")
  assert.equal(scene21.items[9].hiddenThought, "我放不下。")
  assert.equal(scene21.items[9].reflection, "真正让你睡不着的，不是交易，是执念。")
  assert.deepEqual(scene21.thiefExplain, [
    "悔，是不断停留在如果当时。",
    "执，是事情已经结束，却始终不肯放下。",
  ])
  assert.match(scene21.evidences[0], /我看见自己不是在复盘/)
  assert.match(scene21.practices[4], /复盘是为了成长/)
  assert.equal(scene21.coreStatement, "收盘后最折磨人的，\n\n不是亏损。\n\n而是脑子里，\n\n永远有另一个更好的结果。")
})

test("official scene 22 content keeps the authored V3.1 wording", () => {
  assert.equal(scene22.sceneId, "scene_22")
  assert.equal(scene22.sceneName, "复盘逃避")
  assert.equal(scene22.mirrorId, "avoid_review")
  assert.equal(scene22.thief, "懒 · 逃")
  assert.equal(scene22.items[0].tradeMoment, "收盘以后")
  assert.equal(scene22.items[0].os, "明天再看吧。")
  assert.equal(scene22.items[0].hiddenThought, "我不想面对。")
  assert.equal(scene22.items[0].reflection, "你拖延的不是复盘，你拖延的是现实。")
  assert.equal(scene22.items[9].tradeMoment, "睡觉之前")
  assert.equal(scene22.items[9].os, "明天开始。")
  assert.equal(scene22.items[9].hiddenThought, "希望明天不一样。")
  assert.equal(scene22.items[9].reflection, "你期待改变，却回避改变的入口。")
  assert.deepEqual(scene22.thiefExplain, [
    "懒，是不愿面对复杂和麻烦。",
    "逃，是不愿面对真实结果。",
  ])
  assert.match(scene22.evidences[0], /我看见自己不是没时间复盘/)
  assert.match(scene22.practices[4], /复盘不是审判/)
  assert.equal(scene22.coreStatement, "你逃避的不是复盘。\n\n你逃避的是，\n\n看见真实的自己。")
})

test("official scene 23 content keeps the authored V3.1 wording", () => {
  assert.equal(scene23.sceneId, "scene_23")
  assert.equal(scene23.sceneName, "消息刺激")
  assert.equal(scene23.mirrorId, "news_trigger")
  assert.equal(scene23.thief, "从 · 急")
  assert.equal(scene23.items[0].tradeMoment, "刚看到突发消息时")
  assert.equal(scene23.items[0].os, "卧槽，真的假的。")
  assert.equal(scene23.items[0].hiddenThought, "机会来了。")
  assert.equal(scene23.items[0].reflection, "你还没验证消息，情绪已经开始交易。")
  assert.equal(scene23.items[9].tradeMoment, "收盘以后")
  assert.equal(scene23.items[9].os, "希望消息别落空。")
  assert.equal(scene23.items[9].hiddenThought, "我已经上车了。")
  assert.equal(scene23.items[9].reflection, "当你持仓以后，你开始希望消息是真的。")
  assert.deepEqual(scene23.thiefExplain, [
    "从，是把别人的判断当自己的判断。",
    "急，是还没验证事实，就急着行动。",
  ])
  assert.match(scene23.evidences[0], /我看见自己不是在研究消息/)
  assert.match(scene23.practices[4], /消息不是信号/)
  assert.equal(scene23.coreStatement, "你追的不是消息。\n\n你追的是，\n\n害怕慢别人一步。")
})

test("official scene 24 content keeps the authored V3.1 wording", () => {
  assert.equal(scene24.sceneId, "scene_24")
  assert.equal(scene24.sceneName, "别人喊单依赖")
  assert.equal(scene24.mirrorId, "follow_call")
  assert.equal(scene24.thief, "从 · 疑")
  assert.equal(scene24.items[0].tradeMoment, "群里有人喊单时")
  assert.equal(scene24.items[0].os, "跟不跟。")
  assert.equal(scene24.items[0].hiddenThought, "他应该比我懂。")
  assert.equal(scene24.items[0].reflection, "你开始把判断交给别人。")
  assert.equal(scene24.items[9].tradeMoment, "关软件之前")
  assert.equal(scene24.items[9].os, "下次还是得靠自己。")
  assert.equal(scene24.items[9].hiddenThought, "可我还是不敢。")
  assert.equal(scene24.items[9].reflection, "你知道问题在哪，却还没有准备承担判断的代价。")
  assert.deepEqual(scene24.thiefExplain, [
    "从，是习惯跟随别人。",
    "疑，是不相信自己的判断。",
  ])
  assert.match(scene24.evidences[0], /我看见自己不是在交易/)
  assert.match(scene24.practices[4], /判断可以错/)
  assert.equal(scene24.coreStatement, "你依赖的不是老师。\n\n你依赖的是，\n\n别人替你承担判断。")
})

test("official scene 25 content keeps the authored V3.1 wording", () => {
  assert.equal(scene25.sceneId, "scene_25")
  assert.equal(scene25.sceneName, "热点追逐")
  assert.equal(scene25.mirrorId, "hot_theme")
  assert.equal(scene25.thief, "贪 · 从 · 急")
  assert.equal(scene25.items[0].tradeMoment, "看到热点板块大涨时")
  assert.equal(scene25.items[0].os, "这波不能错过。")
  assert.equal(scene25.items[0].hiddenThought, "终于轮到我了。")
  assert.equal(scene25.items[0].reflection, "真正吸引你的，不是逻辑，是热闹。")
  assert.equal(scene25.items[9].tradeMoment, "收盘以后")
  assert.equal(scene25.items[9].os, "明天继续冲。")
  assert.equal(scene25.items[9].hiddenThought, "我已经上车了。")
  assert.equal(scene25.items[9].reflection, "当你持仓以后，你开始希望热点永远存在。")
  assert.deepEqual(scene25.thiefExplain, [
    "贪，是总觉得热点里还有没赚到的钱。",
    "从，是把群体情绪当成判断依据。",
    "急，是害怕慢一步就错过。",
  ])
  assert.match(scene25.evidences[0], /我看见自己不是在研究热点/)
  assert.match(scene25.practices[4], /热度不是理由/)
  assert.equal(scene25.coreStatement, "你追的不是热点。\n\n你追的是，\n\n不想错过热点的自己。")
})

test("official scene 26 content keeps the authored V3.1 wording", () => {
  assert.equal(scene26.sceneId, "scene_26")
  assert.equal(scene26.sceneName, "抄底冲动")
  assert.equal(scene26.mirrorId, "bottom_fishing")
  assert.equal(scene26.thief, "贪 · 痴 · 急")
  assert.equal(scene26.items[0].tradeMoment, "看着连续大跌时")
  assert.equal(scene26.items[0].os, "跌这么多了。")
  assert.equal(scene26.items[0].hiddenThought, "应该到底了。")
  assert.equal(scene26.items[0].reflection, "你开始把跌得多，当成上涨的理由。")
  assert.equal(scene26.items[9].tradeMoment, "收盘以后")
  assert.equal(scene26.items[9].os, "明天总该反弹了。")
  assert.equal(scene26.items[9].hiddenThought, "今天应该是最低点。")
  assert.equal(scene26.items[9].reflection, "当你开始预测最低点时，市场已经把你带离了规则。")
  assert.deepEqual(scene26.thiefExplain, [
    "贪，是总觉得便宜就有机会。",
    "痴，是把希望当成事实。",
    "急，是急着抢在反弹前进去。",
  ])
  assert.match(scene26.evidences[0], /我看见自己不是在等待机会/)
  assert.match(scene26.practices[4], /跌得多/)
  assert.equal(scene26.coreStatement, "你抄的不是底。\n\n你抄的是，\n\n自己对反弹的幻想。")
})

test("official scene 27 content keeps the authored V3.1 wording", () => {
  assert.equal(scene27.sceneId, "scene_27")
  assert.equal(scene27.sceneName, "高位接盘")
  assert.equal(scene27.mirrorId, "high_buy")
  assert.equal(scene27.thief, "贪 · 急 · 从")
  assert.equal(scene27.items[0].tradeMoment, "看着股价连续大涨时")
  assert.equal(scene27.items[0].os, "还能涨吧。")
  assert.equal(scene27.items[0].hiddenThought, "我不能错过。")
  assert.equal(scene27.items[0].reflection, "真正让你下单的，不是确定性，是害怕错过。")
  assert.equal(scene27.items[9].tradeMoment, "收盘以后")
  assert.equal(scene27.items[9].os, "明天继续冲。")
  assert.equal(scene27.items[9].hiddenThought, "我不是最后一个。")
  assert.equal(scene27.items[9].reflection, "所有人都希望后面还有人接，而没人觉得自己是最后一个。")
  assert.deepEqual(scene27.thiefExplain, [
    "贪，是总觉得后面还有利润。",
    "急，是害怕慢一步就买不到。",
    "从，是因为别人都在买而买。",
  ])
  assert.match(scene27.evidences[0], /我看见自己不是在研究机会/)
  assert.match(scene27.practices[4], /涨得多/)
  assert.equal(scene27.coreStatement, "你接的不是机会。\n\n你接的是，\n\n不想落后的自己。")
})

test("official scene 28 content keeps the authored V3.1 wording", () => {
  assert.equal(scene28.sceneId, "scene_28")
  assert.equal(scene28.sceneName, "回本执念")
  assert.equal(scene28.mirrorId, "breakeven_obsession")
  assert.equal(scene28.thief, "执 · 痴")
  assert.equal(scene28.items[0].tradeMoment, "账户深套以后")
  assert.equal(scene28.items[0].os, "回本我就走。")
  assert.equal(scene28.items[0].hiddenThought, "我不想亏钱离场。")
  assert.equal(scene28.items[0].reflection, "你等的不是机会，你等的是不用承认亏损。")
  assert.equal(scene28.items[9].tradeMoment, "关软件之前")
  assert.equal(scene28.items[9].os, "回本我一定走。")
  assert.equal(scene28.items[9].hiddenThought, "这次说真的。")
  assert.equal(scene28.items[9].reflection, "你已经说过很多次：回本我就走。")
  assert.deepEqual(scene28.thiefExplain, [
    "执，是把回本变成唯一目标。",
    "痴，是把希望当成未来。",
  ])
  assert.match(scene28.evidences[0], /我看见自己不是在等机会/)
  assert.match(scene28.practices[4], /市场不认识我的成本/)
  assert.equal(scene28.coreStatement, "你等的不是回本。\n\n你等的是，\n\n不用承认自己错了。")
})

test("official scene 29 content keeps the authored V3.1 wording", () => {
  assert.equal(scene29.sceneId, "scene_29")
  assert.equal(scene29.sceneName, "解套执念")
  assert.equal(scene29.mirrorId, "unlock_obsession")
  assert.equal(scene29.thief, "执 · 痴")
  assert.equal(scene29.items[0].tradeMoment, "被套很久以后")
  assert.equal(scene29.items[0].os, "解套我就走。")
  assert.equal(scene29.items[0].hiddenThought, "我一天都不想拿了。")
  assert.equal(scene29.items[0].reflection, "你等的不是机会，你等的是解脱。")
  assert.equal(scene29.items[9].tradeMoment, "关软件之前")
  assert.equal(scene29.items[9].os, "解套我一定卖。")
  assert.equal(scene29.items[9].hiddenThought, "这次说真的。")
  assert.equal(scene29.items[9].reflection, "你已经说过很多次：解套我就卖。")
  assert.deepEqual(scene29.thiefExplain, [
    "执，是把解套变成唯一目标。",
    "痴，是把希望当成未来。",
  ])
  assert.match(scene29.evidences[0], /我看见自己不是在等机会/)
  assert.match(scene29.practices[4], /市场不负责让我解套/)
  assert.equal(scene29.coreStatement, "你等的不是解套。\n\n你等的是，\n\n结束这段不甘心。")
})

test("official scene 30 content keeps the authored V3.1 wording", () => {
  assert.equal(scene30.sceneId, "scene_30")
  assert.equal(scene30.sceneName, "看对不敢买")
  assert.equal(scene30.mirrorId, "see_right_no_buy")
  assert.equal(scene30.thief, "疑 · 怯")
  assert.equal(scene30.items[0].tradeMoment, "信号出现以后")
  assert.equal(scene30.items[0].os, "再等等。")
  assert.equal(scene30.items[0].hiddenThought, "我怕买错。")
  assert.equal(scene30.items[0].reflection, "你不是没看见机会，你是不敢承担买错的结果。")
  assert.equal(scene30.items[9].tradeMoment, "收盘以后")
  assert.equal(scene30.items[9].os, "下次一定买。")
  assert.equal(scene30.items[9].hiddenThought, "希望下次敢。")
  assert.equal(scene30.items[9].reflection, "你已经说过很多次：下次一定。")
  assert.deepEqual(scene30.thiefExplain, [
    "疑，是明明看见信号，却总想再确认一次。",
    "怯，是害怕承担买错后的结果。",
  ])
  assert.match(scene30.evidences[0], /我看见自己不是没机会/)
  assert.match(scene30.practices[4], /允许买错/)
  assert.equal(scene30.coreStatement, "最可惜的不是看错。\n\n是看对了，\n\n却不敢行动。")
})

test("official scene 31 content keeps the authored V3.1 wording", () => {
  assert.equal(scene31.sceneId, "scene_31")
  assert.equal(scene31.sceneName, "买后立刻后悔")
  assert.equal(scene31.mirrorId, "instant_regret")
  assert.equal(scene31.thief, "疑 · 怯")
  assert.equal(scene31.items[0].tradeMoment, "刚买进去以后")
  assert.equal(scene31.items[0].os, "我买它干嘛。")
  assert.equal(scene31.items[0].hiddenThought, "好像不对。")
  assert.equal(scene31.items[0].reflection, "你不是买完才后悔，你是买之前就不确定。")
  assert.equal(scene31.items[9].tradeMoment, "收盘以后")
  assert.equal(scene31.items[9].os, "明天再看吧。")
  assert.equal(scene31.items[9].hiddenThought, "希望没问题。")
  assert.equal(scene31.items[9].reflection, "真正的问题不是买错，而是从来没有真正确信过。")
  assert.deepEqual(scene31.thiefExplain, [
    "疑，是总在怀疑自己的判断。",
    "怯，是害怕承担判断错误的后果。",
  ])
  assert.match(scene31.evidences[0], /我看见自己不是买错了/)
  assert.match(scene31.practices[4], /怀疑不能代替规则/)
  assert.equal(
    scene31.coreStatement,
    "买后立刻后悔。\n\n往往不是因为买错。\n\n而是因为，\n\n你从来没有真正相信过自己。",
  )
})

test("official scene 32 content keeps the authored V3.1 wording", () => {
  assert.equal(scene32.sceneId, "scene_32")
  assert.equal(scene32.sceneName, "频繁看账户")
  assert.equal(scene32.mirrorId, "account_checking")
  assert.equal(scene32.thief, "惧 · 执")
  assert.equal(scene32.items[0].tradeMoment, "买入以后")
  assert.equal(scene32.items[0].os, "看一下。")
  assert.equal(scene32.items[0].hiddenThought, "应该没事吧。")
  assert.equal(scene32.items[0].reflection, "你看的不是账户，你看的是安全感。")
  assert.equal(scene32.items[9].tradeMoment, "收盘以后")
  assert.equal(scene32.items[9].os, "今天看太多了。")
  assert.equal(scene32.items[9].hiddenThought, "我还是不放心。")
  assert.equal(scene32.items[9].reflection, "当你无法离开账户，你已经失去了主动权。")
  assert.deepEqual(scene32.thiefExplain, ["惧，是害怕失去。", "执，是放不下结果。"])
  assert.match(scene32.evidences[0], /我看见自己不是在看账户/)
  assert.match(scene32.practices[4], /账户波动/)
  assert.equal(scene32.coreStatement, "你看的不是账户。\n\n你看的是，\n\n自己能不能安心。")
})

test("official scene 33 content keeps the authored V3.1 wording", () => {
  assert.equal(scene33.sceneId, "scene_33")
  assert.equal(scene33.sceneName, "频繁换股")
  assert.equal(scene33.mirrorId, "stock_hopping")
  assert.equal(scene33.thief, "急 · 贪 · 疑")
  assert.equal(scene33.items[0].tradeMoment, "持仓没动静时")
  assert.equal(scene33.items[0].os, "换一个吧。")
  assert.equal(scene33.items[0].hiddenThought, "这个太慢了。")
  assert.equal(scene33.items[0].reflection, "你放弃的不是股票，你放弃的是等待。")
  assert.equal(scene33.items[9].tradeMoment, "关软件之前")
  assert.equal(scene33.items[9].os, "明天换个思路。")
  assert.equal(scene33.items[9].hiddenThought, "这次肯定行。")
  assert.equal(scene33.items[9].reflection, "你总觉得答案在下一只股票里。")
  assert.deepEqual(scene33.thiefExplain, [
    "急，是受不了等待。",
    "贪，是总觉得别处更好。",
    "疑，是不断怀疑自己的选择。",
  ])
  assert.match(scene33.evidences[0], /我看见自己不是在寻找机会/)
  assert.match(scene33.practices[4], /耐心也是仓位/)
  assert.equal(scene33.coreStatement, "你换的不是股票。\n\n你换的是，\n\n自己放不下的心。")
})

test("official scene 34 content keeps the authored V3.1 wording", () => {
  assert.equal(scene34.sceneId, "scene_34")
  assert.equal(scene34.sceneName, "消息面交易")
  assert.equal(scene34.mirrorId, "news_trading")
  assert.equal(scene34.thief, "从 · 急 · 疑")
  assert.equal(scene34.items[0].tradeMoment, "看到一条利好消息时")
  assert.equal(scene34.items[0].os, "这消息挺猛。")
  assert.equal(scene34.items[0].hiddenThought, "应该会涨。")
  assert.equal(scene34.items[0].reflection, "你还没验证消息，心已经开始上涨了。")
  assert.equal(scene34.items[9].tradeMoment, "收盘以后")
  assert.equal(scene34.items[9].os, "看晚上怎么发酵。")
  assert.equal(scene34.items[9].hiddenThought, "希望别出问题。")
  assert.equal(scene34.items[9].reflection, "你已经把交易交给了未知消息。")
  assert.deepEqual(scene34.thiefExplain, [
    "从，是把别人的传播当成自己的判断。",
    "急，是消息还没验证，动作已经先发生。",
    "疑，是没有独立逻辑，只能不断等新消息确认。",
  ])
  assert.match(scene34.evidences[0], /我看见自己不是在研究消息/)
  assert.match(scene34.practices[4], /消息不是系统/)
  assert.equal(scene34.coreStatement, "你交易的不是消息。\n\n你交易的是，\n\n消息带来的想象。")
})

test("official scene 35 content keeps the authored V3.1 wording", () => {
  assert.equal(scene35.sceneId, "scene_35")
  assert.equal(scene35.sceneName, "恐惧持有")
  assert.equal(scene35.mirrorId, "fear_holding")
  assert.equal(scene35.thief, "惧 · 疑")
  assert.equal(scene35.items[0].tradeMoment, "刚开始盈利时")
  assert.equal(scene35.items[0].os, "要不先卖了。")
  assert.equal(scene35.items[0].hiddenThought, "落袋为安。")
  assert.equal(scene35.items[0].reflection, "你卖的不是仓位，你卖的是恐惧。")
  assert.equal(scene35.items[9].tradeMoment, "收盘以后")
  assert.equal(scene35.items[9].os, "还好卖了。")
  assert.equal(scene35.items[9].hiddenThought, "希望别继续涨。")
  assert.equal(scene35.items[9].reflection, "当你卖出以后，开始希望市场证明你是对的。")
  assert.deepEqual(scene35.thiefExplain, [
    "惧，是害怕失去已经得到的东西。",
    "疑，是不相信自己能够持有正确仓位。",
  ])
  assert.match(scene35.evidences[0], /我看见自己不是不会买/)
  assert.match(scene35.practices[4], /拥有利润/)
  assert.equal(scene35.coreStatement, "很多人不会亏钱。\n\n却输在，\n\n不敢拥有利润。")
})

test("official scene 36 content keeps the authored V3.1 wording", () => {
  assert.equal(scene36.sceneId, "scene_36")
  assert.equal(scene36.sceneName, "害怕认错")
  assert.equal(scene36.mirrorId, "fear_of_being_wrong")
  assert.equal(scene36.thief, "执 · 痴")
  assert.equal(scene36.items[0].tradeMoment, "行情已经走坏时")
  assert.equal(scene36.items[0].os, "再等等。")
  assert.equal(scene36.items[0].hiddenThought, "我不想错。")
  assert.equal(scene36.items[0].reflection, "你等的不是机会，你等的是不用认错。")
  assert.equal(scene36.items[9].tradeMoment, "收盘以后")
  assert.equal(scene36.items[9].os, "明天再说。")
  assert.equal(scene36.items[9].hiddenThought, "希望明天改变。")
  assert.equal(scene36.items[9].reflection, "你把今天的问题，交给了明天的幻想。")
  assert.deepEqual(scene36.thiefExplain, [
    "执，是已经知道不对，却不愿放下。",
    "痴，是把希望当成现实。",
  ])
  assert.match(scene36.evidences[0], /我看见自己不是输给市场/)
  assert.match(scene36.practices[4], /认错/)
  assert.equal(scene36.coreStatement, "最难承认的，\n\n不是亏损。\n\n而是，\n\n自己错了。")
})

test("schema exposes the shared V3.1 engine contract for future callers", () => {
  assert.match(schemaSource, /export type InsightContentItem/)
  assert.match(schemaSource, /tradeMoment: string/)
  assert.match(schemaSource, /os: string/)
  assert.match(schemaSource, /hiddenThought: string/)
  assert.match(schemaSource, /export type InsightContentRecord/)
  assert.match(schemaSource, /items: InsightContentItem\[\]/)
  assert.match(schemaSource, /export type InsightRecord/)
  assert.match(schemaSource, /hiddenThought\?: string/)
  assert.match(schemaSource, /export type InsightSceneFile/)
  assert.match(schemaSource, /export type InsightUploadKind/)
  assert.match(schemaSource, /export type InsightDetectedScene/)
  assert.match(schemaSource, /INSIGHT_ENGINE_TARGET_SCENE_COUNT = 36/)
  assert.match(schemaSource, /makeInsightKey/)
  assert.match(schemaSource, /isInsightIntensity/)
})

test("foreground V3.1 ritual displays tradeMoment, os, and reflection without hiddenThought", () => {
  assert.match(ritualFlowSource, /scene-01-chase-surge\.json/)
  assert.match(ritualFlowSource, /scene-02-missed\.json/)
  assert.match(ritualFlowSource, /scene-03-small-position\.json/)
  assert.match(ritualFlowSource, /scene-04-sold-too-early\.json/)
  assert.match(ritualFlowSource, /scene-05-sold-too-late\.json/)
  assert.match(ritualFlowSource, /scene-06-floating-gain-fear\.json/)
  assert.match(ritualFlowSource, /scene-07-unwilling-stop-loss\.json/)
  assert.match(ritualFlowSource, /scene-08-hold-loss\.json/)
  assert.match(ritualFlowSource, /scene-09-average-down\.json/)
  assert.match(ritualFlowSource, /scene-10-more-average-down\.json/)
  assert.match(ritualFlowSource, /scene-11-revenge-trade\.json/)
  assert.match(ritualFlowSource, /scene-12-overconfidence\.json/)
  assert.match(ritualFlowSource, /scene-13-heavy-position\.json/)
  assert.match(ritualFlowSource, /scene-14-all-in\.json/)
  assert.match(ritualFlowSource, /scene-15-empty-position\.json/)
  assert.match(ritualFlowSource, /scene-16-change-plan\.json/)
  assert.match(ritualFlowSource, /scene-17-stop-loss-regret\.json/)
  assert.match(ritualFlowSource, /scene-18-profit-regret\.json/)
  assert.match(ritualFlowSource, /scene-19-open-impulse\.json/)
  assert.match(ritualFlowSource, /scene-20-close-impulse\.json/)
  assert.match(ritualFlowSource, /scene-21-after-close-regret\.json/)
  assert.match(ritualFlowSource, /scene-22-avoid-review\.json/)
  assert.match(ritualFlowSource, /scene-23-news-trigger\.json/)
  assert.match(ritualFlowSource, /scene-24-follow-call\.json/)
  assert.match(ritualFlowSource, /scene-25-hot-theme\.json/)
  assert.match(ritualFlowSource, /scene-26-bottom-fishing\.json/)
  assert.match(ritualFlowSource, /scene-27-high-buy\.json/)
  assert.match(ritualFlowSource, /scene-28-breakeven-obsession\.json/)
  assert.match(ritualFlowSource, /scene-29-unlock-obsession\.json/)
  assert.match(ritualFlowSource, /scene-30-see-right-no-buy\.json/)
  assert.match(ritualFlowSource, /scene-31-instant-regret\.json/)
  assert.match(ritualFlowSource, /selectedThought\.tradeMoment/)
  assert.match(ritualFlowSource, /selectedThought\.text/)
  assert.match(ritualFlowSource, /selectedThought\.reflection/)
  assert.doesNotMatch(ritualFlowSource, /hiddenThought/)
})
