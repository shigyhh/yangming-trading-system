const { listTrainingBookmarks, deleteTrainingBookmark, fetchKlineTrainingSlice } = require("../../utils/api");
const { normalizeTrainingBookmark, buildBookmarkReplaySliceRequest } = require("../../modules/kline-mind/index");

function formatSceneTags(tags = []) {
  return Array.isArray(tags) && tags.length ? tags.join(" / ") : "待补充";
}

function normalizeBars(slice = {}) {
  const data = slice.slice || slice.data || slice;
  return Array.isArray(data.candles)
    ? data.candles
    : Array.isArray(data.bars)
      ? data.bars
      : [];
}

function buildReplayBars(bars = []) {
  return bars.slice(0, 80).map((bar, index) => ({
    id: bar.date || bar.time || `bar-${index}`,
    label: `第 ${index + 1} 根`,
    date: bar.date || bar.time || "",
    close: bar.close || bar.c || "",
    rangeText: `${bar.open || bar.o || "-"} / ${bar.close || bar.c || "-"}`
  }));
}

function buildBookmarkView(item = {}) {
  const bookmark = normalizeTrainingBookmark(item);
  return Object.assign({}, bookmark, {
    sceneTagsText: formatSceneTags(bookmark.sceneTags),
    executionResultText: bookmark.executionResult || "说不清",
    samplingSource: bookmark.samplingResult
      ? (bookmark.samplingResult.fallbackUsed || bookmark.samplingResult.fallback_used ? "兜底片段" : "匹配片段")
      : bookmark.sourceType === "custom_session" ? "自选盲练" : "待补充"
  });
}

Page({
  data: {
    id: "",
    loading: false,
    error: "",
    bookmark: null,
    replayLoading: false,
    replayStatus: "",
    replayError: "",
    replayBars: []
  },

  onLoad(options = {}) {
    this.setData({ id: decodeURIComponent(options.id || "") });
    this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true, error: "" });
    try {
      const result = await listTrainingBookmarks({ includeDisabled: true });
      const list = result.trainingBookmarks || result.training_bookmarks || [];
      const raw = list.find((item) => item.id === this.data.id);
      if (!raw) {
        this.setData({ loading: false, error: "未找到这条训练收藏。" });
        return;
      }
      const bookmark = buildBookmarkView(raw);
      this.setData({ loading: false, bookmark });
      this.loadReplay(bookmark);
    } catch (error) {
      this.setData({
        loading: false,
        error: "训练收藏详情暂未载入，请检查后端连接后重试。"
      });
    }
  },

  async loadReplay(bookmark = {}) {
    const replayRequest = buildBookmarkReplaySliceRequest(bookmark);
    if (!replayRequest) {
      this.setData({
        replayStatus: bookmark.segmentId
          ? "已有片段ID，当前缺少时间范围；后续支持完整回放。"
          : "暂无可回放的 K 线范围，先展示收藏 metadata。",
        replayError: "",
        replayBars: []
      });
      return;
    }
    this.setData({ replayLoading: true, replayStatus: "正在载入回放 K 线", replayError: "" });
    try {
      const result = await fetchKlineTrainingSlice(replayRequest);
      const bars = normalizeBars(result);
      this.setData({
        replayLoading: false,
        replayStatus: bars.length ? "回放 K 线已载入" : "暂无法加载回放 K线，请稍后重试",
        replayError: "",
        replayBars: buildReplayBars(bars)
      });
    } catch (error) {
      this.setData({
        replayLoading: false,
        replayStatus: "",
        replayError: "暂无法加载回放 K线，请稍后重试",
        replayBars: []
      });
    }
  },

  deleteBookmark() {
    const bookmark = this.data.bookmark || {};
    if (!bookmark.id) return;
    wx.showModal({
      title: "取消收藏",
      content: "这会从训练收藏中移除，不会修改原训练记录。",
      confirmText: "取消收藏",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await deleteTrainingBookmark(bookmark.id);
          wx.showToast({ title: "已取消收藏", icon: "success" });
          wx.navigateBack();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      }
    });
  }
});
