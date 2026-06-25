const { COMPLIANCE_TEXT } = require("../../utils/content");

const VARIANTS = ["full", "compact", "link"];

function resolveVariant(variant, compact) {
  if (VARIANTS.includes(variant)) return variant;
  return compact ? "compact" : "full";
}

Component({
  properties: {
    variant: {
      type: String,
      value: ""
    },
    compact: {
      type: Boolean,
      value: false
    }
  },
  data: {
    text: COMPLIANCE_TEXT,
    compactText: "交易心理训练边界：不荐股，不预测，不构成操作依据。",
    resolvedVariant: "full"
  },
  lifetimes: {
    attached() {
      this.syncVariant();
    }
  },
  observers: {
    "variant, compact": function () {
      this.syncVariant();
    }
  },
  methods: {
    syncVariant() {
      this.setData({
        resolvedVariant: resolveVariant(this.data.variant, this.data.compact)
      });
    },
    showBoundary() {
      if (this.data.resolvedVariant !== "link") return;
      wx.showModal({
        title: "系统边界",
        content: this.data.text,
        showCancel: false,
        confirmText: "我知道了"
      });
    }
  }
});
