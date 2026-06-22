import { getEventAggregationSource } from "./dataBinding.js";
import { buildLivingMirrorGrowthProjection } from "./livingMirrorEvolution.js";

const EMPTY_REACTION = "暂无明显模式";
const EMPTY_BOUNDARY = "暂无";
const EMPTY_MIRROR = "待观察之镜";

export async function getLivingMirrorProfile(userId) {
  const source = await getEventAggregationSource(userId);
  const events = normalizeKLineEvents(source.kline_records);
  const latest = latestEvent(events);
  const dominantReaction = topValue(events.map((event) => event.reaction)) || EMPTY_REACTION;

  return {
    userId: source.userId || String(userId || ""),
    totalEvents: events.length,
    dominantReaction,
    repeatedThoughts: repeatedValues(events.map((event) => event.reaction)),
    latestBoundaryState: latest?.boundaryState || EMPTY_BOUNDARY,
    latestMirrorType: latest?.mirrorType || EMPTY_MIRROR,
    updatedAt: latestUpdatedAt(source, events)
  };
}

export async function getRiskPatternSummary(userId) {
  const source = await getEventAggregationSource(userId);
  const events = normalizeKLineEvents(source.kline_records);
  const reactions = events.map((event) => event.reaction);

  return {
    userId: source.userId || String(userId || ""),
    topRiskPatterns: topValues(reactions, 3),
    repeatedReactionChoice: topValue(reactions) || "",
    recentServerSourceQuality: summarizeSourceQuality(events),
    updatedAt: latestUpdatedAt(source, events)
  };
}

export async function getTodayState(userId) {
  const source = await getEventAggregationSource(userId);
  const klineTrainingCount = Array.isArray(source.kline_records) ? source.kline_records.length : 0;
  const trainingCount = Array.isArray(source.training_records) ? source.training_records.length : 0;
  const reviewCount = Array.isArray(source.trade_reviews) ? source.trade_reviews.length : 0;
  const status = resolveTodayStatus({ klineTrainingCount, trainingCount, reviewCount });

  return {
    userId: source.userId || String(userId || ""),
    status,
    nextAction: resolveNextAction(status),
    progress: {
      totalEvents: klineTrainingCount,
      klineTrainingCount,
      reviewCount
    },
    updatedAt: latestUpdatedAt(source, normalizeKLineEvents(source.kline_records))
  };
}

export async function getLivingMirrorGrowthProjection(userId, options = {}) {
  const source = await getEventAggregationSource(userId);
  return buildLivingMirrorGrowthProjection(source.userId || String(userId || ""), source, options);
}

function normalizeKLineEvents(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => {
      const event = record?.one_thought_event || record?.oneThoughtEvent || {};
      const reaction = publicText(
        event.thought ||
          event.reaction ||
          record?.reaction ||
          record?.reaction_key ||
          record?.reactionKey,
        ""
      );
      if (!reaction) return null;

      return {
        reaction,
        boundaryState: publicText(
          event.boundary_state ||
            event.boundaryState ||
            record?.discipline_action ||
            record?.disciplineAction,
          EMPTY_BOUNDARY
        ),
        mirrorType: publicText(
          event.mirror_type || event.mirrorType || record?.mirror_type || record?.mirrorType || deriveMirrorType(reaction),
          EMPTY_MIRROR
        ),
        sourceQuality: normalizeSourceQuality(record),
        updatedAt: record?.recorded_at || record?.recordedAt || event.created_at || event.createdAt || ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
}

function summarizeSourceQuality(events) {
  const summary = {
    server_cache: 0,
    local_demo: 0,
    network_error: 0,
    unknown: 0
  };

  for (const event of events.slice(-20)) {
    summary[event.sourceQuality] += 1;
  }

  return summary;
}

function normalizeSourceQuality(record = {}) {
  const text = String(
    record.server_slice_error ||
      record.serverSliceError ||
      record.data_source ||
      record.dataSource ||
      record.kline_source ||
      record.klineSource ||
      record.server_slice_status ||
      record.serverSliceStatus ||
      ""
  ).toLowerCase();

  if (text.includes("network_error") || text.includes("error")) return "network_error";
  if (text.includes("local_demo")) return "local_demo";
  if (text.includes("server_cache")) return "server_cache";
  return "unknown";
}

function resolveTodayStatus({ klineTrainingCount, trainingCount, reviewCount }) {
  if (klineTrainingCount > 0 && reviewCount > 0) return "completed";
  if (reviewCount > 0) return "reviewed";
  if (klineTrainingCount > 0 || trainingCount > 0) return "trained";
  return "not_seen";
}

function resolveNextAction(status) {
  if (status === "completed") return "查看活镜";
  if (status === "reviewed") return "K线训练";
  if (status === "trained") return "轻复盘";
  return "照见一念";
}

function latestEvent(events) {
  return events.length ? events[events.length - 1] : null;
}

function latestUpdatedAt(source, events) {
  const event = latestEvent(events);
  const fallback = source?.trade_reviews?.at?.(-1)?.createdAt || source?.training_records?.at?.(-1)?.recordedAt || "";
  return event?.updatedAt || fallback || new Date().toISOString();
}

function topValue(values) {
  return topValues(values, 1)[0] || "";
}

function topValues(values, limit) {
  const counts = countValues(values);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .slice(0, limit)
    .map(([value]) => value);
}

function repeatedValues(values) {
  return Array.from(countValues(values).entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .map(([value]) => value)
    .slice(0, 5);
}

function countValues(values) {
  const counts = new Map();
  for (const value of values.map((item) => publicText(item, "")).filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function deriveMirrorType(text) {
  if (/追|涨|错过|急/.test(text)) return "追涨之镜";
  if (/扛|不认错|幻想/.test(text)) return "扛单之镜";
  if (/从众|别人|消息/.test(text)) return "从众之镜";
  if (/拖延|犹豫|观望/.test(text)) return "犹疑之镜";
  return EMPTY_MIRROR;
}

function publicText(value, fallback, maxLength = 80) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw
    .replace(/1[3-9]\d{9}/g, "[已隐藏]")
    .replace(/\b(openid|unionid|token|code)\b\s*[:=]?\s*[\w-]*/gi, "[已隐藏]")
    .replace(/买入|卖出|荐股|喊单|预测|收益|必赚|信号|抄底|逃顶|推荐/g, "训练提示")
    .slice(0, maxLength);
}
