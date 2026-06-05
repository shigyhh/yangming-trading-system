import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const characterMarkUrl = new URL("./yangming-character-mark.tsx", import.meta.url)
const zhaoSealUrl = new URL("./yangming-zhao-seal.tsx", import.meta.url)

test("zhao-bone marks read one shared motion grammar", async () => {
  const characterMark = await readFile(characterMarkUrl, "utf8")
  const zhaoSeal = await readFile(zhaoSealUrl, "utf8")
  const source = `${characterMark}\n${zhaoSeal}`

  ;[
    "getBrandMotionByCharacter",
    "data-motion-key",
    "data-motion-label",
    "motion-zhao-stamp",
    "motion-xin-gather",
    "motion-zhi-reveal",
    "motion-xing-settle",
    "motion-zhi-pause",
    "motion-zheng-stamp",
    "motion-fu-loop",
    "motion-lian-sediment",
    "motion-jie-contain",
    "prefers-reduced-motion",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing motion token: ${token}`)
  })
})
