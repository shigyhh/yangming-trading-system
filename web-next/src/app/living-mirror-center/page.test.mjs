import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("living mirror center exposes cross-end records without advisory language", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "活镜中枢",
    "三证互照",
    "unifiedConclusion",
    "proofLine",
    "nextCalibration",
    "真实记录库",
    "活镜证据链 · 真实记录库",
    "crossEndStatusText",
    "crossEndStatusSteps",
    "盲练实验室",
    "助教工作台",
    "训练处方下发",
    "dispatchTrainingPrescriptionBinding",
    "training_prescription",
    "下发到小程序",
    "living_mirror_profile",
    "marketContext",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `living mirror center missing ${token}`)
  })

  ;["推荐买入", "推荐卖出", "必赚", "稳赚", "抄底", "逃顶", "喊单"].forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `living mirror center contains forbidden phrase ${phrase}`)
  })
})
