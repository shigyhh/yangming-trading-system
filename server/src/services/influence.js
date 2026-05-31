import { readRuntimeRecords } from "../lib/store.js";

export async function getUserInfluence(userId) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const [users, sessions, reports, checkins] = await Promise.all([
    readRuntimeRecords("users.json"),
    readRuntimeRecords("assessment-sessions.json"),
    readRuntimeRecords("reports.json"),
    readRuntimeRecords("daily-checkins.json")
  ]);

  const user = users.find((item) => item.id === userId);
  if (!user) {
    const error = new Error("用户不存在");
    error.statusCode = 404;
    throw error;
  }

  const inviteCode = user.personal_invite_code;
  const partners = users.filter((item) => item.referred_by_invite_code && item.referred_by_invite_code === inviteCode);
  const partnerIds = new Set(partners.map((item) => item.id));
  const partnerAssessments = sessions.filter((item) => partnerIds.has(item.user_id) && item.status === "reported").length;
  const partnerReports = reports.filter((item) => partnerIds.has(item.user_id)).length;
  const userCheckins = checkins.filter((item) => item.user_id === userId).length;
  const influenceScore = partners.length * 40 + partnerReports * 20 + partnerAssessments * 15 + userCheckins * 10;

  return {
    user_id: userId,
    personal_invite_code: inviteCode,
    index_name: "知行同修指数",
    invite_text: `我正在做九种交易人格测评和K线心性训练，输入邀请码 ${inviteCode} 一起事上练、一起正心。`,
    partners_count: partners.length,
    partner_assessments: partnerAssessments,
    partner_reports: partnerReports,
    daily_checkins: userCheckins,
    influence_score: influenceScore,
    impact_index: Number((influenceScore / 10000).toFixed(4)),
    partners: partners.slice(-8).reverse().map((item) => ({
      id: item.id,
      nickname: item.nickname,
      created_at: item.created_at,
      assistant_status: item.assistant_status
    }))
  };
}
