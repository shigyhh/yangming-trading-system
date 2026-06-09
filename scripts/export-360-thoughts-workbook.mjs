import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = process.env.REPO_ROOT ? path.resolve(process.env.REPO_ROOT) : path.resolve(__dirname, "..")
const scenesDir = path.join(repoRoot, "web-next/src/data/insight-engine/scenes")
const outputDir = path.join(repoRoot, "outputs", "360-thoughts")
const outputPath = path.join(outputDir, "阳明心学交易系统-36场景360念统一调整表.xlsx")
const complianceNote = "本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。"

const mirrorNames = {
  chase: "追涨之镜",
  hesitate: "犹疑之镜",
  regret: "后悔之镜",
  anxiety: "焦虑之镜",
  hold: "扛单之镜",
  average_down: "补仓之镜",
  revenge_trade: "翻本之镜",
  overconfidence: "膨胀之镜",
  heavy_position: "重仓之镜",
  all_in: "梭哈之镜",
  empty_position: "空仓焦虑之镜",
  change_plan: "临盘改计划之镜",
  stop_loss_regret: "止损后悔之镜",
  profit_regret: "止盈后悔之镜",
  open_impulse: "开盘冲动之镜",
  close_impulse: "尾盘冲动之镜",
  after_close_regret: "收盘后后悔之镜",
  avoid_review: "复盘逃避之镜",
  news_trigger: "消息刺激之镜",
  follow_call: "喊单依赖之镜",
  hot_theme: "热点追逐之镜",
  bottom_fishing: "抄底冲动之镜",
  high_buy: "高位接盘之镜",
  breakeven_obsession: "回本执念之镜",
  unlock_obsession: "解套执念之镜",
  see_right_no_buy: "看对不敢买之镜",
  instant_regret: "买后立刻后悔之镜",
  account_checking: "频繁看账户之镜",
  stock_hopping: "频繁换股之镜",
  news_trading: "消息面交易之镜",
  fear_holding: "恐惧持有之镜",
  fear_of_being_wrong: "害怕认错之镜",
}

function columnName(index) {
  let name = ""
  let value = index
  while (value > 0) {
    const mod = (value - 1) % 26
    name = String.fromCharCode(65 + mod) + name
    value = Math.floor((value - mod) / 26)
  }
  return name
}

function matrixRange(sheetName, rowCount, colCount) {
  return `${sheetName}!A1:${columnName(colCount)}${rowCount}`
}

function sceneNumber(scene) {
  return String(scene.sceneOrder).padStart(2, "0")
}

async function loadScenes() {
  const files = (await fs.readdir(scenesDir))
    .filter((file) => /^scene-\d+-.+\.json$/.test(file))
    .sort()

  const scenes = []
  for (const file of files) {
    const scene = JSON.parse(await fs.readFile(path.join(scenesDir, file), "utf8"))
    scenes.push({ ...scene, sourceFile: `web-next/src/data/insight-engine/scenes/${file}` })
  }

  return scenes.sort((a, b) => a.sceneOrder - b.sceneOrder)
}

function buildRows(scenes) {
  const detailRows = []
  const sceneRows = []
  const sourceRows = []

  for (const scene of scenes) {
    const sceneNo = sceneNumber(scene)
    const mirrorName = mirrorNames[scene.mirrorId] || scene.mirrorId

    sceneRows.push([
      sceneNo,
      scene.sceneId,
      scene.sceneName,
      scene.mirrorId,
      mirrorName,
      scene.thief,
      scene.items.length,
      scene.evidences.length,
      scene.practices.length,
      scene.coreStatement,
      scene.status,
      scene.sourceFile,
    ])

    scene.thiefExplain.forEach((text, index) => {
      sourceRows.push([sceneNo, scene.sceneId, scene.sceneName, "心贼解释", index + 1, text])
    })
    scene.evidences.forEach((text, index) => {
      sourceRows.push([sceneNo, scene.sceneId, scene.sceneName, "心证", index + 1, text])
    })
    scene.practices.forEach((text, index) => {
      sourceRows.push([sceneNo, scene.sceneId, scene.sceneName, "修行", index + 1, text])
    })

    scene.items.forEach((item, index) => {
      const evidence = scene.evidences[index % scene.evidences.length] || ""
      const practice = scene.practices[index % scene.practices.length] || ""
      const itemNo = String(index + 1).padStart(2, "0")

      detailRows.push([
        `${sceneNo}-${itemNo}`,
        sceneNo,
        scene.sceneId,
        scene.sceneName,
        scene.mirrorId,
        mirrorName,
        scene.thief,
        item.id,
        item.tradeMoment,
        item.os,
        item.hiddenThought,
        item.reflection,
        scene.thiefExplain.join("\n"),
        evidence,
        practice,
        scene.coreStatement,
        item.intensity,
        scene.status,
        complianceNote,
        scene.sourceFile,
        "可调整",
        "",
      ])
    })
  }

  return { detailRows, sceneRows, sourceRows }
}

function setValues(sheet, sheetName, headers, rows) {
  const values = [headers, ...rows]
  sheet.getRange(matrixRange(sheetName, values.length, headers.length)).values = values
}

async function main() {
  const scenes = await loadScenes()
  const { detailRows, sceneRows, sourceRows } = buildRows(scenes)

  const workbook = Workbook.create()
  const detail = workbook.worksheets.add("360念统一表")
  const scenesSheet = workbook.worksheets.add("36场景索引")
  const sourceSheet = workbook.worksheets.add("场景级源内容")

  setValues(
    detail,
    "360念统一表",
    [
      "序号",
      "场景序号",
      "场景ID",
      "场景名称",
      "心镜ID",
      "心镜名称",
      "心贼",
      "念ID",
      "交易场景/触发时刻",
      "表层念",
      "隐藏念",
      "照回",
      "心贼解释",
      "心证",
      "修行",
      "核心句",
      "强度",
      "状态",
      "合规边界",
      "源文件",
      "调整状态",
      "备注",
    ],
    detailRows,
  )

  setValues(
    scenesSheet,
    "36场景索引",
    ["场景序号", "场景ID", "场景名称", "心镜ID", "心镜名称", "心贼", "念数量", "心证源数量", "修行源数量", "核心句", "状态", "源文件"],
    sceneRows,
  )

  setValues(
    sourceSheet,
    "场景级源内容",
    ["场景序号", "场景ID", "场景名称", "内容类型", "序号", "内容"],
    sourceRows,
  )

  await fs.mkdir(outputDir, { recursive: true })
  const output = await SpreadsheetFile.exportXlsx(workbook)
  await output.save(outputPath)

  console.log(JSON.stringify({ outputPath, sceneCount: scenes.length, thoughtCount: detailRows.length, sourceRows: sourceRows.length }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
