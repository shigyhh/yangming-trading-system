Component({
  properties: {
    status: {
      type: String,
      value: "知而未行"
    },
    reflection: {
      type: String,
      value: ""
    },
    action: {
      type: String,
      value: ""
    },
    score: {
      type: Number,
      value: 72
    }
  },
  methods: {
    startTraining() {
      this.triggerEvent("start");
    }
  }
});
