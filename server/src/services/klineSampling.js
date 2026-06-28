import { buildHistoricalKlineSlice, listHistoricalKlineCatalog, listHistoricalKlineInstruments } from "./historicalKline.js";
import { listKlineSegments } from "./klineSegments.js";

const DEFAULT_MARKET = "cn_equity";
const DEFAULT_PERIOD = "1d";
const DEFAULT_LIMIT = 60;
const MIN_LIMIT = 12;
const MAX_LIMIT = 240;

const PERIOD_ALIASES = new Map([
  ["daily", "1d"],
  ["day", "1d"],
  ["d", "1d"],
  ["日线", "1d"],
  ["weekly", "1w"],
  ["week", "1w"],
  ["w", "1w"],
  ["monthly", "1mo"],
  ["month", "1mo"],
  ["mon", "1mo"],
  ["yearly", "1y"],
  ["year", "1y"],
  ["y", "1y"],
]);

export async function sampleKlineTraining(input = {}) {
  const request = normalizeSamplingRequest(input);
  const enabledSegments = await listKlineSegments();
  const baseCandidates = enabledSegments.filter((segment) => matchesRequiredFilters(segment, request));
  const rankedCandidates = rankCandidates(baseCandidates, request);
  const excludedIds = new Set(request.excludeSegmentIds);
  const candidates = rankedCandidates.filter((item) => !excludedIds.has(item.segment.id));

  let fallbackReason = "no_matching_segment";
  if (rankedCandidates.length > 0 && candidates.length === 0) {
    fallbackReason = "excluded_all_segments";
  }

  for (const { segment } of candidates) {
    try {
      return await buildSegmentSamplingResult(segment, request);
    } catch {
      fallbackReason = "segment_slice_unavailable";
    }
  }

  return buildFallbackSamplingResult(request, fallbackReason);
}

export function normalizeSamplingRequest(input = {}) {
  const sceneTags = arrayValue(pickAlias(input, "sceneTags", "scene_tags"), "sceneTags/scene_tags");
  const excludeSegmentIds = arrayValue(pickAlias(input, "excludeSegmentIds", "exclude_segment_ids"), "excludeSegmentIds/exclude_segment_ids");
  const period = normalizePeriod(stringValue(input.period) || DEFAULT_PERIOD);
  const limit = normalizeLimit(input.limit);
  const userId = stringValue(pickAlias(input, "userId", "user_id"));
  const sourceType = stringValue(pickAlias(input, "sourceType", "source_type"));
  const errorType = stringValue(pickAlias(input, "errorType", "error_type"));
  const trainingPackId = stringValue(pickAlias(input, "trainingPackId", "training_pack_id"));
  const difficulty = stringValue(input.difficulty);

  return {
    userId,
    user_id: userId,
    sourceType,
    source_type: sourceType,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    trainingPackId,
    training_pack_id: trainingPackId,
    difficulty,
    period,
    excludeSegmentIds,
    exclude_segment_ids: excludeSegmentIds,
    limit,
  };
}

export function normalizeSamplingResult(input = {}) {
  const segmentId = stringValue(pickAlias(input, "segmentId", "segment_id"));
  const trainingPackId = stringValue(pickAlias(input, "trainingPackId", "training_pack_id"));
  const errorType = stringValue(pickAlias(input, "errorType", "error_type"));
  const sceneTags = arrayValue(pickAlias(input, "sceneTags", "scene_tags"), "sceneTags/scene_tags", { allowMissing: true });
  const startDate = stringValue(pickAlias(input, "startDate", "start_date"));
  const endDate = stringValue(pickAlias(input, "endDate", "end_date"));
  const fallbackUsed = Boolean(pickAlias(input, "fallbackUsed", "fallback_used"));
  const fallbackReason = stringValue(pickAlias(input, "fallbackReason", "fallback_reason"));

  return {
    segmentId,
    segment_id: segmentId,
    trainingPackId,
    training_pack_id: trainingPackId,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    symbol: stringValue(input.symbol),
    name: stringValue(input.name),
    period: normalizePeriod(stringValue(input.period) || DEFAULT_PERIOD),
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    bars: Array.isArray(input.bars) ? input.bars : [],
    fallbackUsed,
    fallback_used: fallbackUsed,
    fallbackReason,
    fallback_reason: fallbackReason,
    source: stringValue(input.source) || "no_match",
  };
}

function matchesRequiredFilters(segment, request) {
  if (request.period && normalizePeriod(segment.period) !== request.period) return false;
  if (request.difficulty && segment.difficulty !== request.difficulty) return false;
  if (request.trainingPackId && !segment.trainingPackIds.includes(request.trainingPackId)) return false;
  return true;
}

function rankCandidates(segments, request) {
  const hasSoftCriteria = Boolean(request.errorType || request.sceneTags.length);
  const ranked = segments.map((segment) => ({
    segment,
    score: scoreSegment(segment, request),
  }));
  const filtered = hasSoftCriteria ? ranked.filter((item) => item.score > 0) : ranked;

  return filtered.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const updatedDelta = String(right.segment.updatedAt || "").localeCompare(String(left.segment.updatedAt || ""));
    if (updatedDelta !== 0) return updatedDelta;
    return String(left.segment.id).localeCompare(String(right.segment.id));
  });
}

function scoreSegment(segment, request) {
  let score = 0;
  if (request.errorType && segment.errorTypes.includes(request.errorType)) score += 100;
  for (const tag of request.sceneTags) {
    if (segment.sceneTags.includes(tag)) score += 10;
  }
  return score;
}

async function buildSegmentSamplingResult(segment, request) {
  const { slice } = await buildHistoricalKlineSlice({
    marketKey: DEFAULT_MARKET,
    symbol: segment.symbol,
    timeframeKey: normalizePeriod(segment.period || request.period),
    windowSize: request.limit,
    mode: request.sourceType || "step_replay",
    blind: false,
    seed: [request.userId, segment.id, request.errorType, request.trainingPackId].filter(Boolean).join(":"),
    startDate: segment.startDate,
    endDate: segment.endDate,
  });

  if (!Array.isArray(slice.candles) || slice.candles.length === 0) {
    const error = new Error("segment slice unavailable");
    error.statusCode = 404;
    throw error;
  }

  return normalizeSamplingResult({
    segmentId: segment.id,
    trainingPackId: chooseTrainingPackId(segment, request),
    errorType: chooseErrorType(segment, request),
    sceneTags: segment.sceneTags,
    symbol: segment.symbol,
    name: segment.name,
    period: normalizePeriod(segment.period || request.period),
    startDate: segment.startDate || slice.data_range?.start || "",
    endDate: segment.endDate || slice.data_range?.end || "",
    bars: slice.candles,
    fallbackUsed: false,
    fallbackReason: "",
    source: "segment",
  });
}

async function buildFallbackSamplingResult(request, fallbackReason) {
  const catalog = listHistoricalKlineCatalog();
  const marketKey = catalog.markets.some((market) => market.key === DEFAULT_MARKET) ? DEFAULT_MARKET : catalog.markets[0]?.key;
  const timeframeKey = request.period || DEFAULT_PERIOD;
  const instruments = await listHistoricalKlineInstruments({
    marketKey,
    timeframeKey,
    limit: 500,
  });
  const instrument = instruments.instruments.find((item) => item.data_ready && Number(item.candle_count || 0) >= request.limit)
    || instruments.instruments.find((item) => item.data_ready);

  if (!instrument) {
    const error = new Error("没有可用于抽题 fallback 的K线标的");
    error.statusCode = 404;
    throw error;
  }

  const { slice } = await buildHistoricalKlineSlice({
    marketKey,
    symbol: instrument.symbol,
    timeframeKey,
    windowSize: request.limit,
    mode: request.sourceType || "step_replay",
    blind: false,
    seed: [request.userId, request.errorType, request.trainingPackId, "fallback"].filter(Boolean).join(":"),
  });

  if (!Array.isArray(slice.candles) || slice.candles.length === 0) {
    const error = new Error("fallback slice unavailable");
    error.statusCode = 404;
    throw error;
  }

  return normalizeSamplingResult({
    segmentId: "",
    trainingPackId: request.trainingPackId,
    errorType: request.errorType,
    sceneTags: request.sceneTags,
    symbol: instrument.symbol,
    name: instrument.name,
    period: timeframeKey,
    startDate: slice.data_range?.start || "",
    endDate: slice.data_range?.end || "",
    bars: slice.candles,
    fallbackUsed: true,
    fallbackReason,
    source: "fallback_catalog_slice",
  });
}

function chooseTrainingPackId(segment, request) {
  if (request.trainingPackId) return request.trainingPackId;
  return segment.trainingPackIds[0] || "";
}

function chooseErrorType(segment, request) {
  if (request.errorType && segment.errorTypes.includes(request.errorType)) return request.errorType;
  return segment.errorTypes[0] || request.errorType || "";
}

function normalizePeriod(value = DEFAULT_PERIOD) {
  const raw = stringValue(value) || DEFAULT_PERIOD;
  const lower = raw.toLowerCase();
  return PERIOD_ALIASES.get(lower) || PERIOD_ALIASES.get(raw) || lower;
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_LIMIT;
  const number = Number(value);
  if (!Number.isFinite(number) || number < MIN_LIMIT) {
    throwValidationError(`limit 必须是大于等于 ${MIN_LIMIT} 的数字`);
  }
  return Math.min(Math.floor(number), MAX_LIMIT);
}

function pickAlias(record = {}, camelKey, snakeKey) {
  if (record[camelKey] !== undefined) return record[camelKey];
  return record[snakeKey];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value, label, { allowMissing = false } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    if (allowMissing) return [];
    throwValidationError(`${label} 必须是数组`);
  }
  return value.map((item) => stringValue(item)).filter(Boolean);
}

function throwValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}
