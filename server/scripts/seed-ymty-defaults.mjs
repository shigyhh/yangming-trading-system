import { seedYmtyDefaults } from "../src/services/ymtyCampaign.js";

const result = await seedYmtyDefaults();

console.log(JSON.stringify({
  ok: true,
  products: result.products.map((item) => ({
    product_code: item.product_code,
    amount_cents: item.amount_cents,
    status: item.status
  })),
  livecodes: result.livecodes.map((item) => ({
    code_key: item.code_key,
    status: item.status
  })),
  admin_users: result.admin_users.map((item) => ({
    username: item.username,
    role: item.role,
    status: item.status
  }))
}, null, 2));
