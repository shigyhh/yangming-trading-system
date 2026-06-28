const { listTrainingBookmarks, deleteTrainingBookmark } = require("../../utils/api");
const { normalizeTrainingBookmark } = require("../../modules/kline-mind/index");

function formatSceneTags(tags = []) {
  return Array.isArray(tags) && tags.length ? tags.join(" / ") : "待补充";
}

function formatSourceType(sourceType = "") {
  const labels = {
    review_focus: "今日针对训练",
    special_training: "专项训练",
    custom_session: "自选盲练",
    base_blind: "基础盲练"
  };
  return labels[sourceType] || sourceType || "基础盲练";
}

function formatBookmarkType(bookmarkType = "") {
  const labels = {
    session: "整局训练",
    action: "单根动作",
    mistake_card: "训练错题卡"
  };
  return labels[bookmarkType] || "整局训练";
}

function formatTime(value) {
  if (!value) return "时间待同步";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildBookmarkView(item = {}) {
  const bookmark = normalizeTrainingBookmark(item);
  return Object.assign({}, bookmark, {
    bookmarkTypeLabel: formatBookmarkType(bookmark.bookmarkType),
    sourceTypeLabel: formatSourceType(bookmark.sourceType),
    sceneTagsText: formatSceneTags(bookmark.sceneTags),
    executionResultText: bookmark.executionResult || "说不清",
    createdAtText: formatTime(bookmark.createdAt || bookmark.created_at),
    titleText: bookmark.title || "训练收藏"
  });
}

Page({
  data: {
    loading: false,
    error: "",
    bookmarks: []
  },

  onShow() {
    this.loadBookmarks();
  },

  async loadBookmarks() {
    this.setData({ loading: true, error: "" });
    try {
      const result = await listTrainingBookmarks();
      const list = result.trainingBookmarks || result.training_bookmarks || [];
      this.setData({
        loading: false,
        bookmarks: list.map(buildBookmarkView)
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: "训练收藏暂未载入，请检查后端连接后重试。"
      });
    }
  },

  goDetail(e) {
    const id = ((e.currentTarget || {}).dataset || {}).id || "";
    if (!id) return;
    wx.navigateTo({ url: `/pages/training-bookmarks/detail?id=${encodeURIComponent(id)}` });
  },

  deleteBookmark(e) {
    const id = ((e.currentTarget || {}).dataset || {}).id || "";
    if (!id) return;
    wx.showModal({
      title: "取消收藏",
      content: "这会从训练收藏中移除，不会修改原训练记录。",
      confirmText: "取消收藏",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await deleteTrainingBookmark(id);
          wx.showToast({ title: "已取消收藏", icon: "success" });
          this.loadBookmarks();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      }
    });
  }
});
