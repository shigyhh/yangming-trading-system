const {
  getTodayReview,
  saveTodayReview,
  getProfile,
  updateProfile,
  getTodayMind,
  getAssessmentResult,
  getTodayTraining,
  getZhixingScoreState,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncLocalState } = require("../../utils/api");
const { buildAiReflection, buildAiReplay } = require("../../modules/review/index");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");

const REVIEW_FIELDS = [
  { key: "traded", label: "今日是否交易" },
  { key: "inSystem", label: "是否系统内" },
  { key: "chased", label: "是否追高" },
  { key: "held", label: "是否扛单" },
  { key: "changedPlan", label: "是否临盘改计划" },
  { key: "executedStop", label: "是否知行合一止损" },
  { key: "revenge", label: "是否报复性交易" }
];

const DEFAULT_FORM = {
  traded: false,
  inSystem: true,
  chased: false,
  held: false,
  changedPlan: false,
  executedStop: true,
  revenge: false,
  emotion: "平静",
  score: 78,
  correction: ""
};

function buildFieldViews(form) {
  return REVIEW_FIELDS.map((item) => Object.assign({}, item, { value: !!form[item.key] }));
}

function suggestScore(form) {
  let score = 72;
  if (form.traded) score += 3;
  if (form.inSystem) score += 12;
  if (form.executedStop) score += 8;
  if (form.chased) score -= 12;
  if (form.held) score -= 12;
  if (form.changedPlan) score -= 10;
  if (form.revenge) score -= 16;
  if (form.emotion === "急躁" || form.emotion === "焦虑") score -= 5;
  if (form.emotion === "平静") score += 5;
  return Math.max(20, Math.min(98, score));
}

Page({
  data: {
    form: DEFAULT_FORM,
    fields: buildFieldViews(DEFAULT_FORM),
    emotions: ["平静", "急躁", "焦虑", "贪念", "恐惧", "麻木"],
    aiReflection: buildAiReflection(DEFAULT_FORM, {}),
    aiReplay: buildAiReplay(DEFAULT_FORM, {}),
    saved: false
  },

  onShow() {
    const saved = getTodayReview();
    const form = Object.assign({}, DEFAULT_FORM, saved || {});
    this.refreshForm(form, { saved: !!saved });
  },

  refreshForm(form, extra) {
    const mind = getTodayMind();
    const assessment = getAssessmentResult();
    const training = getTodayTraining();
    const aiReflection = buildAiReflection(form, { mind, assessment });
    this.setData(Object.assign({
      form,
      fields: buildFieldViews(form),
      aiReflection,
      aiReplay: buildAiReplay(form, { mind, assessment, training, reflection: aiReflection })
    }, extra || {}));
  },

  setBoolean(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.currentTarget.dataset.value === "true";
    const form = Object.assign({}, this.data.form, { [key]: value });
    form.score = suggestScore(form);
    this.refreshForm(form);
  },

  selectEmotion(e) {
    const emotion = e.currentTarget.dataset.emotion;
    const form = Object.assign({}, this.data.form, { emotion });
    form.score = suggestScore(form);
    this.refreshForm(form);
  },

  changeScore(e) {
    const form = Object.assign({}, this.data.form, { score: e.detail.value });
    this.refreshForm(form);
  },

  inputCorrection(e) {
    const form = Object.assign({}, this.data.form, { correction: e.detail.value });
    this.refreshForm(form);
  },

  saveReview() {
    const correction = (this.data.form.correction || "").trim();
    if (!correction) {
      wx.showToast({ title: "写下明日修正动作", icon: "none" });
      return;
    }

    const alreadySaved = !!getTodayReview();
    const savedReview = saveTodayReview(Object.assign({}, this.data.form, {
      correction,
      aiReflection: this.data.aiReflection,
      aiReplay: this.data.aiReplay
    }));
    if (!alreadySaved) {
      const profile = getProfile();
      updateProfile({
        points: Number(profile.points || 0) + 12,
        stage: "省察克治"
      });
    }
    saveDailyLoopState(buildDailyLoopState({
      todayKey: todayKey(),
      profile: getProfile(),
      mind: getTodayMind(),
      assessment: getAssessmentResult(),
      training: getTodayTraining(),
      todayReview: savedReview,
      zhixingScoreState: getZhixingScoreState(),
      heartCardRecord: getTodayHeartCard()
    }));
    wx.showToast({ title: "省察已保存", icon: "success" });
    syncLocalState({ silent: true }).catch(() => {});
    this.setData({ saved: true });
    setTimeout(() => {
      wx.redirectTo({ url: "/pages/zhixing-index/index" });
    }, 420);
  },

  copySummary() {
    const form = this.data.form;
    const ai = this.data.aiReflection;
    const summary = [
      "阳明心学交易省察",
      `情绪：${form.emotion}`,
      `知行合一分数：${form.score}`,
      `今日心贼：${ai.heartThief}`,
      `省察：${ai.root}`,
      `追问：${ai.question}`,
      `心证结论：${this.data.aiReplay.deviation}`,
      `系统内：${form.inSystem ? "是" : "否"}`,
      `追高：${form.chased ? "是" : "否"}`,
      `扛单：${form.held ? "是" : "否"}`,
      `临盘改计划：${form.changedPlan ? "是" : "否"}`,
      `明日事上练：${ai.practice}`
    ].join("\n");

    wx.setClipboardData({
      data: summary,
      success: () => wx.showToast({ title: "省察已复制", icon: "success" })
    });
  },

  goTraining() {
    wx.redirectTo({ url: "/pages/training/index" });
  }
});
