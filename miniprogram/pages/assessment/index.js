const { QUESTIONS, OPTIONS } = require("../../utils/content");
const { computeAssessment } = require("../../utils/assessment");
const {
  getProfile,
  getAssessmentAnswers,
  saveAssessmentAnswers,
  saveAssessmentResult,
  getTodayMind,
  getTodayTraining,
  getTodayReview,
  getZhixingScoreState,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncLocalState, syncAssessmentReport } = require("../../utils/api");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");
const { promptShareMoment } = require("../../utils/share-moments");

Page({
  data: {
    questions: QUESTIONS,
    currentIndex: 0,
    currentQuestion: {},
    options: OPTIONS,
    selectedValue: -1,
    answers: [],
    progress: 0,
    answeredCount: 0,
    isLast: false
  },

  onLoad() {
    const answers = getAssessmentAnswers();
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const firstUnanswered = QUESTIONS.findIndex((_, index) => typeof safeAnswers[index] !== "number");
    this.setData({
      answers: safeAnswers,
      currentIndex: firstUnanswered >= 0 ? firstUnanswered : QUESTIONS.length - 1
    }, this.syncQuestion);
  },

  onShow() {
    this.syncQuestion();
  },

  syncQuestion() {
    const index = this.data.currentIndex;
    const answers = this.data.answers || [];
    const selected = typeof answers[index] === "number" ? answers[index] : -1;
    const answeredCount = answers.filter((item) => typeof item === "number").length;

    this.setData({
      currentQuestion: Object.assign({ no: index + 1 }, QUESTIONS[index]),
      selectedValue: selected,
      progress: Math.round(((index + 1) / QUESTIONS.length) * 100),
      answeredCount,
      isLast: index === QUESTIONS.length - 1
    });
  },

  selectOption(e) {
    const value = Number(e.currentTarget.dataset.value);
    this.setData({ selectedValue: value });
  },

  next() {
    if (this.data.selectedValue < 0) {
      wx.showToast({ title: "先选一个真实状态", icon: "none" });
      return;
    }

    const answers = this.data.answers.slice();
    answers[this.data.currentIndex] = this.data.selectedValue;
    saveAssessmentAnswers(answers);

    if (this.data.isLast) {
      const result = computeAssessment(answers);
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
        saveAssessmentAnswers([]);
        this.setData({ answers: [], currentIndex: 0, selectedValue: -1 }, this.syncQuestion);
      }
    });
  }
});
