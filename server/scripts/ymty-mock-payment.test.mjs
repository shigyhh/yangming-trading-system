import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { config } from "../src/config.js";
import {
  completeMockYmtyPayment,
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  getYmtyOrderStatus,
  listYmtyCourses,
  recordYmtyPaymentNotification,
  resetYmtyRuntimeForTest
} from "../src/services/ymty.js";

test("ymty mock payment creates pending order and unlocks after mock complete", async () => {
  await withTempRuntime(async () => {
    const created = await createYmtyOrder({
      channel: "mock",
      user_id: "user_001",
      phone: "13800138000",
      source_channel: "ymty_h5"
    });

    assert.equal(created.order.status, "pending");
    assert.equal(created.order.amount_cents, 168);
    assert.equal(created.order.currency, "CNY");
    assert.equal(created.order.buyer.phone_mask, "138****8000");
    assert.ok(created.payment.mock_pay_action.path.includes("/api/pay/mock/complete"));

    const locked = await getYmtyAfterpayEntrance({ order_id: created.order.order_id });
    assert.equal(locked.unlocked, false);

    const completed = await completeMockYmtyPayment({ order_id: created.order.order_id });
    assert.equal(completed.order.status, "paid");
    assert.equal(completed.enrollment.course_id, "ymty_7day_training_camp");

    const status = await getYmtyOrderStatus({ order_id: created.order.order_id });
    assert.equal(status.paid, true);
    assert.equal(status.order.status, "paid");

    const entrance = await getYmtyAfterpayEntrance({ order_id: created.order.order_id });
    assert.equal(entrance.unlocked, true);
    assert.equal(entrance.course.course_name, "阳明心学交易体验营");
    assert.equal(entrance.entrance.type, "assistant_qr_rotation");

    const courses = await listYmtyCourses({ user_id: "user_001" });
    assert.equal(courses.courses.length, 1);
    assert.equal(courses.courses[0].order_id, created.order.order_id);
  });
});

test("ymty notification records mock notify and can complete order when explicitly marked paid", async () => {
  await withTempRuntime(async () => {
    const created = await createYmtyOrder({ channel: "mock", openid: "openid_001" });
    const result = await recordYmtyPaymentNotification("wechat", {
      order_id: created.order.order_id,
      transaction_id: "mock_tx_001",
      mock_paid: true
    });

    assert.equal(result.notification.provider, "wechat");
    assert.equal(result.notification.verify_status, "mock_unverified");
    assert.equal(result.order.status, "paid");

    const courses = await listYmtyCourses({ openid: "openid_001" });
    assert.equal(courses.courses.length, 1);
  });
});

test("ymty rejects non-mock payment creation until real providers are wired", async () => {
  await withTempRuntime(async () => {
    await assert.rejects(
      () => createYmtyOrder({ channel: "wechat" }),
      /mock 支付骨架/
    );
  });
});

async function withTempRuntime(action) {
  const originalRuntimeDir = config.runtimeDir;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ymty-runtime-"));
  config.runtimeDir = tempRoot;
  try {
    await resetYmtyRuntimeForTest();
    await action();
  } finally {
    config.runtimeDir = originalRuntimeDir;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

