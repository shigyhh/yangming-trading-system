import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;
const ALLOWED_MESSAGE = "仅支持 jpg、jpeg、png、webp 图片";

export async function saveYmtyLivecodeUpload(req) {
  const contentType = String(req.headers["content-type"] || "");
  const boundary = getMultipartBoundary(contentType);
  if (!boundary) throw uploadError(400, "请使用 multipart/form-data 上传图片");

  const body = await readRawBody(req);
  const file = parseMultipartFile(body, boundary);
  if (!file) throw uploadError(400, "请选择要上传的二维码图片");
  if (file.bytes.length > MAX_FILE_BYTES) throw uploadError(413, "上传文件不能超过 2MB");

  const ext = validateImage(file);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const uploadDir = path.resolve(config.webDir, "uploads/livecode");
  const filePath = path.resolve(uploadDir, filename);
  const relativePath = path.relative(uploadDir, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw uploadError(400, "上传路径不合法");
  }

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(filePath, file.bytes, { flag: "wx" });

  return {
    url: `/uploads/livecode/${filename}`
  };
}

async function readRawBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) throw uploadError(413, "上传文件不能超过 2MB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function getMultipartBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] || match?.[2] || "").trim();
}

function parseMultipartFile(body, boundary) {
  const marker = `--${boundary}`;
  const raw = body.toString("latin1");
  const segments = raw.split(marker).slice(1, -1);

  for (const segment of segments) {
    const cleanSegment = segment.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const headerEnd = cleanSegment.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerText = cleanSegment.slice(0, headerEnd);
    const contentText = cleanSegment.slice(headerEnd + 4);
    const disposition = getHeader(headerText, "content-disposition");
    if (!/name="file"/i.test(disposition)) continue;

    const filename = (disposition.match(/filename="([^"]*)"/i)?.[1] || "").trim();
    const partContentType = getHeader(headerText, "content-type");
    return {
      filename,
      contentType: partContentType,
      bytes: Buffer.from(contentText, "latin1")
    };
  }

  return null;
}

function getHeader(headerText, name) {
  const line = headerText
    .split(/\r\n/)
    .find((item) => item.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function validateImage(file) {
  const originalExt = normalizeExt(path.extname(file.filename || "").slice(1));
  const contentType = String(file.contentType || "").toLowerCase();
  const detectedExt = detectImageExt(file.bytes);

  if (!originalExt || !["jpg", "png", "webp"].includes(originalExt)) throw uploadError(400, ALLOWED_MESSAGE);
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw uploadError(400, ALLOWED_MESSAGE);
  if (!detectedExt) throw uploadError(400, ALLOWED_MESSAGE);
  if (detectedExt !== originalExt) throw uploadError(400, "图片扩展名与文件内容不一致");
  return detectedExt;
}

function normalizeExt(ext) {
  const value = String(ext || "").toLowerCase();
  if (value === "jpeg") return "jpg";
  return value;
}

function detectImageExt(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.slice(1, 4).toString("ascii") === "PNG") return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 12 && bytes.slice(0, 4).toString("ascii") === "RIFF" && bytes.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  return "";
}

function uploadError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
