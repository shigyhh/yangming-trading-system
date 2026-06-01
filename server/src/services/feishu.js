import crypto from "node:crypto";
import { config } from "../config.js";
import { appendRuntimeRecord } from "../lib/store.js";

const SYNC_LOG_FILE = "lead-sync-logs.json";

export async function syncReportToFeishu({ payload, webhookUrl = "", dryRun = false }) {
  const targetUrl = webhookUrl || config.feishuBotWebhook;
  const message = buildFeishuText(payload);
  const requestPayload = buildFeishuPayload(message);

  if (dryRun) {
    return {
      sent: false,
      dry_run: true,
      target: targetUrl ? maskWebhook(targetUrl) : "not_configured",
      request_payload: requestPayload
    };
  }

  if (!targetUrl) {
    const error = new Error("飞书 Webhook 尚未配置");
    error.statusCode = 400;
    throw error;
  }

  validateFeishuWebhook(targetUrl);
  addFeishuSignature(requestPayload);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    const responseText = await response.text();
    let responsePayload;
    try {
      responsePayload = JSON.parse(responseText);
    } catch {
      responsePayload = { raw: responseText };
    }

    const ok = response.ok && Number(responsePayload.code || 0) === 0;
    await appendRuntimeRecord(SYNC_LOG_FILE, {
      id: crypto.randomUUID(),
      user_id: payload.user?.id || payload.user_id || null,
      assessment_id: payload.assessment_id || null,
      report_id: payload.server_report?.id || null,
      target: "feishu_bot",
      status: ok ? "success" : "failed",
      request_payload: {
        ...requestPayload,
        webhook: maskWebhook(targetUrl)
      },
      response_payload: responsePayload,
      error_message: ok ? "" : responsePayload.msg || `HTTP ${response.status}`,
      created_at: new Date().toISOString()
    });

    if (!ok) {
      const error = new Error(responsePayload.msg || `飞书返回异常：HTTP ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    return {
      sent: true,
      target: maskWebhook(targetUrl),
      response: responsePayload
    };
  } catch (error) {
    if (error.statusCode) throw error;
    error.statusCode = 502;
    throw error;
  }
}

function buildFeishuText(payload) {
  const result = payload.score_result || payload.local_score_result || payload.server_report?.score_result || {};
  const user = payload.user || {};
  const nickname = payload.nickname || result.nickname || user.displayName || user.nickname || "未知学员";
  const report = payload.server_report || {};
  const contact = payload.phone || payload.contact || user.phone || user.contact || "-";
  const userId = payload.user_id || user.serverId || user.id || "-";
  const inviteCode = payload.invite_code || user.personalInviteCode || user.personal_invite_code || "-";
  const submittedAt = payload.submitted_at || report.created_at || new Date().toISOString();
  const reportLink = payload.report_url || payload.report_link || "-";
  const reportSummary = payload.report_summary || summarizeReport(report.content_md || payload.report || "");
  const handoff = payload.assistant_handoff || buildAssistantHandoff(payload, result);
  const trainingProgress = payload.training_progress || {};
  const retest = payload.retest_change || {};
  const retestDimensions = formatRetestDimensions(retest.dimensions);
  return [
    "【九种交易人格测评】新报告",
    `学员：${nickname}`,
    `手机号/联系方式：${contact}`,
    `用户ID：${userId}`,
    `邀请码：${inviteCode}`,
    `主人格：${result.main_type || "-"}`,
    `副人格：${result.sub_type || "-"}`,
    `风险等级：${result.risk_level || "-"}`,
    `训练营：${result.camp || result.recommended_camp || "-"}`,
    `承接优先级：${handoff.priority || "-"}`,
    `承接提示：${handoff.conversion || "-"}`,
    `承接重点：${handoff.focus || "-"}`,
    `承接动作：${handoff.action || "-"}`,
    `训练完成度：累计${trainingProgress.practice_count ?? "-"}局，今日${trainingProgress.today_used ?? "-"}/${trainingProgress.today_limit ?? "-"}`,
    `复测变化：${retest.summary || "-"}`,
    `复测维度：${retestDimensions}`,
    `训练匹配：${retest.training_match || "-"}`,
    `复测下一步：${retest.next_action || "-"}`,
    `题量：${payload.test_version || result.test_version || "-"} 题`,
    `渠道：${payload.channel || result.channel || "-"}`,
    `报告编号：${report.report_no || "-"}`,
    `报告链接：${reportLink}`,
    `测评ID：${payload.assessment_id || "-"}`,
    `提交时间：${submittedAt}`,
    `话术建议：${handoff.script || "-"}`,
    `报告摘要：${reportSummary || "-"}`
  ].join("\n");
}

function formatRetestDimensions(dimensions = []) {
  if (!Array.isArray(dimensions) || !dimensions.length) return "-";
  return dimensions.slice(0, 6).map((item) => {
    const before = item.before === null || item.before === undefined ? "-" : `${item.before}%`;
    const current = item.current === null || item.current === undefined ? "-" : `${item.current}%`;
    const delta = item.delta === null || item.delta === undefined
      ? "基准"
      : `${item.delta > 0 ? "上升" : item.delta < 0 ? "下降" : "持平"}${Math.abs(Number(item.delta) || 0)}%`;
    return `${item.type || "-"} ${before}->${current}（${delta}）`;
  }).join("；");
}

function buildAssistantHandoff(payload, result) {
  const risk = result.risk_level || "";
  const highRisk = /高风险|中高风险/.test(risk);
  const mediumRisk = /中等风险/.test(risk);
  const priority = highRisk ? "高优先承接" : mediumRisk ? "训练营跟进" : "自训练观察";
  const conversion = highRisk
    ? "建议助教主动跟进 / 训练营优先承接"
    : mediumRisk
      ? "建议邀约7天训练营"
      : "建议自训练 + 7天复测";
  const focus = `${result.main_type || "-"}｜${result.training_ability || "-"}`;
  const action = highRisk
    ? `当天引导进入「${result.camp || result.recommended_camp || "训练营"}」`
    : mediumRisk
      ? "邀请完成7天训练营并提醒复测"
      : "发送自训练入口，提醒每日三局和7天复测";
  return {
    priority,
    conversion,
    focus,
    action,
    script: payload.assistant_script || `围绕「${result.easiest_loss_scene || "高频亏损场景"}」先练7天，再看复测变化。`
  };
}

function summarizeReport(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildFeishuPayload(text) {
  return {
    msg_type: "text",
    content: { text }
  };
}

function addFeishuSignature(payload) {
  if (!config.feishuBotSecret) return;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${config.feishuBotSecret}`;
  const sign = crypto.createHmac("sha256", stringToSign).update("").digest("base64");
  payload.timestamp = timestamp;
  payload.sign = sign;
}

function validateFeishuWebhook(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    const error = new Error("飞书 Webhook 地址不合法");
    error.statusCode = 400;
    throw error;
  }

  const allowedHost = url.hostname.endsWith("feishu.cn") || url.hostname.endsWith("larksuite.com");
  const allowedPath = url.pathname.includes("/open-apis/bot/v2/hook/");
  if (url.protocol !== "https:" || !allowedHost || !allowedPath) {
    const error = new Error("只允许飞书/Lark 自定义机器人 Webhook 地址");
    error.statusCode = 400;
    throw error;
  }
}

function maskWebhook(rawUrl) {
  return rawUrl.replace(/(hook\/).+$/i, "$1***");
}
