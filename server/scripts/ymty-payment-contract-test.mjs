import assert from "node:assert/strict";
import test from "node:test";

import {
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  getYmtyAuditLogs,
  getYmtyOrderStatus,
  getYmtyPublicCampaign,
  listYmtyOrders,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults,
  updateYmtyCourseUserStatus,
  updateYmtyCampaign,
  updateYmtyLivecode
} from "../src/services/ymtyCampaign.js";

test("ymty mock payment flow uses backend price and unlocks livecode only after paid", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const publicCampaign = await getYmtyPublicCampaign();
    assert.equal(publicCampaign.product.product_code, "YMXX_JY_TY");
    assert.equal(publicCampaign.product.amount_cents, 168);
    assert.equal(JSON.stringify(publicCampaign).includes("work.weixin.qq.com/ca/mock"), false);

    const order = await createYmtyOrder({
      productCode: "YMXX_JY_TY",
      amount: 1,
      amount_cents: 1,
      price: "0.01",
      payChannel: "mock",
      channel: "wechat_h5",
      campaign: "ymty_v1",
      creative: "contract_test"
    });
    assert.equal(order.order.product_code, "YMXX_JY_TY");
    assert.equal(order.order.amount_cents, 168);
    assert.equal(order.order.pay_status, "pending");
    assert.ok(order.mock_payment.mock_pay_url.includes(order.order.order_id));
    assert.ok(order.mock_payment.mock_pay_url.includes(order.order.order_token));

    const pendingStatus = await getYmtyOrderStatus({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(pendingStatus.order.pay_status, "pending");

    await assert.rejects(
      () => getYmtyAfterpayEntrance({
        orderId: order.order.order_id,
        token: order.order.order_token
      }),
      /支付完成后才可查看课程助教入口/
    );

    const paid = await markYmtyMockPaySuccess({
      orderId: order.order.order_id,
      token: order.order.order_token,
      transactionId: "mock-tx-001"
    });
    const paidAgain = await markYmtyMockPaySuccess({
      orderId: order.order.order_id,
      token: order.order.order_token,
      transactionId: "mock-tx-001"
    });
    assert.equal(paid.order.pay_status, "paid");
    assert.equal(paidAgain.course_user.user_id, paid.course_user.user_id);

    const paidStatus = await getYmtyOrderStatus({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(paidStatus.order.pay_status, "paid");

    const entrance = await getYmtyAfterpayEntrance({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(entrance.livecode.code_key, "YMXX_YMTY_DEFAULT");
    assert.equal(entrance.livecode.wecom_link, "https://work.weixin.qq.com/ca/mock");
    assert.equal(entrance.livecode.qr_image, "/assets/wecom-livecode-placeholder.svg");

    await updateYmtyCampaign({
      adminId: "contract-test-admin",
      patch: {
        product_code: "YMXX_JY_TY",
        display_price_yuan: 9.9,
        amount_cents: 990
      },
      ip: "127.0.0.1"
    });
    await updateYmtyLivecode({
      adminId: "contract-test-admin",
      patch: {
        code_key: "YMXX_YMTY_DEFAULT",
        button_text: "添加体验营助教",
        remark: "知行 + 手机号后4位"
      },
      ip: "127.0.0.1"
    });

    const newOrder = await createYmtyOrder({
      productCode: "YMXX_JY_TY",
      amount_cents: 1,
      payChannel: "mock"
    });
    assert.equal(newOrder.order.amount_cents, 990);

    const orders = await listYmtyOrders();
    assert.equal(orders.orders.find((item) => item.order_id === order.order.order_id)?.amount_cents, 168);
    assert.equal(orders.orders.find((item) => item.order_id === newOrder.order.order_id)?.amount_cents, 990);

    const courseStatus = await updateYmtyCourseUserStatus({
      adminId: "contract-test-admin",
      orderId: order.order.order_id,
      patch: {
        added_wechat: true,
        joined_group: true
      },
      ip: "127.0.0.1"
    });
    assert.equal(courseStatus.course_user.added_wechat, true);
    assert.equal(courseStatus.course_user.joined_group, true);

    const fulfilledOrders = await listYmtyOrders();
    const fulfilledOrder = fulfilledOrders.orders.find((item) => item.order_id === order.order.order_id);
    assert.equal(fulfilledOrder?.course_user?.added_wechat, true);
    assert.equal(fulfilledOrder?.course_user?.joined_group, true);

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "update_product" && item.before_json?.amount_cents === 168 && item.after_json?.amount_cents === 990));
    assert.ok(audit.audit_logs.some((item) => item.action === "update_livecode"));
    assert.ok(audit.audit_logs.some((item) => item.action === "update_course_user_status"));
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});
