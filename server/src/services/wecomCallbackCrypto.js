import crypto from "node:crypto";

export function signWecomCallback({ token = "", timestamp = "", nonce = "", encrypted = "" } = {}) {
  return crypto
    .createHash("sha1")
    .update([token, timestamp, nonce, encrypted].map((item) => String(item ?? "")).sort().join(""))
    .digest("hex");
}

export function verifyWecomSignature({ token = "", timestamp = "", nonce = "", encrypted = "", signature = "" } = {}) {
  const expected = signWecomCallback({ token, timestamp, nonce, encrypted });
  return timingSafeEqual(expected, String(signature || ""));
}

export function decryptWecomMessage({ encodingAesKey = "", encrypted = "", corpId = "" } = {}) {
  const aesKey = decodeAesKey(encodingAesKey);
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, aesKey.subarray(0, 16));
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(String(encrypted || ""), "base64")), decipher.final()]);
  const unpadded = removePkcs7Padding(decrypted);
  const messageLength = unpadded.readUInt32BE(16);
  const message = unpadded.subarray(20, 20 + messageLength).toString("utf8");
  const receivedCorpId = unpadded.subarray(20 + messageLength).toString("utf8");
  if (receivedCorpId !== corpId) {
    const error = new Error("企业微信 CorpID 不匹配");
    error.statusCode = 403;
    error.code = "WECOM_CORP_ID_MISMATCH";
    throw error;
  }
  return message;
}

function decodeAesKey(encodingAesKey = "") {
  const text = String(encodingAesKey || "").trim();
  if (!/^[A-Za-z0-9+/=]{43}$/.test(text)) {
    const error = new Error("企业微信 AES Key 配置不合法");
    error.statusCode = 503;
    error.code = "WECOM_CONFIG_INVALID";
    throw error;
  }
  const key = Buffer.from(`${text}=`, "base64");
  if (key.length !== 32) {
    const error = new Error("企业微信 AES Key 配置不合法");
    error.statusCode = 503;
    error.code = "WECOM_CONFIG_INVALID";
    throw error;
  }
  return key;
}

function removePkcs7Padding(buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) return buffer;
  return buffer.subarray(0, buffer.length - pad);
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
