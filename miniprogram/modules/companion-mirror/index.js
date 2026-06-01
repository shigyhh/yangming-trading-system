const RISK_LINES = {
  "冲动型": "容易在急念出现时想立刻行动",
  "扛单型": "容易在边界被触碰时继续解释",
  "完美型": "容易因追求完全确认而迟迟不动",
  "赌徒型": "容易在不甘之后想夺回控制",
  "从众型": "容易被外部气氛牵走",
  "偏执型": "容易只看见支持自己的证据",
  "拖延型": "容易知而不行，临界时延后面对",
  "焦虑型": "容易提前担心并动摇计划",
  "平衡型": "容易在顺手时省略基础省察"
};

function getRiskLine(type) {
  return RISK_LINES[type] || RISK_LINES["平衡型"];
}

function buildCompanionMirror({ inviterPrimary = "", inviterSecondary = "", inviteePrimary = "", inviteeSecondary = "" } = {}) {
  const ready = !!(inviterPrimary && inviteePrimary);
  const samePrimary = ready && inviterPrimary === inviteePrimary;
  return {
    ready,
    inviterPrimary: inviterPrimary || "待照见",
    inviterSecondary: inviterSecondary || "待照见",
    inviteePrimary: inviteePrimary || "待照见",
    inviteeSecondary: inviteeSecondary || "待照见",
    commonRisk: ready
      ? samePrimary
        ? `共同风险：${getRiskLine(inviterPrimary)}。`
        : `共同风险：边界被触碰时，都需要先看见自己的第一反应。`
      : "共同风险：待同修完成照见后生成。",
    difference: ready
      ? samePrimary
        ? "不同之处：同一人格也会在不同场景里显现不同念头。"
        : `不同之处：我更像${inviteePrimary}，同修更像${inviterPrimary}。`
      : "不同之处：待同修照见后生成。",
    insight: ready
      ? "镜像不是比较高下，而是一起看见各自最容易失守的那一念。"
      : "发给一位同修，让彼此看见是不是同一种反应模式。"
  };
}

module.exports = {
  RISK_LINES,
  getRiskLine,
  buildCompanionMirror
};
