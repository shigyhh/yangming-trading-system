const { COMPLIANCE_TEXT } = require("../../utils/content");

Component({
  properties: {
    compact: {
      type: Boolean,
      value: false
    }
  },
  data: {
    text: COMPLIANCE_TEXT
  }
});
