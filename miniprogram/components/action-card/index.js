Component({
  properties: {
    title: String,
    subtitle: String,
    eyebrow: String,
    actionText: {
      type: String,
      value: "进入"
    },
    tone: {
      type: String,
      value: "gold"
    }
  },
  methods: {
    tapAction() {
      this.triggerEvent("action");
    }
  }
});
