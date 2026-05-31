const { getAssessmentResult, updateProfile, saveMindProfile } = require("../../utils/store");
const { getPersonalityArchive } = require("../../modules/personality/index");
const { getPersonalityStagePlan } = require("../../core/personality-stage-map");

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

Page({
  data: {
    hasResult: false,
    result: {},
    reportBlocks: [],
    coreOutputs: [],
    path: [],
    archive: null,
    stagePlan: null
  },

  onShow() {
    const result = getAssessmentResult();
    if (!result) {
      this.setData({ hasResult: false, result: {}, reportBlocks: [], path: [], archive: null, stagePlan: null });
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
      reportBlocks: buildReportBlocks(result.primary)
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
    wx.showToast({ title: "心证已收藏", icon: "success" });
  },

  goIndex() {
    wx.redirectTo({ url: "/pages/zhixing-index/index" });
  },

  goStages() {
    wx.navigateTo({ url: "/pages/stages/index" });
  }
});
