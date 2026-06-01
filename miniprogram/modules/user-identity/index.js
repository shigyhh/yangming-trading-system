function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("86")) return digits.slice(2);
  return digits.slice(0, 11);
}

function isValidPhone(value) {
  return /^1\d{10}$/.test(normalizePhone(value));
}

function maskPhone(value) {
  const phone = normalizePhone(value);
  if (!isValidPhone(phone)) return "未绑定";
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function buildInviteCode(profile = {}) {
  const phone = normalizePhone(profile.phone);
  const raw = isValidPhone(phone) ? phone : String(profile.createdAt || Date.now());
  return `ZX${raw.slice(-4)}${String(raw.length * 7).slice(-2)}`;
}

function buildUserBinding(profile = {}, extra = {}) {
  const phone = normalizePhone(profile.phone);
  const phoneBound = isValidPhone(phone);
  return {
    phone: phoneBound ? phone : "",
    phoneMask: phoneBound ? maskPhone(phone) : "未绑定",
    phoneBound,
    inviteSource: profile.inviteSource || "",
    inviteSourceAt: profile.inviteSourceAt || null,
    inviteCode: profile.inviteCode || buildInviteCode(profile),
    sourceChannel: extra.sourceChannel || "wechat_miniprogram",
    boundAt: profile.phoneBoundAt || null
  };
}

function summarizeAssistantHandoff(context = {}) {
  const profile = context.profile || {};
  const binding = buildUserBinding(profile);
  const assessment = context.assessment || {};
  const training = context.training || {};
  const reaction = context.reaction || {};
  const review = context.review || {};
  const continuity = context.continuity || {};
  const dojoState = context.dojoState || {};
  const history = Array.isArray(context.assessmentHistory) ? context.assessmentHistory : [];
  const latest = history[history.length - 1] || {};
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const retestLine = previous
    ? `${previous.primary || "未建档"} -> ${latest.primary || assessment.primary || "未建档"}`
    : (assessment.primary ? "首次照见已生成" : "未生成测评报告");

  return {
    phoneMask: binding.phoneMask,
    inviteSource: binding.inviteSource || "自然进入",
    report: assessment.primary ? `${assessment.primary} / ${assessment.secondary || "未识别次反应"}` : "未建档",
    training: training.completed ? "今日训练已完成" : "今日训练未完成",
    reaction: reaction.tag ? `${reaction.tag}：${reaction.note || "已记录"}` : "今日未记录交易反应",
    review: review ? "今日已省察" : "今日未省察",
    retest: retestLine,
    continuity: `${Number(continuity.currentStreak || 0)}日连修`,
    mentor: dojoState.joined ? `已绑定${dojoState.mentorCode || "道场"}` : "未绑定助教",
    summary: `${binding.phoneMask} · ${assessment.primary || "未建档"} · ${training.completed ? "训练已完成" : "训练待完成"} · ${retestLine}`
  };
}

module.exports = {
  normalizePhone,
  isValidPhone,
  maskPhone,
  buildInviteCode,
  buildUserBinding,
  summarizeAssistantHandoff
};
