const {
  getAssessmentResult,
  getAssessmentHistory,
  getTraining7State,
  getReviews,
  getZhixingScoreState,
  getRetestSnapshotState,
  getUserBinding,
  updateProfile,
  saveMindProfile
} = require("../../utils/store");
const { COMPLIANCE_TEXT } = require("../../utils/content");
const { getPersonalityArchive } = require("../../modules/personality/index");
const { TRAINING_7_DAYS } = require("../../modules/training7/index");
const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { buildSevenDayChange } = require("../../modules/retest-change/index");
const { promptShareMoment } = require("../../utils/share-moments");
const { syncAssessmentReport } = require("../../utils/api");

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
  const radar = [
    { label: "入场冲动", level: primary === "冲动型" || secondary === "冲动型" ? "偏高" : "观察" },
    { label: "边界抗拒", level: primary === "扛单型" || secondary === "扛单型" ? "偏高" : "观察" },
    { label: "情绪补偿", level: primary === "赌徒型" || secondary === "赌徒型" ? "偏高" : "观察" },
    { label: "计划执行", level: primary === "拖延型" || secondary === "拖延型" ? "需训练" : "持续练" }
  ];
  return {
    oneLine: (archive || {}).portrait || "这份报告只用于照见反应模式，完整报告请回网站查看。",
    primary,
    secondary,
    radar,
    trigger: (archive || {}).scene || "交易中的情绪触发、念头变化和计划偏离。",
    prescription: TRAINING_7_DAYS.map((day) => ({ day: day.day, title: day.title })),
    todayAction: (stagePlan || {}).training || (archive || {}).dailyAction || "今日只完成一次真实记录。",
    compliance: COMPLIANCE_TEXT
  };
}

Page({
  data: {
    hasResult: false,
    result: {},
    reportBlocks: [],
    coreOutputs: [],
    path: [],
    archive: null,
    stagePlan: null,
    userBinding: getUserBinding(),
    assessmentHistory: [],
    retestChange: buildRetestChange([], null),
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
        path: [],
        archive: null,
        stagePlan: null,
        userBinding,
        assessmentHistory,
        retestChange: buildRetestChange(assessmentHistory, null),
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
      retestChange: buildRetestChange(assessmentHistory, result),
      miniReport: buildMiniReport(result, archive, stagePlan)
    });
  },

  goAssessment() {
    wx.redirectTo({ url: "/pages/assessment/index" });
  },

  goTraining() {
    wx.redirectTo({ url: "/pages/training/index" });
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
