const { MIND_STATES, buildMindRitual } = require("../../modules/mind/index");
const { CULTIVATION_LOOP } = require("../../modules/index/index");
const {
  getProfile,
  getTodayMind,
  saveTodayMind,
  getTodayTraining,
  saveTodayTraining,
  updateProfile,
  getAssessmentResult,
  getZhixingScoreState,
  getTodayReview,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncLocalState } = require("../../utils/api");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");

function buildNodes(selectedKey) {
  return MIND_STATES.map((item, index) => Object.assign({}, item, {
    active: item.key === selectedKey,
    nodeClass: `node-${index}`
  }));
}

Page({
  data: {
    states: MIND_STATES,
    nodes: buildNodes("jing"),
    selectedKey: "jing",
    ritual: buildMindRitual("jing"),
    loop: CULTIVATION_LOOP,
    saved: false,
    ripple: null,
    breathActive: false,
    breathStep: 0,
    breathText: "三息未启",
    scanText: "待观心",
    waveBars: [34, 62, 46, 72, 40, 58, 50],
    nextButtonText: "去九型人格"
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

  saveMind() {
    const ritual = saveTodayMind(Object.assign({}, this.data.ritual, {
      scanText: this.data.scanText,
      breathText: this.data.breathText
    }));
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
    this.setData({
      ritual,
      saved: true,
      scanText: "今日已照见",
      nextButtonText: getAssessmentResult() ? "进入今日修行" : "去九型人格"
    });
    wx.showToast({ title: "今日心境已照见", icon: "success" });
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

  createRipple(e) {
    if (e.target && e.target.dataset && e.target.dataset.noripple) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const id = Date.now();
    this.setData({
      ripple: {
        id,
        x: touch.clientX,
        y: touch.clientY
      }
    });
    setTimeout(() => {
      if (this.data.ripple && this.data.ripple.id === id) this.setData({ ripple: null });
    }, 900);
  }
});
