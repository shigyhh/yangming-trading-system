export const shareCardContent = {
  title: "我的交易人格照见",
  subtitle: "不是预测行情，是看见自己的交易反应。",
  compliance: "本卡片仅用于交易认知、行为训练与风险教育；不构成投资建议。",
  cta: "照见此心，一起事上练"
};

export function buildShareCardConclusion({ primaryType = "未定型", riskLabel = "第一念" } = {}) {
  return `我正在观察「${primaryType}」反应，先从「${riskLabel}」开始练。`;
}

export function buildShareCardTrainingFocus({ riskLabel = "第一念" } = {}) {
  return `先记录「${riskLabel}」出现的时刻，再做七日觉察、训练与复盘。`;
}
