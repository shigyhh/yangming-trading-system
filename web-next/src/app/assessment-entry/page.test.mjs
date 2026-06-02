import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("assessment entry keeps the forced pause ritual", async () => {
  const page = await readFile(pageUrl, "utf8")

  assert.ok(page.includes("回想最近一次，"), "entry should open with the recent trading moment prompt")
  assert.ok(page.includes("你没有守住自己的交易瞬间。"), "entry should focus on behavior reflection")
  assert.ok(page.includes("别急着回答。"), "entry should show the pause instruction after the prompt")
  assert.ok(!page.includes("先别急着回答。"), "pause instruction should not lead before the prompt")
  assert.ok(!page.includes("选最像你的那个念头。"), "entry should not add an extra instruction line")
  assert.ok(page.includes("此心一照，妄念自明。"), "opening transition should keep the original seal copy")

  assert.ok(page.includes("}, 2450)"), "opening seal copy should keep its original pause")
  assert.ok(page.includes("animation-delay: 1700ms"), "pause instruction should wait after the main prompt")
  assert.ok(page.includes("animation-delay: 3500ms"), "ready button should appear after the forced pause")
  assert.ok(page.includes("ritual-still-seal"), "opening seal should stay visible on the first ritual screen")
  assert.ok(page.includes("ritual-opening-water-still"), "opening seal should sit over a subtle still-water surface")
  assert.ok(page.includes("ritual-late-seal"), "question screen should reveal a subtle seal after the ready button")
  assert.ok(page.includes("4300ms forwards"), "question screen seal should appear after the ready button begins showing")
  assert.ok(page.includes("router.push(target)"), "ready button should route directly into the full-screen water gateway")
  assert.ok(page.includes("isRoutingRef"), "ready button should guard double taps without changing the visible page")
  assert.ok(page.includes("@keyframes ritual-still-water-in"), "opening water should arrive with a slow restrained entrance")
  assert.ok(!page.includes("setIsEntering"), "ready button should not trigger an intermediate re-render state")
  assert.ok(!page.includes("照心将启"), "ready button should not render an intermediate entering state")
  assert.ok(!page.includes("先不判断行情。"), "entry page should leave the water-gateway copy to /assessment")
  assert.ok(!page.includes("showExitRitual"), "entry page should not render its own exit transition")
  assert.ok(!page.includes("ritual-exit-copy"), "entry page should not show the no-judgement line as a transition")
  assert.ok(!page.includes("ritual-exit-ripple"), "entry page should not render a separate water-ripple transition")
  assert.ok(!page.includes("ritual-rising-seal"), "exit transition should not show a seal glyph after the ready button")
  assert.ok(!page.includes("@keyframes ritual-seal-float"), "exit transition should not float a seal glyph")
  assert.ok(!page.includes("ritual-heart-lamp"), "question screen should not render a second seal before the button")
})
