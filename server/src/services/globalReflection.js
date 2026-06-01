import crypto from "node:crypto";
import { globalReflectionChoices, globalReflectionContent } from "../../../packages/content/global-reflection.js";
import { readRuntimeRecords, replaceRuntimeRecords } from "../lib/store.js";

const GLOBAL_REFLECTION_FILE = "global-reflection-votes.json";
const choiceByKey = new Map(globalReflectionChoices.map((choice) => [choice.key, choice]));
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

export function listGlobalReflectionChoices() {
  return globalReflectionChoices.map(({ key, label, note }) => ({ key, label, note }));
}

export async function getGlobalReflectionToday({ dateKey = "" } = {}) {
  const records = await readRuntimeRecords(GLOBAL_REFLECTION_FILE);
  return buildGlobalReflectionSummary(records, cleanText(dateKey, 16) || getTodayDateKey());
}

export async function submitGlobalReflectionVote({
  anonymousId = "",
  thoughtKey = "",
  primaryType = "",
  sourceChannel = "web-next",
  dateKey = ""
} = {}) {
  const choice = choiceByKey.get(String(thoughtKey || ""));
  if (!choice) {
    const error = new Error("请选择今日一念");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const targetDate = cleanText(dateKey, 16) || getTodayDateKey();
  const anonymousHash = createAnonymousHash(anonymousId);
  const record = {
    id: crypto.randomUUID(),
    anonymous_id: anonymousHash,
    thought_key: choice.key,
    thought_label: choice.label,
    primary_type: cleanText(primaryType || "未完成测评", 40),
    source_channel: cleanText(sourceChannel || "web-next", 40),
    date_key: targetDate,
    created_at: now
  };

  const records = await readRuntimeRecords(GLOBAL_REFLECTION_FILE);
  const nextRecords = records
    .filter((item) => !(item?.anonymous_id === anonymousHash && item?.date_key === targetDate))
    .concat(record);
  await replaceRuntimeRecords(GLOBAL_REFLECTION_FILE, nextRecords);

  return {
    vote: toScrollItem(record),
    summary: buildGlobalReflectionSummary(nextRecords, targetDate)
  };
}

export async function resetGlobalReflectionForTests() {
  await replaceRuntimeRecords(GLOBAL_REFLECTION_FILE, []);
}

function buildGlobalReflectionSummary(records, dateKey) {
  const todayRecords = records.filter((record) => record?.date_key === dateKey);
  const totalVotes = todayRecords.length;
  const choices = listGlobalReflectionChoices().map((choice) => {
    const count = todayRecords.filter((record) => record.thought_key === choice.key).length;
    return {
      ...choice,
      count,
      percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0
    };
  });
  const mirrors = buildMirrorStats(todayRecords, totalVotes);
  const scroll = todayRecords
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 18)
    .map(toScrollItem);

  return {
    dateKey,
    totalVotes,
    choices,
    leadingThought: choices.slice().sort((a, b) => b.count - a.count)[0] || null,
    mirrors,
    scroll,
    compliance: globalReflectionContent.compliance
  };
}

function buildMirrorStats(records, totalVotes) {
  const counts = new Map();
  records.forEach((record) => {
    const primaryType = cleanText(record.primary_type || "未完成测评", 40);
    counts.set(primaryType, (counts.get(primaryType) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([primaryType, count]) => ({
      primaryType,
      count,
      percentage: totalVotes ? Math.round((count / totalVotes) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function toScrollItem(record) {
  const choice = choiceByKey.get(record.thought_key);
  const thoughtLabel = choice?.label || record.thought_label || "一念";
  const primaryType = cleanText(record.primary_type || "未完成测评", 40);

  return {
    id: record.id,
    thoughtKey: record.thought_key,
    thoughtLabel,
    primaryType,
    line: `${choice?.mirrorLine || `有一位交易者照见：${thoughtLabel}浮上来了。`}（${primaryType}）`,
    createdAt: record.created_at
  };
}

function createAnonymousHash(value) {
  const raw = String(value || crypto.randomUUID());
  return `anon-${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 18)}`;
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function cleanText(value, maxLength) {
  const text = String(value || "").trim().slice(0, maxLength);
  return forbiddenPhrases.reduce((current, phrase) => current.replaceAll(phrase, "训练提示"), text);
}
