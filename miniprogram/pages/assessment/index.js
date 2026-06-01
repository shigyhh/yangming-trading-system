const { ASSESSMENT_MODES, OPTIONS, getAssessmentMode, getAssessmentQuestions } = require("../../utils/content");
const { buildBehaviorContextFromState, computeAssessment } = require("../../utils/assessment");
const {
  getProfile,
  getAssessmentHistory,
  getAssessmentAnswers,
  saveAssessmentAnswers,
  saveAssessmentResult,
  getTodayMind,
  getTodayTraining,
  getTodayReview,
  getReviews,
  getMindRecords,
  getKlineMindRecords,
  getReactionRecords,
  getZhixingScoreState,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncLocalState, syncAssessmentReport } = require("../../utils/api");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");
const { promptShareMoment } = require("../../utils/share-moments");

const DEFAULT_MODE_KEY = "9";

function buildSelectedBoundaryInsight(question, selectedValue) {
  if (!question) return "先完成这一题，再看见当前边界。";
  if (selectedValue < 0) return "选择后，这里会照见你当下最需要守住的一界。";
  const base = question.boundaryInsight || "先看见触发，再选择训练动作。";
  const valueMap = {
    0: "这一念暂时不明显。下一步观察：你是否会因过度谨慎，错过计划内的稳定动作。",
    1: "这一念偶尔出现。先在触发处留一息，把它记录成可训练的材料。",
    2: "这一念已经经常显现。今日训练重点是边界前十秒，不急着解释。",
    3: "这一念很像当前主反应。先别急着为它找理由，写下触发、边界与复盘依据。"
  };
  return `${valueMap[selectedValue] || valueMap[0]} ${base}`;
}

Page({
  data: {
    modes: ASSESSMENT_MODES,
    modeKey: DEFAULT_MODE_KEY,
    modeInfo: getAssessmentMode(DEFAULT_MODE_KEY),
    questions: getAssessmentQuestions(DEFAULT_MODE_KEY),
    bankSource: "本地 3600 题库",
    bankReady: true,
    currentIndex: 0,
    currentQuestion: {},
    options: OPTIONS,
    selectedValue: -1,
    selectedBoundaryInsight: "选择后，这里会照见你当下最需要守住的一界。",
    answers: [],
    progress: 0,
    answeredCount: 0,
    isLast: false,
    behaviorPreview: buildBehaviorContextFromState({})
  },

  onLoad() {
    const modeKey = DEFAULT_MODE_KEY;
    const questions = getAssessmentQuestions(modeKey);
    const answers = getAssessmentAnswers(modeKey);
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const firstUnanswered = questions.findIndex((_, index) => typeof safeAnswers[index] !== "number");
    this.setData({
      modeKey,
      modeInfo: getAssessmentMode(modeKey),
      questions,
      answers: safeAnswers,
      currentIndex: firstUnanswered >= 0 ? firstUnanswered : questions.length - 1,
      behaviorPreview: this.buildBehaviorPreview()
    }, this.syncQuestion);
  },

  onShow() {
    this.setData({ behaviorPreview: this.buildBehaviorPreview() });
    this.syncQuestion();
  },

  syncQuestion() {
    const index = this.data.currentIndex;
    const answers = this.data.answers || [];
    const selected = typeof answers[index] === "number" ? answers[index] : -1;
    const answeredCount = answers.filter((item) => typeof item === "number").length;
    const questions = this.data.questions || [];

    this.setData({
      currentQuestion: Object.assign({ no: index + 1 }, questions[index]),
      selectedValue: selected,
      selectedBoundaryInsight: buildSelectedBoundaryInsight(questions[index], selected),
      progress: Math.round(((index + 1) / questions.length) * 100),
      answeredCount,
      isLast: index === questions.length - 1
    });
  },

  buildBehaviorPreview() {
    return buildBehaviorContextFromState({
      profile: getProfile(),
      assessmentHistory: getAssessmentHistory(),
      reviews: getReviews(),
      mindRecords: getMindRecords(),
      klineMindRecords: getKlineMindRecords(),
      reactionRecords: getReactionRecords()
    });
  },

  selectMode(e) {
    const modeKey = e.currentTarget.dataset.mode;
    if (!modeKey || modeKey === this.data.modeKey) return;
    const questions = getAssessmentQuestions(modeKey);
    const answers = getAssessmentAnswers(modeKey);
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const firstUnanswered = questions.findIndex((_, index) => typeof safeAnswers[index] !== "number");

    this.setData({
      modeKey,
      modeInfo: getAssessmentMode(modeKey),
      questions,
      answers: safeAnswers,
      currentIndex: firstUnanswered >= 0 ? firstUnanswered : 0,
      selectedValue: -1,
      selectedBoundaryInsight: "选择后，这里会照见你当下最需要守住的一界。"
    }, this.syncQuestion);
  },

  selectOption(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({
      selectedValue: value,
      selectedBoundaryInsight: buildSelectedBoundaryInsight(this.data.currentQuestion, value)
    });
  },

  next() {
    if (!this.data.bankReady) {
      wx.showToast({ title: "请先连接后端题库", icon: "none" });
      return;
    }
    if (this.data.selectedValue < 0) {
      wx.showToast({ title: "先选一个真实状态", icon: "none" });
      return;
    }

    const answers = this.data.answers.slice();
    answers[this.data.currentIndex] = this.data.selectedValue;
    saveAssessmentAnswers(answers, this.data.modeKey);

    if (this.data.isLast) {
      const result = computeAssessment(answers, {
        modeKey: this.data.modeKey,
        questions: this.data.questions,
        behaviorContext: this.buildBehaviorPreview()
      });
      saveAssessmentResult(result, answers);
      saveDailyLoopState(buildDailyLoopState({
        todayKey: todayKey(),
        profile: getProfile(),
        mind: getTodayMind(),
        assessment: result,
        training: getTodayTraining(),
        todayReview: getTodayReview(),
        zhixingScoreState: getZhixingScoreState(),
        heartCardRecord: getTodayHeartCard()
      }));
      syncLocalState({ silent: true }).catch(() => {});
      syncAssessmentReport(result).catch(() => {});
      wx.showToast({ title: "心证已生成", icon: "success" });
      const prompted = promptShareMoment("assessment_completed", {
        sourceScene: "assessment_completed",
        onCancel: () => wx.navigateTo({ url: "/pages/report/index" })
      });
      if (!prompted) wx.navigateTo({ url: "/pages/report/index" });
      this.setData({ answers });
      return;
    }

    this.setData(
      {
        answers,
        currentIndex: this.data.currentIndex + 1
      },
      this.syncQuestion
    );
  },

  prev() {
    if (this.data.currentIndex <= 0) return;
    this.setData(
      {
        currentIndex: this.data.currentIndex - 1
      },
      this.syncQuestion
    );
  },

  restart() {
    wx.showModal({
      title: "重新照见此心",
      content: "当前答案会清空，重新照见当下状态。",
      confirmText: "重新照见",
      success: (res) => {
        if (!res.confirm) return;
        saveAssessmentAnswers([], this.data.modeKey);
        this.setData({
          answers: [],
          currentIndex: 0,
          selectedValue: -1,
          selectedBoundaryInsight: "选择后，这里会照见你当下最需要守住的一界。"
        }, this.syncQuestion);
      }
    });
  }
});
