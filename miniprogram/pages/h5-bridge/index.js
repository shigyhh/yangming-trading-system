Page({
  data: {
    url: ""
  },

  onLoad(options = {}) {
    const rawUrl = options.url || "";
    const url = rawUrl ? decodeURIComponent(rawUrl) : "";
    this.setData({ url });
  }
});
