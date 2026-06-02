const { MIND_STATES, buildMindRitual } = require("../../modules/mind/index");
const { CULTIVATION_LOOP } = require("../../modules/index/index");
const {
  getProfile,
  getTodayMind,
  saveTodayOpeningCheck,
  getTodayTraining,
  saveTodayTraining,
  getTraining7State,
  saveTraining7Task,
  updateProfile,
  getAssessmentResult,
  getZhixingScoreState,
  getTodayReview,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncLocalState, syncTrainingProgress } = require("../../utils/api");
const { promptShareMoment } = require("../../utils/share-moments");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");

function buildNodes(selectedKey) {
  return MIND_STATES.map((item, index) => Object.assign({}, item, {
    active: item.key === selectedKey,
    nodeClass: `node-${index}`
  }));
}

const STATUS_OPTIONS = ["平静", "急躁", "兴奋", "恐惧", "想证明", "想翻本", "犹豫", "麻木"];
const RISK_OPTIONS = ["追涨", "扛单", "重仓", "频繁交易", "止损抗拒", "盈利后失控", "亏损后报复", "临时改计划"];
const BOUNDARY_OPTIONS = ["仓位边界", "止损边界", "次数边界", "时间边界", "情绪边界", "计划边界"];

Page({
  data: {
    states: MIND_STATES,
    nodes: buildNodes("jing"),
    selectedKey: "jing",
    ritual: buildMindRitual("jing"),
    loop: CULTIVATION_LOOP,
    saved: false,
    breathActive: false,
    breathStep: 0,
    breathText: "三息未启",
    scanText: "待观心",
    waveBars: [34, 62, 46, 72, 40, 58, 50],
    nextButtonText: "去九型人格",
    statusOptions: STATUS_OPTIONS,
    riskOptions: RISK_OPTIONS,
    boundaryOptions: BOUNDARY_OPTIONS,
    currentStatus: "平静",
    todayRisk: "追涨",
    todayBoundary: "情绪边界",
    openingNote: ""
  },
  breathTimer: null,

  onShow() {
    const saved = getTodayMind();
    if (saved) {
      this.setData({
        selectedKey: saved.key || "jing",
        nodes: buildNodes(saved.key || "jing"),
        ritual: saved,
        saved: true,
        scanText: "今日已照见",
        currentStatus: saved.currentStatus || saved.name || "平静",
        todayRisk: saved.todayRisk || "追涨",
        todayBoundary: saved.todayBoundary || "情绪边界",
        openingNote: saved.openingNote || "",
        nextButtonText: getAssessmentResult() ? "进入今日修行" : "去九型人格"
      });
    } else {
      this.setData({ nextButtonText: getAssessmentResult() ? "进入今日修行" : "去九型人格" });
    }
  },

  onHide() {
    this.clearBreath();
  },

  onUnload() {
    this.clearBreath();
  },

  selectMind(e) {
    const key = e.currentTarget.dataset.key;
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    this.setData({
      selectedKey: key,
      nodes: buildNodes(key),
      ritual: buildMindRitual(key),
      saved: false,
      scanText: "心境已选，待三息"
    });
  },

  startBreath() {
    if (this.data.breathActive) return;
    const steps = ["吸气", "停一息", "呼气", "照见"];
    let cursor = 0;

    this.setData({
      breathActive: true,
      breathStep: 1,
      breathText: steps[0],
      scanText: "正在观心"
    });

    this.clearBreath();
    this.breathTimer = setInterval(() => {
      cursor += 1;
      if (cursor >= steps.length) {
        this.clearBreath();
        this.setData({
          breathActive: false,
          breathStep: 4,
          breathText: "三息已定",
          scanText: "可生成今日观心"
        });
        return;
      }

      this.setData({
        breathStep: cursor + 1,
        breathText: steps[cursor]
      });
    }, 920);
  },

  clearBreath() {
    if (this.breathTimer) {
      clearInterval(this.breathTimer);
      this.breathTimer = null;
    }
  },

  selectStatus(e) {
    this.setData({ currentStatus: e.currentTarget.dataset.value });
  },

  selectRisk(e) {
    this.setData({ todayRisk: e.currentTarget.dataset.value });
  },

  selectBoundary(e) {
    this.setData({ todayBoundary: e.currentTarget.dataset.value });
  },

  inputOpeningNote(e) {
    this.setData({ openingNote: e.detail.value });
  },

  saveMind() {
    const ritual = saveTodayOpeningCheck(Object.assign({}, this.data.ritual, {
      scanText: this.data.scanText,
      breathText: this.data.breathText,
      currentStatus: this.data.currentStatus,
      todayRisk: this.data.todayRisk,
      todayBoundary: this.data.todayBoundary,
      openingNote: this.data.openingNote
    }));
    saveTraining7Task(Number((getTraining7State() || {}).currentDay || 1), "opening_check", true);
    const training = getTodayTraining();
    saveTodayTraining(Object.assign({}, training, {
      mindKey: ritual.key,
      mindName: ritual.name,
      mindTask: ritual.oneThing,
      mindDiscipline: ritual.discipline,
      indexFocus: ritual.indexFocus
    }));
    updateProfile({
      stage: "照心",
      lastMind: ritual.name
    });
    saveDailyLoopState(buildDailyLoopState({
      todayKey: todayKey(),
      profile: Object.assign({}, getProfile(), { lastMind: ritual.name }),
      mind: ritual,
      assessment: getAssessmentResult(),
      training: getTodayTraining(),
      todayReview: getTodayReview(),
      zhixingScoreState: getZhixingScoreState(),
      heartCardRecord: getTodayHeartCard()
    }));
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    this.setData({
      ritual,
      saved: true,
      scanText: "今日已照见",
      nextButtonText: getAssessmentResult() ? "进入今日修行" : "去九型人格"
    });
    wx.showToast({ title: "今日心境已照见", icon: "success" });
    promptShareMoment("opening_check_completed", { sourceScene: "opening_check_completed" });
    return ritual;
  },

  goTraining() {
    this.saveMind();
    const url = getAssessmentResult() ? "/pages/training/index" : "/pages/assessment/index";
    setTimeout(() => {
      wx.redirectTo({ url });
    }, 280);
  },

  goReview() {
    wx.redirectTo({ url: "/pages/review/index" });
  },

  goLoopPage(e) {
    const page = e.currentTarget.dataset.page;
    if (!page) return;
    wx.redirectTo({ url: page });
  }
});
