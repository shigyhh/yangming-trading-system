const {
  getAssessmentResult,
  getAssessmentHistory,
  getTraining7State,
  getReviews,
  getZhixingScoreState,
  getRetestSnapshotState,
  getKlineReviewReports,
  getUserBinding,
  updateProfile,
  saveMindProfile,
  formatRiskLevel
} = require("../../utils/store");
const { COMPLIANCE_TEXT, getMirrorBinding } = require("../../utils/content");
const { getPersonalityArchive } = require("../../modules/personality/index");
const { TRAINING_7_DAYS } = require("../../modules/training7/index");
const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { buildSevenDayChange } = require("../../modules/retest-change/index");
const { promptShareMoment } = require("../../utils/share-moments");
const { syncAssessmentReport } = require("../../utils/api");
const { buildKlineChange, buildKlineDayRetestComparison, getKlineRecommendationForMirror } = require("../../modules/kline-simulator/index");

function buildReportBlocks(type) {
  const archive = getPersonalityArchive(type);
  const plan = getPersonalityStagePlan(type);
  return [
    { title: "人格画像", content: archive.portrait },
    { title: "典型习气", content: archive.habit },
    { title: "惯性偏差", content: archive.scene },
    { title: "账户代价", content: plan.cost },
    { title: "当前主修关卡", content: plan.stageName },
    { title: "当前心贼", content: plan.heartThief },
    { title: "主修原因", content: plan.stageReason },
    { title: "今日戒律", content: plan.commandment },
    { title: "今日事上练", content: plan.training }
  ];
}

function buildRetestChange(history, result) {
  return buildSevenDayChange({
    assessmentHistory: history,
    assessment: result,
    training7State: getTraining7State(),
    reviews: getReviews(),
    zhixingScoreState: getZhixingScoreState(),
    retestSnapshots: getRetestSnapshotState()
  });
}

function buildMiniReport(result, archive, stagePlan) {
  const primary = (result || {}).primary || "未建档";
  const secondary = (result || {}).secondary || "待照见";
  const primaryMirror = (result || {}).primaryMirror || getMirrorBinding(primary).mirrorName;
  const heartMirror = (result || {}).primaryHeartMirror || getMirrorBinding(primary).heartMirrorName;
  const heartThieves = (result || {}).primaryThieves || getMirrorBinding(primary).thieves || [];
  const radar = buildRadarRows(result, primary, secondary);
  return {
    oneLine: (archive || {}).portrait || "这份报告只用于照见反应模式，完整报告请回网站查看。",
    primary,
    secondary,
    primaryMirror,
    heartMirror,
    heartThieves,
    heartThievesText: heartThieves.length ? heartThieves.join("、") : ((result || {}).virtuePractice || "知止、守心、执行"),
    mirrorLine: `${primaryMirror} · ${heartMirror}`,
    radar,
    modeLines: buildModeLines(primary, secondary),
    dangerScenarios: buildDangerScenarios(primary, secondary),
    trigger: (archive || {}).scene || "交易中的情绪触发、念头变化和计划偏离。",
    prescription: TRAINING_7_DAYS.map((day) => ({ day: day.day, title: day.title })),
    todayAction: (stagePlan || {}).training || (archive || {}).dailyAction || "今日只完成一次真实记录。",
    klineCalibration: "建议先完成一次 K线压力测试，再进入 7 天观心训练，让问卷倾向被真实反应校准。",
    compliance: COMPLIANCE_TEXT
  };
}

function buildRadarRows(result, primary, secondary) {
  const computed = Array.isArray((result || {}).riskRadar) ? result.riskRadar : [];
  if (computed.length) {
    return computed.map((item) => {
      const value = Math.max(0, Math.min(100, Math.round(Number(item.value || 0))));
      return {
        key: item.key || item.label,
        label: item.label,
        value,
        displayValue: formatRiskLevel(value, { hideLowScore: true }),
        level: radarLevel(value),
        description: item.description || "观察交易里的第一反应。"
      };
    });
  }
  const fallback = [
    { key: "entryImpulse", label: "入场冲动", value: primary === "冲动型" || secondary === "冲动型" ? 82 : 42, description: "观察第一念是否先越过计划。" },
    { key: "boundary", label: "边界抗拒", value: primary === "扛单型" || secondary === "扛单型" ? 78 : 44, description: "观察边界触碰后是否继续解释。" },
    { key: "proving", label: "证明执念", value: primary === "偏执型" || secondary === "赌徒型" ? 76 : 40, description: "观察动作是否服务于证明自己。" },
    { key: "execution", label: "执行断裂", value: primary === "拖延型" || secondary === "完美型" ? 74 : 38, description: "观察知与行之间是否断开。" }
  ];
  return fallback.map((item) => Object.assign({}, item, {
    displayValue: formatRiskLevel(item.value, { hideLowScore: true }),
    level: radarLevel(item.value)
  }));
}

function radarLevel(value) {
  if (value >= 75) return "重点照见";
  if (value >= 55) return "需要训练";
  if (value >= 35) return "持续观察";
  return "相对稳定";
}

function buildEvidenceChain({ result, klineReports, training7State, retestChange }) {
  const assessment = result || {};
  const kline = (klineReports || {}).latest || null;
  const trainingRecords = (training7State || {}).records || {};
  const completedDays = Object.keys(trainingRecords).filter((key) => {
    const item = trainingRecords[key] || {};
    return item.completed || item.checkedIn || item.finishedAt;
  }).length;
  const behaviorNotes = ((assessment.behaviorAdjustment || {}).notes || []).slice(0, 2).join("；");
  return [
    {
      source: "问卷倾向",
      weight: "40%",
      title: assessment.assessmentModeLabel || "九型照见",
      detail: assessment.questionnairePrimary
        ? `问卷主倾向为「${assessment.questionnairePrimary}」，当前综合显现为「${assessment.primary || "待照见"}」。`
        : "完成测评后生成问卷倾向。"
    },
    {
      source: "K线反应",
      weight: "35%",
      title: kline ? `${kline.marketLabel || "市场"} · ${kline.timeframeLabel || "周期"}` : "待完成压力测试",
      detail: kline
        ? `第一反应：${kline.primaryReaction || "待照见"}；第一念：${kline.firstThought || "未记录"}；反应之镜：${kline.relatedMirror || "待照见"}。`
        : "进入 K线压力测试后，这里会记录真实历史切片里的第一反应。"
    },
    {
      source: "每日训练",
      weight: "15%",
      title: `${completedDays}/7 天`,
      detail: behaviorNotes || "完成三印、开盘照心、收盘省察后，系统会把近期行为纳入校准。"
    },
    {
      source: "复测变化",
      weight: "10%",
      title: (retestChange || {}).title || "待复测",
      detail: (retestChange || {}).detail || "完成 7 天训练或再次照见后，生成变化对比。"
    }
  ];
}

function buildModeLines(primary, secondary) {
  const map = {
    "冲动型": "行情越快，你越容易把速度当成机会，训练重点是先停十秒。",
    "扛单型": "边界越近，你越容易继续解释，训练重点是回到盘前写下的一界。",
    "完美型": "条件越不完整，你越想等待完美，训练重点是用小步验证完成知行。",
    "赌徒型": "越不顺，你越想立刻拉回状态，训练重点是识别那一口不甘。",
    "从众型": "外部声音越一致，你越容易动摇，训练重点是回到自己的证据。",
    "偏执型": "事实越挑战原判断，你越想证明自己，训练重点是主动写下反向证据。",
    "拖延型": "越需要复盘，你越容易推到之后，训练重点是三分钟先落笔。",
    "焦虑型": "波动越大，你越想反复确认，训练重点是守住固定观察窗口。",
    "平衡型": "稳定越久，越要保留每日小记录，让清明不变成松懈。"
  };
  return [primary, secondary, "平衡型"]
    .filter(Boolean)
    .map((type) => map[type])
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
}

function buildDangerScenarios(primary, secondary) {
  const map = {
    "冲动型": "盘面突然变快，心里出现怕错过的一念。",
    "扛单型": "边界被触碰，内心开始替自己找新的解释。",
    "完美型": "条件不完整，迟迟等不到心里认为的完美点。",
    "赌徒型": "连续不顺后，想立刻把状态拉回来。",
    "从众型": "外部观点很一致，自己的计划开始动摇。",
    "偏执型": "事实不符合预想，却仍想证明原判断。",
    "拖延型": "该记录、复盘、执行时，心里想之后再说。",
    "焦虑型": "空仓或波动放大时，急着寻找安心感。",
    "平衡型": "连续稳定后，容易轻视每日记录。"
  };
  return [primary, secondary, "平衡型"]
    .filter(Boolean)
    .map((type) => map[type])
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
}

Page({
  data: {
    hasResult: false,
    result: {},
    reportBlocks: [],
    coreOutputs: [],
    evidenceChain: [],
    path: [],
    archive: null,
    stagePlan: null,
    userBinding: getUserBinding(),
    assessmentHistory: [],
    retestChange: buildRetestChange([], null),
    klineChange: buildKlineChange(getKlineReviewReports()),
    klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
    klineRecommendation: getKlineRecommendationForMirror(""),
    miniReport: buildMiniReport(null, null, null)
  },

  onShow() {
    const result = getAssessmentResult();
    const userBinding = getUserBinding();
    const assessmentHistory = getAssessmentHistory();
    if (!result) {
      this.setData({
        hasResult: false,
        result: {},
        reportBlocks: [],
        evidenceChain: [],
        path: [],
        archive: null,
        stagePlan: null,
        userBinding,
        assessmentHistory,
        retestChange: buildRetestChange(assessmentHistory, null),
        klineChange: buildKlineChange(getKlineReviewReports()),
        klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
        klineRecommendation: getKlineRecommendationForMirror(""),
        miniReport: buildMiniReport(null, null, null)
      });
      return;
    }
    const archive = getPersonalityArchive(result.primary);
    const stagePlan = getPersonalityStagePlan(result.primary);
    const coreOutputs = [
      { label: "当前人格", value: result.primary },
      { label: "当前心贼", value: stagePlan.heartThief },
      { label: "当前主修关卡", value: stagePlan.stageName },
      { label: "今日戒律", value: stagePlan.commandment },
      { label: "今日事上练", value: stagePlan.training }
    ];
    saveMindProfile({
      personality_type: result.primary,
      current_stage: stagePlan.stageName,
      current_stage_key: stagePlan.stageKey,
      heart_thief: stagePlan.heartThief,
      today_training: stagePlan.training,
      today_commandment: stagePlan.commandment
    });

    const klineReports = getKlineReviewReports();
    const training7State = getTraining7State();
    const retestChange = buildRetestChange(assessmentHistory, result);
    const klineChange = buildKlineChange(klineReports);
    const klineDayRetest = buildKlineDayRetestComparison(klineReports);
    const klineRecommendation = getKlineRecommendationForMirror(result.primaryMirror || result.primary);

    this.setData({
      hasResult: true,
      result,
      path: result.path || [],
      archive,
      stagePlan,
      coreOutputs,
      reportBlocks: buildReportBlocks(result.primary),
      userBinding,
      assessmentHistory,
      evidenceChain: buildEvidenceChain({ result, klineReports, training7State, retestChange }),
      retestChange,
      klineChange,
      klineDayRetest,
      klineRecommendation,
      miniReport: buildMiniReport(result, archive, stagePlan)
    });
  },

  goAssessment() {
    wx.redirectTo({ url: "/pages/assessment/index" });
  },

  goTraining() {
    wx.redirectTo({ url: "/pages/training/index" });
  },

  goKlineSimulator() {
    const recommendation = this.data.klineRecommendation || {};
    wx.navigateTo({ url: recommendation.path || "/pages/kline-simulator/index" });
  },

  goTradeReview() {
    wx.navigateTo({ url: "/pages/trade-review/index" });
  },

  saveReport() {
    updateProfile({
      reportSavedAt: Date.now(),
      personalityArchive: this.data.result.primary,
      currentStage: this.data.stagePlan && this.data.stagePlan.stageName,
      heartThief: this.data.stagePlan && this.data.stagePlan.heartThief,
      stage: "照见"
    });
    syncAssessmentReport(this.data.result).catch(() => {});
    wx.showToast({ title: "心证已收藏", icon: "success" });
    const momentKey = this.data.assessmentHistory.length >= 2 ? "retest_change_ready" : "assessment_completed";
    promptShareMoment(momentKey, { sourceScene: momentKey });
  },

  goIndex() {
    wx.redirectTo({ url: "/pages/zhixing-index/index" });
  },

  goStages() {
    wx.navigateTo({ url: "/pages/stages/index" });
  },

  goShareCard(e) {
    const type = e.currentTarget.dataset.type || "personality";
    const sceneMap = {
      risk_radar: "risk_radar_seen",
      personality_mirror: "personality_mirror",
      group_practice: "group_practice",
      personality: "assessment_completed"
    };
    const sourceScene = sceneMap[type] || "assessment_completed";
    wx.navigateTo({ url: `/pages/share-card/index?type=${type}&sourceScene=${sourceScene}` });
  }
});
