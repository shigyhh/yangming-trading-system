import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("ymty admin page uses production APIs instead of localStorage", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "GET /api/admin/campaign/ymty",
    "POST /api/admin/campaign/ymty",
    "POST /api/admin/livecode",
    "GET /api/admin/orders",
    "GET /api/admin/audit-logs",
    "/api/admin/orders/${encodeURIComponent(orderId)}/course-user",
  ].forEach((token) => {
    assert.ok(page.includes(token), `ymty admin page missing ${token}`)
  })

  ;[
    "product_code",
    "product_name",
    "display_price_yuan",
    "amount_cents",
    "cycle",
    "start_time",
    "lecturer",
    "status",
    "wecom_link",
    "qr_image",
    "auto_redirect_after_paid",
    "redirect_delay_ms",
    "remark",
    "button_text",
    "service_text",
    "pay_status",
    "added_wechat",
    "joined_group",
    "before_json",
    "after_json",
  ].forEach((token) => {
    assert.ok(page.includes(token), `ymty admin page missing field ${token}`)
  })

  assert.ok(page.includes("confirm("), "price updates must require a browser confirmation")
  assert.ok(page.includes("真实支付金额以后端订单为准"), "admin page should explain backend price authority")
  assert.ok(page.includes("价格修改只影响新订单"), "admin page should warn old orders keep their amount")
  assert.ok(page.includes("二维码图片 URL"), "admin page should support entering qr image URL")
  assert.ok(page.includes("上传功能待实现"), "admin page should explain upload is not implemented in this step")
  assert.equal(page.includes("localStorage"), false, "ymty admin page must not persist production settings in localStorage")
})
