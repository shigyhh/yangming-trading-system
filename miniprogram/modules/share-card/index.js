const SHARE_CARD_TYPES = [
  "daily_mantra",
  "three_seals",
  "personality",
  "risk_radar",
  "kline_insight",
  "group_kline_mirror",
  "mirror_challenge",
  "impulse_delay",
  "zhixing_score",
  "seven_day_change",
  "retest_change",
  "boundary_guard",
  "personality_mirror",
  "group_practice",
  "membership_identity",
  "live_reservation",
  "companion_invite"
];

const TYPE_LABELS = {
  daily_mantra: "今日心证卡",
  three_seals: "三印卡",
  personality: "人格照见卡",
  risk_radar: "风险雷达卡",
  kline_insight: "一根 K 线照见卡",
  group_kline_mirror: "群体 K线镜像卡",
  mirror_challenge: "同修镜像卡",
  impulse_delay: "冲动延迟卡",
  zhixing_score: "知行指数卡",
  seven_day_change: "七日变化卡",
  retest_change: "复测变化卡",
  boundary_guard: "守界卡",
  personality_mirror: "同修镜像卡",
  group_practice: "群内共修卡",
  membership_identity: "同修身份证明",
  live_reservation: "事上练课卡",
  companion_invite: "同修邀请卡"
};

const DEFAULT_COMPLIANCE = "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。";

function normalizeType(type) {
  return SHARE_CARD_TYPES.includes(type) ? type : "daily_mantra";
}

function buildMetric(label, value, trend) {
  return {
    label,
    value: String(value || "待照见"),
    trend: trend || ""
  };
}

function getDimensionScore(index, key) {
  const dimensions = (index || {}).dimensions || [];
  const item = dimensions.find((dimension) => dimension.key === key || dimension.name === key);
  return item ? item.score : "待生成";
}

function buildShareCardPreview(type, context = {}) {
  const safeType = normalizeType(type);
  const daily = context.dailyContent || {};
  const trainingDay = (context.training7View || {}).today || {};
  const threeSeals = context.threeSeals || {};
  const assessment = context.assessment || {};
  const index = context.zhixingIndex || ((context.zhixingScoreState || {}).latest || {});
  const inviteCode = context.inviteCode || "";
  const lesson = context.lesson || {};
  const boundaryRecord = context.boundaryRecord || {};
  const openingCheck = context.openingCheck || {};
  const retestChange = context.retestChange || {};
  const companionMirror = (context.companionMirror || {}).latest || context.companionMirror || {};
  const groupPractice = context.groupPractice || {};
  const subscription = context.subscriptionView || {};
  const klineReview = ((context.klineReviewReports || {}).latest) || {};
  const mirrorChallenge = ((context.klineMirrorChallenges || {}).latest) || {};
  const subscriptionProof = subscription.proof || {};
  const groupDayStats = (groupPractice.dayStats || {})[trainingDay.day || 1] || {};
  const radar = assessment.radar || {};
  const riskRadar = Array.isArray(assessment.riskRadar) ? assessment.riskRadar : [];
  const title = TYPE_LABELS[safeType];

  const templates = {
    daily_mantra: {
      headline: daily.heartProof || trainingDay.mantra || "真正的事上练，是边界到了能知行合一。",
      body: trainingDay.reflectionQuestion || daily.reflectionQuestion || "行情触碰边界时，我是在执行计划，还是在证明自己？",
      insight: "今天这句话，有点照到我了。",
      cta: "生成今日心证卡",
      shareTitle: "今日心证：先照见自己，再进入事上练心。"
    },
    three_seals: {
      headline: "我的今日三印",
      body: `一念：${threeSeals.thought || "待记录"}\n一惧：${threeSeals.fear || "待记录"}\n一界：${threeSeals.boundary || "待记录"}`,
      insight: "今天先不急着看外物，先看见自己的这一念。",
      cta: "发给一位同修",
      shareTitle: "今天先看见这一念。"
    },
    personality: {
      headline: `我的交易人格：${assessment.primary || "待照见"} · ${assessment.primaryMirror || "九镜待照见"}`,
      body: `副人格：${assessment.secondary || "待照见"}\n心贼：${(assessment.primaryThieves || []).join("、") || assessment.virtuePractice || "待照见"}\n核心风险：${assessment.coreRisk || assessment.summary || "待网站报告同步"}`,
      insight: assessment.insight || "我照见了自己的交易人格。原来真正影响交易的，不只是外在波动。",
      cta: "生成我的照见卡",
      shareTitle: "我照见了自己的交易人格。"
    },
    risk_radar: {
      headline: "我的交易风险雷达",
      body: "这不是评价你，这是帮你看见交易里的惯性。",
      insight: assessment.riskInsight || "我最需要照见的时刻，是边界被触碰后的第一反应。",
      cta: "生成风险雷达卡",
      shareTitle: "这张雷达帮我看见了自己的反应惯性。",
      metrics: riskRadar.length ? riskRadar.slice(0, 5).map((item) => buildMetric(item.label, item.value || "待照见")) : [
        buildMetric("追涨冲动", radar.chasing || assessment.impulse || 82),
        buildMetric("止损抗拒", radar.stopResistance || assessment.boundary || 76),
        buildMetric("亏损后证明欲", radar.proving || assessment.proving || 88),
        buildMetric("计划执行断裂", radar.executionBreak || assessment.execution || 64),
        buildMetric("盈利后失控", radar.euphoria || assessment.euphoria || 58)
      ]
    },
    kline_insight: {
      headline: "一根 K 线照见我",
      body: `这段 K 线出现时，我的第一反应是：${klineReview.primaryReaction || "待完成压力测试"}。\n第一念：${klineReview.firstThought || "待记录"}`,
      insight: klineReview.insight || "照见的不是走势，而是我被触发的第一念。",
      cta: "生成 K线照见卡",
      shareTitle: "一根 K线照见了我的第一反应。",
      metrics: [
        buildMetric("反应之镜", klineReview.relatedMirror || "待照见"),
        buildMetric("心贼", (klineReview.heartThieves || []).join("、") || "待照见"),
        buildMetric("守界度", klineReview.scores ? klineReview.scores.boundaryKeeping : "待生成")
      ]
    },
    group_kline_mirror: {
      headline: "这一段 K 线，照见一群人的第一念",
      body: ((klineReview.anonymousStats || {}).title) || "同一段历史片段里，每个人被触发的念头并不相同。",
      insight: ((klineReview.anonymousStats || {}).insight) || "这不是外在走势的比较，而是交易心理反应分布。",
      cta: "生成群体镜像卡",
      shareTitle: "同一段 K线，照见不同的人心。",
      metrics: (((klineReview.anonymousStats || {}).rows) || [
        { label: "想立刻行动", value: 42 },
        { label: "想继续等待", value: 27 },
        { label: "想放大动作", value: 18 },
        { label: "想离开屏幕", value: 13 }
      ]).map((item) => buildMetric(item.label, `${item.value}%`))
    },
    mirror_challenge: {
      headline: "同一段 K 线",
      body: `我：${mirrorChallenge.inviterReaction || "待照见"}\n同修：${mirrorChallenge.inviteeReaction || "待照见"}`,
      insight: mirrorChallenge.comparisonInsight || "我们面对的不是同一根 K 线，而是各自心里的念头。",
      cta: "生成同修镜像卡",
      shareTitle: "同一段 K线，照见两种反应。",
      metrics: [
        buildMetric("我的镜", mirrorChallenge.inviterMirror || "待照见"),
        buildMetric("同修镜", mirrorChallenge.inviteeMirror || "待照见")
      ]
    },
    impulse_delay: {
      headline: "冲动延迟卡",
      body: `本次反应时间：${klineReview.reactionTimeMs || "待生成"} ms`,
      insight: klineReview.scores && klineReview.scores.impulseDelay < 45
        ? "行情越快，我越容易把速度当成机会。"
        : "我正在练习让第一念慢下来。",
      cta: "生成冲动延迟卡",
      shareTitle: "我做了一次冲动延迟训练。",
      metrics: [
        buildMetric("冲动延迟度", klineReview.scores ? klineReview.scores.impulseDelay : "待生成"),
        buildMetric("反应之镜", klineReview.relatedMirror || "待照见")
      ]
    },
    zhixing_score: {
      headline: `今日知行指数：${index.total || "待生成"}`,
      body: "今天不是交易分数，是我有没有守住自己的分数。",
      insight: index.stateLabel || "我已经能看见冲动，但还要继续守住边界。",
      cta: "生成知行指数卡",
      shareTitle: "今天我校准了一次知行指数。",
      metrics: [
        buildMetric("照见度", getDimensionScore(index, "awareness")),
        buildMetric("守界度", getDimensionScore(index, "boundary")),
        buildMetric("执行度", getDimensionScore(index, "execution")),
        buildMetric("延迟度", getDimensionScore(index, "delay")),
        buildMetric("复盘度", getDimensionScore(index, "review")),
        buildMetric("稳定度", getDimensionScore(index, "stability")),
        buildMetric("人格校准度", getDimensionScore(index, "personalityCalibration"))
      ]
    },
    seven_day_change: {
      headline: "7 天观心变化",
      body: retestChange.detail || "练了 7 天，我发现变化不是来自外在判断，而是来自我开始看见自己。",
      insight: retestChange.insight || "我不是不会交易，我是以前太急着证明自己。",
      cta: "生成七日变化卡",
      shareTitle: "我的 7 天观心变化。",
      metrics: (retestChange.metrics || []).length
        ? retestChange.metrics.map((item) => buildMetric(item.label, item.value))
        : [
            buildMetric("入场冲动", "待完成 7 天"),
            buildMetric("止损抗拒", "待完成 7 天"),
            buildMetric("亏损后证明欲", "待完成 7 天"),
            buildMetric("计划执行力", "待完成 7 天"),
            buildMetric("复盘完成度", "待完成 7 天")
          ]
    },
    retest_change: {
      headline: retestChange.ready ? "复测变化已生成" : "复测变化待完成",
      body: retestChange.detail || "完成 7 天训练或再次照见后，这里会呈现风险雷达的本地对比。",
      insight: retestChange.insight || "你不是没有变化，你只是以前没有看见变化。",
      cta: "生成复测变化卡",
      shareTitle: "我的复测变化：开始看见自己的反应。",
      metrics: (retestChange.metrics || []).map((item) => buildMetric(item.label, item.value))
    },
    boundary_guard: {
      headline: "今日边界已立",
      body: `当前状态：${openingCheck.currentStatus || "待照心"}\n今日风险：${openingCheck.todayRisk || "待记录"}\n今日一界：${boundaryRecord.boundary || openingCheck.todayBoundary || "待立界"}`,
      insight: boundaryRecord.note || openingCheck.openingNote || "边界到了，先照见这一念，再选择知行合一。",
      cta: "生成守界卡",
      shareTitle: "今日边界已立，先守住这一界。"
    },
    personality_mirror: {
      headline: companionMirror.ready ? "同修镜像已生成" : "同修镜像照见",
      body: companionMirror.ready
        ? `我：${companionMirror.inviteePrimary || assessment.primary || "待照见"}\n同修：${companionMirror.inviterPrimary || "待照见"}\n${companionMirror.commonRisk || "共同风险待照见"}`
        : `我：${assessment.primary || "待照见"}\n同修：待照见\n共同风险：边界被触碰后，容易被情绪牵动。`,
      insight: companionMirror.insight || "我照见了自己的交易人格，你要不要也测一下，看看我们是不是同一种反应模式？",
      cta: "生成镜像卡",
      shareTitle: "看看我们是不是同一种交易反应模式。",
      metrics: [
        buildMetric("我的人格", companionMirror.inviteePrimary || assessment.primary || "待照见"),
        buildMetric("同修人格", companionMirror.inviterPrimary || "待完成测评"),
        buildMetric("镜像状态", companionMirror.ready ? "已生成" : "待同修照见")
      ]
    },
    group_practice: {
      headline: "7 日观心共修局",
      body: `今天主题：${trainingDay.title || "每日观心"}\n今日问题：${trainingDay.reflectionQuestion || "边界到了，你是在执行计划，还是在证明自己？"}`,
      insight: `已有 ${Number(groupDayStats.completedCount || 0)} 位同修完成今日照心，不聊外物，只照见自己。`,
      cta: "邀同修共修",
      shareTitle: "今晚一起做一次交易观心。",
      metrics: [
        buildMetric("共修周期", "7 天"),
        buildMetric("今日进度", `Day ${trainingDay.day || 1}`),
        buildMetric("共修人数", `${Number(groupPractice.memberCount || 1)} 位`),
        buildMetric("共修码", groupPractice.groupCode || inviteCode || "待生成")
      ]
    },
    membership_identity: {
      headline: subscriptionProof.identityName || "同修身份证明",
      body: `身份：${subscriptionProof.planName || "体验同修"}\n证明号：${subscriptionProof.proofNo || "待生成"}\n有效期：${subscriptionProof.validText || "待启用"}`,
      insight: `${subscriptionProof.ownerName || "修行者"} · ${subscriptionProof.phoneMask || "未绑定"}。这是一份修行身份，不代表任何交易结果。`,
      cta: "生成身份证明",
      shareTitle: "我的阳明心学交易系统同修身份证明。",
      metrics: [
        buildMetric("同修身份", subscriptionProof.planName || "体验同修"),
        buildMetric("修行节律", subscriptionProof.cadence || "每日照心"),
        buildMetric("同修码", subscriptionProof.inviteCode || inviteCode || "待生成")
      ]
    },
    live_reservation: {
      headline: lesson.title || "今晚事上练课",
      body: lesson.subtitle || "止损抗拒背后的控制感",
      insight: lesson.description || "这节课讲的不是技术，是亏损后那个不甘心的自己。",
      cta: lesson.watched ? "分享回放照见" : "预约观课",
      shareTitle: lesson.watched ? "这节事上练课照见了我的一念。" : "今晚一起做一次事上练课。",
      metrics: [
        buildMetric("内容类型", lesson.typeLabel || "直播"),
        buildMetric("开课时间", lesson.startTime || "20:30"),
        buildMetric("训练主题", lesson.relatedDay || "守住边界")
      ]
    },
    companion_invite: {
      headline: "我照见了自己的交易人格",
      body: "你也可以照见一下：到底是你在交易，还是情绪在替你交易？",
      insight: inviteCode ? `同修码：${inviteCode}` : "邀一位同修同行，不聊外物，只照见自己。",
      cta: "邀一位同修照见",
      shareTitle: "邀你一起照见交易里的自己。",
      metrics: [
        buildMetric("今日主题", trainingDay.title || "每日观心"),
        buildMetric("同修方式", "完成测评后同行训练"),
        buildMetric("承接状态", "助教摘要占位")
      ]
    }
  };

  return Object.assign({
    id: `${safeType}-${Date.now()}`,
    type: safeType,
    typeLabel: title,
    title,
    compliance: DEFAULT_COMPLIANCE,
    createdAt: Date.now()
  }, templates[safeType]);
}

function buildShareCardList(context = {}) {
  return SHARE_CARD_TYPES.map((type) => buildShareCardPreview(type, context));
}

module.exports = {
  DEFAULT_COMPLIANCE,
  SHARE_CARD_TYPES,
  TYPE_LABELS,
  buildShareCardPreview,
  buildShareCardList,
  normalizeType
};
