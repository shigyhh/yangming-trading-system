import crypto from "node:crypto";
import { config } from "../config.js";

const COMPLIANCE_NOTICE = "本内容仅用于交易心理复盘与行为训练，不构成投资建议。";

export async function buildTradeReviewOcrDraft({ user = {}, image = {}, source = "api" } = {}) {
  const provider = config.tradeReviewOcrProvider || "";
  const now = new Date().toISOString();
  const status = provider ? "provider_pending" : "provider_not_configured";
  const message = provider
    ? "截图识别草稿已创建，请以手动确认字段为准。"
    : "识别服务未连接，先手动确认字段。";

  return {
    id: `ocr-${crypto.randomUUID()}`,
    userId: cleanText(user.userId || user.user_id || user.id || "", 80),
    status,
    provider: provider || "manual_confirmation",
    confidence: 0,
    needsUserConfirmation: true,
    fields: {
      tradeDate: "",
      marketType: "",
      marketKey: "",
      timeframeKey: "",
      symbol: "",
      rawText: ""
    },
    image: {
      fileName: cleanText(image.fileName || image.file_name || "", 120),
      size: Number(image.size || 0),
      width: Number(image.width || 0),
      height: Number(image.height || 0),
      localPathHint: image.localPath || image.local_path ? "miniprogram_temp_file" : ""
    },
    message,
    source,
    complianceNotice: COMPLIANCE_NOTICE,
    createdAt: now
  };
}

function cleanText(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}
