const { PERSONALITIES, QUESTIONS } = require("./content");

function computeAssessment(answers) {
  const scores = {};
  Object.keys(PERSONALITIES).forEach((type) => {
    scores[type] = type === "平衡型" ? 1 : 0;
  });

  QUESTIONS.forEach((question, index) => {
    const raw = Number(answers[index] || 0);
    const score = Math.max(0, Math.min(3, raw));
    if (question.positive) {
      scores["平衡型"] += score * 1.4;
      Object.keys(scores).forEach((type) => {
        if (type !== "平衡型") scores[type] += Math.max(0, 2 - score) * 0.12;
      });
    } else {
      scores[question.type] += score * 1.3;
      if (score === 0) scores["平衡型"] += 0.18;
    }
  });

  const ranked = Object.keys(scores)
    .map((type) => ({ type, score: Number(scores[type].toFixed(2)) }))
    .sort((a, b) => b.score - a.score);

  const primary = ranked[0].type;
  const secondary = ranked[1] ? ranked[1].type : "平衡型";
  const profile = PERSONALITIES[primary];
  const secondaryProfile = PERSONALITIES[secondary];
  const total = ranked.reduce((sum, item) => sum + item.score, 0) || 1;
  const intensity = Math.round((ranked[0].score / total) * 100);

  return {
    primary,
    secondary,
    intensity,
    ranked,
    title: `${primary} · ${profile.subtitle}`,
    scenario: profile.scenario,
    trigger: profile.trigger,
    bias: profile.bias,
    xinxue: profile.xinxue,
    action: profile.action,
    path: profile.path,
    secondaryNote: `${secondary}倾向提示：${secondaryProfile.scenario}`,
    createdAt: Date.now()
  };
}

module.exports = {
  computeAssessment
};
