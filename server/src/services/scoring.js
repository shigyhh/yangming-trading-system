import { allTypes, riskTypes } from "./questionBank.js";

const SCORING_VERSION = "scoring_2026_05_v1";
const REPORT_TEMPLATE_VERSION = "report_template_2026_05_v1";

const profiles = {
  冲动型: {
    pattern: "机会一出现就先上车，事后再补理由。",
    risk: "容易在急拉、涨停诱惑和盘中消息里做临时决策。",
    scene: "最容易亏在分时快速拉升、热门题材扩散、朋友突然喊票时。",
    ability: "下单前延迟能力",
    camp: "基础觉察营",
    reminder: "知是行之始，行是知之成。你不是缺机会，而是要先让心慢下来。",
    actions: [
      "每次想追涨前先停 10 分钟，只写买入理由和失效条件。",
      "当天只允许做计划内标的，盘中临时看到的机会全部记入观察表。",
      "复盘最近 3 次冲动交易，标出触发情绪、入场价格和实际结果。",
      "设置单笔最大亏损线，买入前先写出错了在哪里退出。",
      "练习用虚拟盘处理急拉行情，连续 3 次做到不追才进入下一步。",
      "把“怕错过”改写成一句提醒：错过机会不是风险，失控下单才是风险。",
      "总结一条能长期执行的小规则，贴在交易软件旁边。"
    ]
  },
  扛单型: {
    pattern: "亏损出现后先安慰自己，再把短线拖成长线。",
    risk: "容易把破位、亏损扩大和仓位失衡合理化。",
    scene: "最容易亏在跌破计划止损位、补仓摊低成本、幻想反弹时。",
    ability: "止损执行能力",
    camp: "风险修正营",
    reminder: "致良知不是让你硬扛，而是看见事实后立刻修正行动。",
    actions: ["给每笔持仓写清楚止损条件，没有条件不允许买入。", "盘中触发止损只做执行，不做辩论。", "把最近一笔扛单交易拆成三个节点：破位、犹豫、扩大亏损。", "设置亏损提醒，触线后先减仓一半，避免情绪占满大脑。", "连续 7 天记录自己说过的“再等等”，看它是否真的保护你。", "用小仓位练习机械止损，目标是训练动作，不是追求盈利。", "复盘一条规则：亏损扩大前，我真正能控制的动作是什么。"]
  },
  完美主义型: {
    pattern: "总想等到最完美信号，结果错过后又自责。",
    risk: "容易陷入过度分析、迟迟不动和事后否定自己。",
    scene: "最容易亏在反复等确认、追求最低点最高点、错过后补追时。",
    ability: "计划内试错能力",
    camp: "执行强化营",
    reminder: "事上练不是等万事俱备，而是在规则内接受不完美的行动。",
    actions: ["把入场条件压缩到 3 条，满足即按计划执行。", "允许用 1/3 仓位试错，先训练行动闭环。", "记录每次因为等完美而错过的机会，不评价，只看模式。", "把复盘重点从结果好坏改成是否按规则行动。", "设置“可接受的小亏损”，让自己愿意完成交易实验。", "选择一类简单形态连续训练 7 天，减少策略切换。", "写一句提醒：正确不是完美，正确是可重复。"]
  },
  偏执型: {
    pattern: "一旦形成判断，就很难接受市场反证。",
    risk: "容易把观点当事实，对反向信号视而不见。",
    scene: "最容易亏在基本面叙事、长期看好、越跌越相信自己时。",
    ability: "反证检查能力",
    camp: "风险修正营",
    reminder: "心外无物不是固执己见，而是照见自己的念头也会遮住事实。",
    actions: ["买入前必须写出一个反对自己判断的理由。", "每天收盘后只问一句：今天有没有证据说明我错了。", "给持仓设置客观退出条件，避免靠信念续命。", "找一笔亏损交易，标出你忽略过的三条市场反证。", "和一位风格不同的人做一次反向复盘，只听不反驳。", "把“我认为”改成“如果市场证明我错，我如何退出”。", "建立反证清单，未来每次交易前逐条检查。"]
  },
  焦虑型: {
    pattern: "买入后被价格波动牵着走，越看盘越心慌。",
    risk: "容易频繁看盘、过早卖出和情绪性撤退。",
    scene: "最容易亏在小幅回撤、盘中震荡、盈利刚出现就急着落袋时。",
    ability: "持仓情绪稳定能力",
    camp: "基础觉察营",
    reminder: "此心不动，随机而动。先稳住心，才看得清盘。",
    actions: ["设置固定看盘时间，每次不超过 10 分钟。", "买入前写明持仓理由，盘中只看是否失效。", "连续 7 天记录价格波动带来的身体反应。", "盈利票不因一根分时回落卖出，只按计划条件处理。", "睡前不看持仓盈亏，改看交易日志。", "用轻仓训练持仓，直到能接受正常波动。", "写一句提醒：波动不是命令，计划才是命令。"]
  },
  从众型: {
    pattern: "别人的观点越热闹，自己的判断越容易被带走。",
    risk: "容易依赖群消息、大 V 观点和热门情绪。",
    scene: "最容易亏在直播荐股、社群喊单、热榜题材后排接力时。",
    ability: "独立决策能力",
    camp: "基础觉察营",
    reminder: "良知在自己心上，不在热闹处。先问自己懂不懂，再决定做不做。",
    actions: ["任何外部消息都先放进观察表，不直接下单。", "买入理由必须由自己写出，不能写“别人说好”。", "取关或静音一个最容易影响你冲动的人或群。", "复盘最近 3 次跟风交易，看自己是否理解交易逻辑。", "建立自己的三条选股条件，条件不满足不参与。", "练习在热门消息出现后延迟 30 分钟再判断。", "写一句提醒：热闹不等于确定，跟随不等于认知。"]
  },
  赌徒型: {
    pattern: "喜欢用一次重仓或高风险机会改变结果。",
    risk: "容易重仓、频繁交易、追求刺激和回本。",
    scene: "最容易亏在连亏后加倍、满仓押注、把交易当翻本游戏时。",
    ability: "仓位纪律能力",
    camp: "风险修正营",
    reminder: "欲胜人者先自胜。真正的勇敢，是不把命运交给一把牌。",
    actions: ["未来 7 天单笔仓位上限固定，任何理由不得突破。", "连续亏损两笔后停止交易一天。", "把回本念头写下来，标出它让你做过哪些危险动作。", "删除会诱发高频冲动的盘口提醒。", "只做一类低波动训练单，目标是控制手，不是刺激心。", "复盘一次重仓失败，计算如果按仓位纪律会少亏多少。", "写一句提醒：小亏可控，大赌伤身。"]
  },
  拖延型: {
    pattern: "知道该做什么，却常在关键动作上慢半拍。",
    risk: "容易错过买卖点、复盘断档和计划长期停留在纸面。",
    scene: "最容易亏在该止损不止、该复盘不复、该调整仓位却拖到收盘后。",
    ability: "关键动作启动能力",
    camp: "执行强化营",
    reminder: "知而不行，只是未知。把一个动作做出来，认知才真正落地。",
    actions: ["每天只设一个必须完成的交易动作，并在收盘前打勾。", "止损、减仓、复盘都设置固定时间提醒。", "把复杂计划拆成 5 分钟能完成的小动作。", "复盘最近一次拖延，找出拖延前的真实念头。", "用模拟盘训练触发条件后的立即执行。", "建立交易日志模板，减少开始复盘的阻力。", "写一句提醒：今天完成一个动作，胜过想清十个道理。"]
  },
  平衡型: {
    pattern: "能在计划、风险和情绪之间保持相对稳定。",
    risk: "主要风险是稳定后松懈，或在极端行情中被旧习惯拉回去。",
    scene: "最容易在连续盈利后放松纪律，或在市场剧烈波动时偏离计划。",
    ability: "稳定复利能力",
    camp: "稳定进阶营",
    reminder: "此心光明，亦复何言。保持清明，不因一时胜负失其本心。",
    actions: ["保留现有交易规则，重点记录每次偏离规则的细节。", "每笔交易只检查计划、仓位、退出条件三件事。", "连续盈利后主动降一次仓位，防止自信膨胀。", "复盘最稳定的一笔交易，提炼可重复的动作。", "设置每周一次深度复盘，不因短期结果改变系统。", "用小仓位测试一个改进点，不扰动主系统。", "写一句提醒：稳定不是不犯错，而是错误不扩大。"]
  }
};

export function calculateScore({ questions, answers, nickname = "测试用户", channel = "未知渠道", testVersion = "45" }) {
  const answerMap = new Map((answers || []).map((item) => [item.question_id, Number(item.score)]));
  const scores = {};
  const counts = {};
  const maxScores = {};
  const subScores = {};

  for (const type of allTypes) {
    scores[type] = 0;
    counts[type] = 0;
    maxScores[type] = 0;
  }

  for (const question of questions) {
    const score = answerMap.get(question.question_id);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      const error = new Error(`题目 ${question.question_id} 缺少 1-5 分答案`);
      error.statusCode = 400;
      throw error;
    }

    const weight = Number(question.weight || 1);
    const type = question.personality_type;
    const subKey = `${type}｜${question.sub_dimension}`;

    scores[type] += score * weight;
    counts[type] += 1;
    maxScores[type] += 5 * weight;

    if (!subScores[subKey]) {
      subScores[subKey] = {
        personality_type: type,
        sub_dimension: question.sub_dimension,
        score: 0,
        max_score: 0,
        training_ability: question.training_ability
      };
    }

    subScores[subKey].score += score * weight;
    subScores[subKey].max_score += 5 * weight;
  }

  const scorePercentages = {};
  for (const type of allTypes) {
    scorePercentages[type] = maxScores[type] ? Math.round((scores[type] / maxScores[type]) * 100) : 0;
  }

  const riskRanking = riskTypes
    .map((type) => ({ type, score: scores[type], percent: scorePercentages[type] }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score);

  const topRisk = riskRanking[0];
  const secondRisk = riskRanking[1];
  const balancePercent = scorePercentages["平衡型"];
  const mainType = balancePercent >= 84 && topRisk.percent <= 58 ? "平衡型" : topRisk.type;
  const subType = mainType === "平衡型" ? (topRisk.percent >= 50 ? topRisk.type : "副人格不明显") : secondRisk.type;
  const profile = profiles[mainType] || profiles["平衡型"];

  const topSubDimensions = Object.values(subScores)
    .map((item) => ({
      ...item,
      percent: item.max_score ? Math.round((item.score / item.max_score) * 100) : 0
    }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score)
    .slice(0, 5);

  return {
    nickname,
    channel,
    test_version: String(testVersion),
    scoring_version: SCORING_VERSION,
    question_bank_version: getQuestionBankVersion(questions),
    report_template_version: REPORT_TEMPLATE_VERSION,
    main_type: mainType,
    sub_type: subType,
    risk_level: getRiskLevel(topRisk.percent),
    current_trading_risk: profile.risk,
    easiest_loss_scene: profile.scene,
    training_ability: topSubDimensions[0]?.training_ability || profile.ability,
    yangming_reminder: profile.reminder,
    recommended_camp: profile.camp,
    score_percentages: scorePercentages,
    raw_scores: scores,
    top_sub_dimensions: topSubDimensions,
    risk_ranking: riskRanking,
    balance_percent: balancePercent,
    actions_7_days: profile.actions
  };
}

function getQuestionBankVersion(questions) {
  const versions = [...new Set((questions || []).map((item) => item.version).filter(Boolean))];
  if (!versions.length) return "unknown";
  return versions.length === 1 ? versions[0] : versions.join(",");
}

export function buildLocalReport(result) {
  const profile = profiles[result.main_type] || profiles["平衡型"];
  const subProfile = profiles[result.sub_type] || null;
  const topSubs = result.top_sub_dimensions
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.personality_type}-${item.sub_dimension}：${item.percent}%`)
    .join("\n");
  const actions = result.actions_7_days.map((item, index) => `${index + 1}. 第${index + 1}天：${item}`).join("\n");

  return `《九种交易人格 AI 诊断报告》

一、测评说明
本报告基于你本次 ${result.test_version} 题作答生成，用于交易认知教育、行为觉察与训练分层，不构成任何投资建议、买卖建议或收益承诺。

二、主人格：${result.main_type}
你的主要交易模式是：${profile.pattern}

三、副人格：${result.sub_type}
${subProfile ? `压力下容易暴露的问题是：${subProfile.pattern}` : "当前副人格并不突出，说明你的风险人格没有明显集中在第二类型上。"}

四、当前交易风险
${result.risk_level}
${result.current_trading_risk}

五、最容易亏钱的场景
${result.easiest_loss_scene}

六、最该训练的一项能力
${result.training_ability}

七、高分子维度
${topSubs}

八、阳明心学提醒
${result.yangming_reminder}

九、7 天行动建议
${actions}

十、训练营分层建议
建议进入「${result.recommended_camp}」。训练重点不是预测行情，而是把你的交易动作从情绪驱动，慢慢训练成规则驱动。`;
}

function getRiskLevel(percent) {
  if (percent >= 78) return "高风险";
  if (percent >= 62) return "中高风险";
  if (percent >= 46) return "中等风险";
  return "低风险";
}
