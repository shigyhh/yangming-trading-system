const SCHEMA_VERSION = "living_mirror_growth_projection_v1";
const COMPLIANCE_NOTICE = "本投影仅用于交易心理训练、行为觉察与复盘教育，不构成投资建议。";
const DATA_GAP_DEFINITIONS = [
  ["heartProof", "心证事实源暂未接入"],
  ["dailyGrowth", "每日成长事实源暂未接入"],
  ["retest", "复测事实源暂未接入"]
];

export function buildLivingMirrorGrowthProjection(userId, records = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const klineRecords = Array.isArray(records.kline_records) ? records.kline_records : [];
  const tradeReviews = Array.isArray(records.trade_reviews) ? records.trade_reviews : [];
  const events = normalizeGrowthEvents(klineRecords);
  const highFrequencyThoughts = topCountedValues(events.map((event) => event.thought), "text");
  const repeatedBehaviors = topCountedValues(events.map((event) => event.behavior), "label");
  const topBehaviorLoops = repeatedBehaviors.map((behavior) => ({
    label: behavior.label,
    count: behavior.count,
    latestBoundaryState: latestBoundaryFor(events, behavior.label)
  }));
  const trainingContinuity = buildTrainingContinuity(events);
  const updatedAt = latestEventTime(events) || now;

  return {
    schemaVersion: SCHEMA_VERSION,
    userId: sanitizeText(userId, "anonymous", 80),
    growthProfileId: `lmg_${sanitizeId(userId) || "anonymous"}`,
    highFrequencyThoughts,
    repeatedBehaviors,
    affectedDimensions: buildAffectedDimensions(events),
    trainingContinuity,
    mirrorLifeStage: resolveMirrorLifeStage(events.length),
    nextCycleFocus: buildNextCycleFocus(events, topBehaviorLoops),
    dataGaps: buildDataGaps(records),
    topBehaviorLoops,
    zhixingStability: buildZhixingStability(events, now),
    sourceSummary: {
      klineRecords: klineRecords.length,
      tradeReviews: tradeReviews.length,
      oneThoughtEvents: events.filter((event) => event.hasOneThoughtEvent).length,
      mirrorReport: Boolean(records.mirror_report)
    },
    updatedAt,
    complianceNotice: COMPLIANCE_NOTICE
  };
}

function normalizeGrowthEvents(records) {
  return records
    .map((record) => {
      const event = record?.one_thought_event || record?.oneThoughtEvent || {};
      const thought = sanitizeText(event.thought || event.firstThought || event.reaction || record?.reaction, "");
      const behavior = sanitizeText(event.reaction || event.reactionChoice || record?.reaction || record?.reaction_key, "");
      if (!thought && !behavior) return null;

      return {
        thought: thought || behavior,
        behavior: behavior || thought,
        boundaryState: sanitizeText(
          event.boundary_state || event.boundaryState || record?.discipline_action || record?.disciplineAction,
          "待记录边界"
        ),
        mirrorType: sanitizeText(event.mirror_type || event.mirrorType || record?.mirror_type || record?.mirrorType, "待观察之镜"),
        recordedAt: record?.recorded_at || record?.recordedAt || event.created_at || event.createdAt || "",
        hasOneThoughtEvent: Boolean(record?.one_thought_event || record?.oneThoughtEvent)
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime());
}

function buildAffectedDimensions(events) {
  const dimensions = [
    ["boundary", "边界稳定", events.filter((event) => event.boundaryState && event.boundaryState !== "待记录边界").length],
    ["emotion", "情绪反应", events.filter((event) => /急|怕|慌|冲动|犹豫/.test(`${event.thought} ${event.behavior}`)).length],
    ["review", "复盘完成", 0],
    ["discipline", "纪律动作", events.filter((event) => /停|记录|复盘|边界/.test(event.boundaryState)).length]
  ];

  return dimensions
    .filter(([, , count]) => count > 0)
    .map(([key, label, evidenceCount]) => ({ key, label, evidenceCount }));
}

function buildTrainingContinuity(events) {
  const days = new Set(events.map((event) => String(event.recordedAt || "").slice(0, 10)).filter(Boolean));
  const totalEvents = events.length;
  return {
    totalEvents,
    activeDays: days.size,
    latestRecordedAt: latestEventTime(events),
    level: totalEvents >= 5 ? "steady" : totalEvents > 0 ? "started" : "none"
  };
}

function buildNextCycleFocus(events, loops) {
  if (!events.length) {
    return {
      title: "先照见一念",
      action: "记录下一次训练中的第一念",
      reason: "当前 server 还没有足够训练事实。"
    };
  }

  const loop = loops[0]?.label || events.at(-1)?.behavior || "当前反应";
  return {
    title: "复盘重复反应",
    action: `围绕「${loop}」完成一次轻复盘`,
    reason: "先把重复反应写清楚，再进入下一轮训练。"
  };
}

function buildDataGaps(records) {
  return DATA_GAP_DEFINITIONS
    .filter(([key]) => !records[key])
    .map(([key, label]) => ({ key, label }));
}

function buildZhixingStability(events, now) {
  const continuity = buildTrainingContinuity(events);
  const boundaryCount = events.filter((event) => /停|记录|复盘|边界/.test(event.boundaryState)).length;
  const repeatedCount = topCountedValues(events.map((event) => event.behavior), "label").filter((item) => item.count > 1).length;
  const level = continuity.totalEvents >= 5 ? "stable" : continuity.totalEvents > 0 ? "warming" : "unknown";

  return {
    totalText: continuity.totalEvents ? `${continuity.totalEvents} 条训练事实` : "暂无训练事实",
    level,
    summary: continuity.totalEvents ? "已形成可观察的训练轨迹。" : "等待更多训练与复盘事实。",
    dimensions: [
      { key: "continuity", label: "连续记录", value: continuity.activeDays },
      { key: "boundary", label: "边界动作", value: boundaryCount },
      { key: "repetition", label: "重复反应", value: repeatedCount }
    ],
    updatedAt: now
  };
}

function topCountedValues(values, fieldName) {
  const counts = new Map();
  for (const value of values.map((item) => sanitizeText(item, "")).filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .slice(0, 5)
    .map(([value, count]) => ({ [fieldName]: value, count }));
}

function latestBoundaryFor(events, behavior) {
  return [...events].reverse().find((event) => event.behavior === behavior)?.boundaryState || "待记录边界";
}

function latestEventTime(events) {
  return [...events].reverse().find((event) => event.recordedAt)?.recordedAt || "";
}

function resolveMirrorLifeStage(count) {
  if (count >= 5) return "rooted";
  if (count >= 2) return "sprout";
  return "seed";
}

function sanitizeId(value) {
  return String(value || "")
    .replace(/1[3-9]\d{9}/g, "hidden")
    .replace(/[^\w-]/g, "_")
    .slice(0, 64);
}

function sanitizeText(value, fallback, maxLength = 120) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw
    .replace(/1[3-9]\d{9}/g, "[已隐藏]")
    .replace(/\b(openid|unionid|token|code)\b\s*[:=]?\s*[\w-]*/gi, "[已隐藏]")
    .replace(/买入|卖出|荐股|喊单|预测|收益保证|必赚|稳赚|信号|抄底|逃顶|推荐/g, "训练提示")
    .slice(0, maxLength);
}
