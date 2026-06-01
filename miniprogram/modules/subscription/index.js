const SUBSCRIPTION_PLANS = [
  {
    key: "free",
    name: "体验同修",
    identityName: "观心体验身份",
    durationDays: 0,
    durationLabel: "本地体验",
    cadence: "完成每日心证",
    note: "适合先完成测评、三印与每日陪跑。",
    benefits: ["每日心证", "基础照见", "7天训练入口"]
  },
  {
    key: "quarterly",
    name: "季度同修",
    identityName: "季度共修身份证明",
    durationDays: 90,
    durationLabel: "90日",
    cadence: "每季一复盘",
    note: "适合完成一个季度的照心、守界、复盘与复测。",
    benefits: ["季度共修身份", "阶段复盘档案", "复测变化归档"]
  },
  {
    key: "yearly",
    name: "年度同修",
    identityName: "年度共修身份证明",
    durationDays: 365,
    durationLabel: "365日",
    cadence: "全年修行档案",
    note: "适合进入长期修行，沉淀全年心证与稳定度变化。",
    benefits: ["年度同修身份", "365天修行档案", "年度照见画像"]
  }
];

function getPlan(planKey) {
  return SUBSCRIPTION_PLANS.find((item) => item.key === planKey) || SUBSCRIPTION_PLANS[0];
}

function formatDate(timestamp) {
  const time = Number(timestamp || 0);
  if (!time) return "待启用";
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function buildProofNo(userBinding = {}, planKey = "free") {
  const invite = String((userBinding || {}).inviteCode || "ZX0000").replace(/\W/g, "");
  const suffix = invite.slice(-4) || "0000";
  const planMark = planKey === "yearly" ? "YEAR" : planKey === "quarterly" ? "SEASON" : "MIND";
  return `YM-${planMark}-${suffix}`;
}

function buildSubscriptionView(state = {}, context = {}) {
  const userBinding = context.userBinding || {};
  const activePlanKey = state.activePlanKey || "free";
  const current = getPlan(activePlanKey);
  const startedAt = Number(state.startedAt || 0);
  const expiresAt = Number(state.expiresAt || 0);
  const isPaidIdentity = activePlanKey !== "free";
  const now = Date.now();
  const expired = isPaidIdentity && expiresAt && expiresAt < now;
  const validText = isPaidIdentity
    ? `${formatDate(startedAt)} - ${formatDate(expiresAt)}`
    : "绑定手机号后生成体验身份";

  return {
    current,
    activePlanKey,
    status: expired ? "expired" : isPaidIdentity ? "active" : "trial",
    statusText: expired ? "已到期" : isPaidIdentity ? "身份有效" : "体验身份",
    validText,
    proof: {
      proofNo: state.proofNo || buildProofNo(userBinding, activePlanKey),
      identityName: current.identityName,
      planName: current.name,
      ownerName: context.nickname || "修行者",
      phoneMask: userBinding.phoneMask || "未绑定",
      inviteCode: userBinding.inviteCode || "",
      groupCode: context.groupCode || "",
      cadence: current.cadence,
      validText,
      statusText: expired ? "已到期" : isPaidIdentity ? "身份有效" : "体验身份"
    },
    plans: SUBSCRIPTION_PLANS.map((plan) => Object.assign({}, plan, {
      active: plan.key === activePlanKey,
      actionText: plan.key === activePlanKey ? "当前身份" : plan.key === "free" ? "切回体验" : `启用${plan.name}`
    }))
  };
}

function buildSubscriptionPatch(planKey, userBinding = {}) {
  const plan = getPlan(planKey);
  const startedAt = Date.now();
  const expiresAt = plan.durationDays ? startedAt + plan.durationDays * 86400000 : null;
  return {
    activePlanKey: plan.key,
    startedAt,
    expiresAt,
    proofNo: buildProofNo(userBinding, plan.key),
    updatedAt: startedAt,
    source: "local_mock_subscription"
  };
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlan,
  buildSubscriptionView,
  buildSubscriptionPatch,
  buildProofNo
};
