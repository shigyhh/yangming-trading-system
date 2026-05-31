const {
  getProfile,
  updateProfile,
  getTodayMind,
  getAssessmentResult,
  getTodayTraining,
  getTrainingState,
  getMindRecords,
  getTodayReview,
  getReviews,
  getZhixingScoreState,
  saveDailyLoopState,
  getTodayHeartCard,
  saveTodayHeartCard,
  clearTodayHeartCard,
  todayKey
} = require("../../utils/store");
const { syncLocalState } = require("../../utils/api");
const { buildCompanionSystem } = require("../../modules/companion/index");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");
const { buildContinuityState } = require("../../modules/continuity/index");
const { getTodayContent } = require("../../modules/content365/index");
const { buildStageState } = require("../../modules/stages/index");
const { buildHeartProofShareCard } = require("../../modules/share/index");

const ENTRY_STATE_KEY = "zhixing_ritual_entry";
const VOWS = [
  { key: "plan", seal: "志", text: "我承诺：无计划，不开仓。" },
  { key: "stop", seal: "止", text: "我承诺：触发止损，不移动。" },
  { key: "emotion", seal: "离", text: "我承诺：情绪失控，先离场。" }
];
const QR_BLOCKS = Array.from({ length: 25 }).map((_, index) => ({
  key: index,
  active: [0, 1, 2, 4, 5, 7, 9, 10, 12, 14, 15, 17, 20, 21, 23, 24].includes(index)
}));

function getStoredEntryState() {
  try {
    return wx.getStorageSync(ENTRY_STATE_KEY) || {};
  } catch (error) {
    return {};
  }
}

function getTodayEntryState(stored, dayKey) {
  const allDays = (stored || {}).daily || {};
  const legacyCheckedMap = (stored || {}).checkedMap || {};
  const today = allDays[dayKey] || {};
  return {
    checkedMap: today.checkedMap || legacyCheckedMap || {},
    heartCardDone: !!today.heartCardDone,
    heartCardDoneAt: today.heartCardDoneAt || null
  };
}

function isTodayScoreReady(scoreState, dayKey, todayReview) {
  const records = (scoreState || {}).records || {};
  const record = records[dayKey];
  if (!record) return false;
  const reviewTime = Number((todayReview || {}).updatedAt || 0);
  if (!reviewTime) return true;
  return Number(record.updatedAt || 0) >= reviewTime;
}

function isHeartCardReady({ heartCardRecord, heartCardDone, heartCardDoneAt, zhixingScoreState, dayKey }) {
  const scoreRecord = ((zhixingScoreState || {}).records || {})[dayKey] || {};
  const scoreTime = Number(scoreRecord.updatedAt || 0);
  const cardRecord = heartCardRecord || {};
  const cardTime = Number(cardRecord.updatedAt || cardRecord.completedAt || heartCardDoneAt || 0);
  const recordDone = !!cardRecord.completed || !!heartCardDone;
  if (!recordDone) return false;
  if (!scoreTime) return !!cardTime;
  return cardTime >= scoreTime;
}

function buildHomeRitualState({
  checkedCount = 0,
  dailyContent = {},
  mind = null,
  training = {},
  todayReview = null,
  zhixingScoreState = {},
  heartCardDone = false,
  heartCardDoneAt = null,
  heartCardRecord = null,
  dayKey = ""
} = {}) {
  const allSealed = checkedCount >= VOWS.length;
  const mindDone = !!mind;
  const trainingDone = !!(training || {}).completed;
  const reviewDone = !!todayReview;
  const zhixingReady = isTodayScoreReady(zhixingScoreState, dayKey, todayReview);
  const actionText = (dailyContent || {}).trainingAction || (dailyContent || {}).training || "只守住今日这一念。";
  const cardDone = isHeartCardReady({
    heartCardRecord,
    heartCardDone,
    heartCardDoneAt,
    zhixingScoreState,
    dayKey
  });

  if (!allSealed) {
    return {
      key: "seal",
      buttonText: "落下今日三印",
      primaryLabel: "今日下一步",
      primaryText: "先落三印，再入今日事上练。",
      statusLine: `${checkedCount}/3 已落印`,
      localNote: "今日戒未立，先把三条承诺落成印。",
      edictHint: "落下三印后，今日心证才真正开始。",
      cardKicker: "未落印",
      cardTitle: "心证卡尚未开卷",
      cardCopy: "先落三枚今日印，再把心证、事上练与知行合一沉淀成卡。",
      oathStatusText: `${checkedCount}/3 已落印`,
      oathHint: "点印，即立今日戒。",
      route: "",
      completed: false,
      cardDone: false
    };
  }

  if (!mindDone) {
    return {
      key: "mind",
      buttonText: "开始开盘照心",
      primaryLabel: "开盘照心",
      primaryText: "戒已立，先照见此心，再入今日事上练。",
      statusLine: "三印已成",
      localNote: "先照此心，再入今日一事。",
      edictHint: "三印已成，先完成开盘照心，再开始今日事上练。",
      cardKicker: "待照心",
      cardTitle: "心证卡等待照心",
      cardCopy: "今日心境会成为心证卡的一部分，不急着入事，先照见此心。",
      oathStatusText: "三印已成",
      oathHint: "今日戒已立，下一步先照此心。",
      route: "/pages/mind/index",
      completed: false,
      cardDone: false
    };
  }

  if (!trainingDone) {
    return {
      key: "training",
      buttonText: "开始今日事上练",
      primaryLabel: "今日事上练",
      primaryText: actionText,
      statusLine: "三印已成",
      localNote: "戒已立，今日只练这一件事。",
      edictHint: "三印已成，完成今日事上练后进入收盘省察。",
      cardKicker: "三印已成",
      cardTitle: "今日心证卡待省察",
      cardCopy: "完成事上练、省察与知行校准后，今日心证卡才算落成。",
      oathStatusText: "三印已成",
      oathHint: "今日戒已立，可以入今日一事。",
      route: "/pages/training/index",
      completed: false,
      cardDone: false
    };
  }

  if (!reviewDone) {
    return {
      key: "review",
      buttonText: "进入收盘省察",
      primaryLabel: "收盘省察",
      primaryText: "事上练已完成，收盘只问：今日是否知行合一？",
      statusLine: "事上练已成",
      localNote: "不要急着看分数，先照见今日一念。",
      edictHint: "事上练已成，做完收盘省察后再校准知行指数。",
      cardKicker: "待省察",
      cardTitle: "心证卡尚缺一问",
      cardCopy: "写下今日偏差与明日克治动作，心证卡才有真正重量。",
      oathStatusText: "三印已成",
      oathHint: "戒已立，事已练，收盘回来省察此心。",
      route: "/pages/review/index",
      completed: false,
      cardDone: false
    };
  }

  if (!zhixingReady) {
    return {
      key: "zhixing",
      buttonText: "更新知行指数",
      primaryLabel: "知行校准",
      primaryText: "用今日事上练与省察，校准一次知行合一。",
      statusLine: "省察已成",
      localNote: "省察已保存，现在把今日知行落成记录。",
      edictHint: "省察已成，更新知行指数后即可落成今日心证卡。",
      cardKicker: "待知行",
      cardTitle: "心证卡等待校准",
      cardCopy: "知行指数更新后，今日心证、戒律与成长会归入同一张卡。",
      oathStatusText: "三印已成",
      oathHint: "今日戒已立，省察已成，只差知行校准。",
      route: "/pages/zhixing-index/index",
      completed: false,
      cardDone: false
    };
  }

  if (!cardDone) {
    return {
      key: "heartCard",
      buttonText: "落成今日心证卡",
      primaryLabel: "心证卡",
      primaryText: "今日心证、三印、事上练、省察与知行指数已齐。",
      statusLine: "知行已更新",
      localNote: "轻点落成，把今日修行收进一张心证卡。",
      edictHint: "知行已更新，落成今日心证卡后，回到同修区收束今日。",
      cardKicker: "待落成",
      cardTitle: "今日心证卡可以落成",
      cardCopy: "这不是截图广告，而是今日修行的结印。",
      oathStatusText: "三印已成",
      oathHint: "今日戒已立，知行已校准，可以落成心证卡。",
      route: "",
      completed: false,
      cardDone: false
    };
  }

  return {
    key: "done",
    buttonText: "今日已同守一戒",
    primaryLabel: "今日收束",
    primaryText: "今日心证已归卷，回到同行处，看见自己不是一人在修。",
    statusLine: "今日已成",
    localNote: "心证卡已落成，今日修行闭环完成。",
    edictHint: "今日心证卡已落成，可分享，也可静静收好。",
    cardKicker: "已落成",
    cardTitle: "今日心证卡已归卷",
    cardCopy: "今日已同守一戒。明日再照见此心。",
    oathStatusText: "三印已成",
    oathHint: "今日戒已守，明日再立。",
    route: "",
    completed: true,
    cardDone: true
  };
}

function buildVows(checkedMap) {
  return VOWS.map((item) => {
    const checked = !!checkedMap[item.key];
    return Object.assign({}, item, {
      checked,
      statusText: checked ? `已落${item.seal}印` : "点此落印"
    });
  });
}

function buildRitualProgress(checkedCount, ritualState = {}) {
  const ready = checkedCount >= VOWS.length;
  return {
    ready,
    statusText: ritualState.oathStatusText || (ready ? "三印已成" : `${checkedCount}/3 已落印`),
    hint: ritualState.oathHint || (ready ? "今日戒已立，可以入今日一事。" : "点印，即立今日戒。"),
    localNote: ritualState.localNote || (ready ? "三印已成，完成今日事上练即可落卡。" : "先立承诺，再入今日一事。"),
    cardKicker: ritualState.cardKicker || (ready ? "三印已成，待落成" : "完成今日修行后"),
    cardTitle: ritualState.cardTitle || (ready ? "今日心证卡待落成" : "落成一张心证卡"),
    cardCopy: ritualState.cardCopy || (ready
      ? "完成今日事上练后，心证、三印与今日修行会沉淀在同一张卡里。"
      : "楷书心证、关卡印、连修记录会沉淀在同一张卡里。"),
    edictHint: ritualState.edictHint || (ready ? "三印已成，修完今日事上练，此页即成今日心证卡。" : "修完今日事上练，此页即落成可分享心证卡。")
  };
}

function buildStageView(stageState, dailyContent) {
  const safeStageState = stageState || {};
  const safeContent = dailyContent || {};
  const stages = safeStageState.stages || [];
  const currentStage = safeStageState.currentStage || {};
  const todayStage = stages.find((stage) => stage.key === safeContent.stageKey) || currentStage;

  return {
    todayTitle: safeContent.stageTitle || todayStage.title || safeContent.stageName || "今日所修",
    todayProgress: Number(todayStage.progress || 0),
    todayProgressText: todayStage.progressText || "今日所修",
    personalTitle: currentStage.title || "第1关：立志",
    personalProgressText: currentStage.progressText || "待开启"
  };
}

function normalizeStageTitle(title, stageName) {
  const text = title || stageName || "今日修行关卡";
  const orderMap = {
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六"
  };
  return text
    .replace(/第(\d+)关/, (_, order) => `第${orderMap[order] || order}关`)
    .replace("：", " · ");
}

function splitHeartProofLines(heartProof) {
  const text = String(heartProof || "先立其志，再入其事。").trim();
  if (text.length <= 9) return [text];
  const match = text.match(/^(.{2,9})[，,、；;](.+)$/);
  if (match) {
    return [
      match[1].replace(/[，,、；;。.]$/, ""),
      match[2].trim()
    ].filter(Boolean);
  }
  const middle = Math.ceil(text.length / 2);
  return [text.slice(0, middle), text.slice(middle)].filter(Boolean);
}

function buildHeroView(dailyContent) {
  const safeContent = dailyContent || {};
  return {
    dayLabel: safeContent.id || "Day001",
    todayStageLabel: normalizeStageTitle(safeContent.stageTitle, safeContent.stageName),
    heartProofLines: splitHeartProofLines(safeContent.heartProof),
    interpretation: safeContent.interpretation || safeContent.review || "市场不是敌人，失守的念头才是。",
    commandment: safeContent.commandment || "无计划，不行动。"
  };
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const source = String(text || "");
  const lines = [];
  let line = "";
  source.split("").forEach((char) => {
    const testLine = `${line}${char}`;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function drawQrMark(ctx, x, y, size) {
  const block = size / 5;
  ctx.fillStyle = "rgba(255, 250, 235, 0.9)";
  drawRoundRect(ctx, x, y, size, size, size * 0.08);
  ctx.fill();
  QR_BLOCKS.forEach((item) => {
    if (!item.active) return;
    const col = item.key % 5;
    const row = Math.floor(item.key / 5);
    ctx.fillStyle = "#10140f";
    ctx.fillRect(x + col * block + block * 0.18, y + row * block + block * 0.18, block * 0.64, block * 0.64);
  });
}

function drawSeal(ctx, x, y, size, text) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(116, 37, 28, 0.52)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(182, 74, 52, 0.78)";
  ctx.stroke();
  ctx.font = `${Math.round(size * 0.46)}px "LXGW WenKai", "Songti SC", serif`;
  ctx.fillStyle = "rgba(255, 236, 205, 0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text || "知", 0, 1);
  ctx.restore();
}

function drawHeartProofPoster(ctx, payload, width, height) {
  const card = payload.shareCard || {};
  const hero = payload.heroView || {};
  const daily = payload.dailyContent || {};
  const margin = Math.round(width * 0.11);
  const posterWidth = width - margin * 2;
  const posterTop = Math.round(height * 0.17);
  const posterBottom = Math.round(height * 0.84);
  const heartLines = (hero.heartProofLines && hero.heartProofLines.length)
    ? hero.heartProofLines
    : splitHeartProofLines(card.heartProof || daily.heartProof);
  const stageText = `${card.dayId || daily.id || "Day001"} · ${hero.todayStageLabel || card.stageName || daily.stageName || "今日所修"}`;
  const interpretation = hero.interpretation || daily.interpretation || daily.review || "市场不是敌人，失守的念头才是。";
  const commandment = card.commandment || daily.commandment || "无计划，不行动。";
  const training = daily.trainingAction || card.training || daily.training || "只守住今日这一念。";

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#111713");
  bg.addColorStop(0.58, "#070b0a");
  bg.addColorStop(1, "#030505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.18, 0, width * 0.5, height * 0.18, width * 0.55);
  glow.addColorStop(0, "rgba(232, 199, 106, 0.16)");
  glow.addColorStop(1, "rgba(232, 199, 106, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(70, 92, 82, 0.11)";
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.91, width * 0.52, height * 0.15, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(232, 199, 106, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, posterTop);
  ctx.lineTo(width - margin, posterTop);
  ctx.moveTo(margin, posterBottom);
  ctx.lineTo(width - margin, posterBottom);
  ctx.stroke();

  drawRoundRect(ctx, margin, 46, 52, 52, 15);
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  ctx.fill();
  ctx.strokeStyle = "rgba(232, 199, 106, 0.28)";
  ctx.stroke();
  ctx.font = '31px "LXGW WenKai", "Songti SC", serif';
  ctx.fillStyle = "#e8c76a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("知", margin + 26, 72);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = '600 17px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(255,255,245,0.9)";
  ctx.fillText(card.brand || "阳明心学交易系统", margin + 68, 66);
  ctx.font = '600 10px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.56)";
  ctx.fillText("今日心证 · 照见本心", margin + 68, 86);

  ctx.font = '700 13px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.68)";
  ctx.fillText(stageText, margin, posterTop + 48);

  ctx.font = '700 13px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.5)";
  ctx.fillText("今日心证", margin, posterTop + 92);

  ctx.font = `600 ${Math.round(width * 0.105)}px "LXGW WenKai", "Songti SC", serif`;
  ctx.fillStyle = "rgba(255,250,235,0.96)";
  heartLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, margin, posterTop + 152 + index * Math.round(width * 0.122));
  });

  ctx.font = '16px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(255,255,245,0.58)";
  drawWrappedText(ctx, interpretation, margin, posterTop + 276, posterWidth, 28, 2);

  const lawTop = posterTop + 360;
  ctx.font = '700 11px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.54)";
  ctx.fillText("今日戒律", margin, lawTop);
  ctx.font = '500 20px "LXGW WenKai", "Songti SC", serif';
  ctx.fillStyle = "rgba(255,250,235,0.88)";
  drawWrappedText(ctx, commandment, margin, lawTop + 34, posterWidth, 30, 2);

  ctx.font = '700 11px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.46)";
  ctx.fillText("今日事上练", margin, lawTop + 104);
  ctx.font = '14px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(255,255,245,0.52)";
  drawWrappedText(ctx, training, margin, lawTop + 130, posterWidth - 80, 24, 3);

  drawSeal(ctx, width - margin - 78, posterBottom - 106, 78, (card.stageSeal || {}).seal || "知");

  ctx.font = '700 12px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(232,199,106,0.58)";
  ctx.fillText(`${card.rankName || "观己"} · ${card.streakText || "0日连修"} · ${card.scoreText || "待生成知行"}`, margin, posterBottom + 44);
  ctx.font = '11px "HarmonyOS Sans SC", sans-serif';
  ctx.fillStyle = "rgba(255,255,245,0.36)";
  ctx.fillText(card.footer || "不做行情评判，不推荐标的。只修说到做到。", margin, posterBottom + 72);
  drawQrMark(ctx, width - margin - 54, posterBottom + 22, 54);
}

function getStageButtonText(stageKey) {
  const map = {
    lizhi: "立志入院",
    zhaoxin: "开始照心",
    shishangmo: "开始今日事上练",
    poxinzei: "照见心贼",
    zhixing: "校准知行",
    zhiliangzhi: "今日省察"
  };
  return map[stageKey] || "开始今日修行";
}

function getStageRoute(stageKey, assessment) {
  const map = {
    lizhi: "/pages/mind/index",
    zhaoxin: "/pages/mind/index",
    shishangmo: "/pages/training/index",
    poxinzei: assessment ? "/pages/report/index" : "/pages/assessment/index",
    zhixing: "/pages/zhixing-index/index",
    zhiliangzhi: "/pages/review/index"
  };
  return map[stageKey] || "/pages/mind/index";
}

function getScoreDeltaText(scoreState) {
  const records = Object.keys((scoreState || {}).records || {})
    .sort()
    .map((key) => Number(((scoreState || {}).records || {})[key].total || 0))
    .filter(Boolean);
  const latest = Number(((scoreState || {}).latest || {}).total || records[records.length - 1] || 0);
  if (!latest) return "待校准";
  if (records.length < 2) return `${latest}`;
  const delta = latest - records[records.length - 2];
  return delta > 0 ? `+${delta}` : String(delta);
}

function getShortStageName(title) {
  return String(title || "今日关卡")
    .replace(/^第\d+关[：·\s]*/, "")
    .replace(/^·\s*/, "");
}

function buildCompanionView({ companionSystem, continuity, stageView, zhixingScoreState, dailyContent, homeRitualState, heartCardRecord }) {
  const system = companionSystem || {};
  const mindStat = (system.todayStats || []).find((item) => item.key === "mind");
  const count = Number((system.todayCount || {}).value || 0);
  const vowStat = (system.todayStats || []).find((item) => item.key === "vow");
  const mindDone = Number(mindStat ? mindStat.value : 0);
  const vowDone = Number(vowStat ? vowStat.value : 0);
  const stageShort = getShortStageName((stageView || {}).todayTitle);
  const stageMates = Math.max(mindDone, Math.round(count * 0.38));
  const oathMates = Math.max(vowDone, Math.round(count * 0.52), 12);
  const content = dailyContent || {};
  const lampCount = Math.max(3, Math.min(9, Math.round(stageMates / 18)));
  const ritual = homeRitualState || {};
  const cardRecord = heartCardRecord || {};
  const closed = ritual.key === "done";
  const sameCommandment = cardRecord.commandment || content.commandment || "无计划，不行动。";
  return {
    count,
    mindDone,
    stageMates,
    oathMates,
    stageShort,
    lamps: Array.from({ length: 9 }).map((_, index) => ({ key: index, active: index < lampCount })),
    unityLine: closed ? `今日已同守一戒，${oathMates} 位同修与你归卷。` : `今日已有 ${count} 位同修，与你同守一戒。`,
    sameStageLine: `今天，也有人在修「${stageShort}」。`,
    companionRitualLine: `${stageMates} 位同修正在守同一关，${oathMates} 位已同守一条戒。`,
    echoes: [
      { key: "mind", seal: "照", text: `${mindDone} 位同修已完成照心，先看此心，再入今日一事。` },
      { key: "vow", seal: "戒", text: `${oathMates} 位同修共守一条戒：${sameCommandment}` },
      { key: "practice", seal: "修", text: `今天同练事上练：${content.trainingAction || "只守住今天这一念。"}` }
    ],
    streak: Number((continuity || {}).currentStreak || 0),
    personalStage: stageView.personalTitle,
    personalProgress: stageView.personalProgressText,
    zhixingDelta: getScoreDeltaText(zhixingScoreState),
    note: "只看同修、戒律、省察与成长。",
    whisper: closed ? "今天已经收束。不是一个人在修，是一群人同守一戒。" : "不比较，不看结果，只把今日这一念守住。"
  };
}

const initialDailyContent = getTodayContent();
const initialHomeRitualState = buildHomeRitualState({
  checkedCount: 0,
  dailyContent: initialDailyContent,
  dayKey: todayKey()
});

Page({
  data: {
    phone: "",
    vows: buildVows({}),
    checkedMap: {},
    checkedCount: 0,
    sealEffectKey: "",
    ritualProgress: buildRitualProgress(0, initialHomeRitualState),
    qrBlocks: QR_BLOCKS,
    buttonText: initialHomeRitualState.buttonText,
    ripple: null,
    posterMode: false,
    dailyContent: initialDailyContent,
    hasAssessment: false,
    heroView: buildHeroView(initialDailyContent),
    stageState: buildStageState({}),
    stageView: buildStageView(buildStageState({}), initialDailyContent),
    companionView: buildCompanionView({
      companionSystem: buildCompanionSystem({}),
      continuity: {},
      stageView: buildStageView(buildStageState({}), initialDailyContent),
      zhixingScoreState: {},
      dailyContent: initialDailyContent,
      homeRitualState: initialHomeRitualState,
      heartCardRecord: null
    }),
    shareCard: buildHeartProofShareCard({ dailyContent: initialDailyContent, stageState: buildStageState({}) }),
    heartCardRecord: null,
    heartCardImagePath: "",
    primaryTaskLabel: initialHomeRitualState.primaryLabel,
    primaryTaskText: initialHomeRitualState.primaryText,
    homeRitualState: initialHomeRitualState,
    loopState: buildDailyLoopState({}),
    loopSteps: []
  },

  onShow() {
    this.loadEntryState();
  },

  onUnload() {
    clearTimeout(this.sealEffectTimer);
  },

  loadEntryState() {
    const currentDay = todayKey();
    const stored = getStoredEntryState();
    const todayEntry = getTodayEntryState(stored, currentDay);
    const checkedMap = todayEntry.checkedMap || {};
    const checkedCount = VOWS.filter((item) => checkedMap[item.key]).length;
    const profile = getProfile();
    const mind = getTodayMind();
    const mindRecords = getMindRecords();
    const assessment = getAssessmentResult();
    const training = getTodayTraining();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const todayReview = getTodayReview();
    const zhixingScoreState = getZhixingScoreState();
    const todayHeartCard = getTodayHeartCard();
    const continuity = buildContinuityState({
      profile,
      mindRecords,
      trainingState,
      reviews,
      todayKey: currentDay
    });
    const loopState = saveDailyLoopState(buildDailyLoopState({
      todayKey: currentDay,
      profile,
      vowsSealed: checkedCount >= VOWS.length,
      mind,
      assessment,
      training,
      todayReview,
      zhixingScoreState,
      heartCardRecord: todayHeartCard
    }));
    const stageState = buildStageState({
      profile,
      mind,
      mindRecords,
      assessment,
      training,
      trainingState,
      todayReview,
      reviews,
      continuity,
      zhixingScore: zhixingScoreState.latest || {}
    });
    const dailyContent = getTodayContent();
    const heroView = buildHeroView(dailyContent);
    const stageView = buildStageView(stageState, dailyContent);
    const homeRitualState = buildHomeRitualState({
      checkedCount,
      dailyContent,
      mind,
      training,
      todayReview,
      zhixingScoreState,
      heartCardDone: todayEntry.heartCardDone,
      heartCardDoneAt: todayEntry.heartCardDoneAt,
      heartCardRecord: todayHeartCard,
      dayKey: currentDay
    });
    const companionSystem = buildCompanionSystem({
      todayKey: currentDay,
      profile,
      assessment,
      mind,
      training,
      review: todayReview,
      continuity,
      zhixingScore: zhixingScoreState.latest || zhixingScoreState,
      growth: { activeGate: stageState.currentStage }
    });
    const companionView = buildCompanionView({
      companionSystem,
      continuity,
      stageView,
      zhixingScoreState,
      dailyContent,
      homeRitualState,
      heartCardRecord: todayHeartCard
    });
    const shareCard = buildHeartProofShareCard({
      dailyContent,
      stageState,
      profile,
      zhixingScoreState,
      continuity,
      trainingState,
      reviews
    });
    this.setData({
      phone: stored.phone || profile.phone || "",
      vows: buildVows(checkedMap),
      checkedMap,
      checkedCount,
      ritualProgress: buildRitualProgress(checkedCount, homeRitualState),
      buttonText: homeRitualState.buttonText,
      primaryTaskLabel: homeRitualState.primaryLabel,
      primaryTaskText: homeRitualState.primaryText,
      homeRitualState,
      heroView,
      stageState,
      stageView,
      companionView,
      shareCard,
      heartCardRecord: todayHeartCard,
      heartCardImagePath: (todayHeartCard || {}).imagePath || "",
      loopState,
      loopSteps: loopState.steps,
      dailyContent,
      hasAssessment: !!assessment
    });
  },

  saveEntryState(patch) {
    const current = getStoredEntryState();
    const next = Object.assign({}, current, patch, { updatedAt: Date.now() });
    wx.setStorageSync(ENTRY_STATE_KEY, next);
    return next;
  },

  saveTodayEntryState(patch) {
    const current = getStoredEntryState();
    const currentDay = todayKey();
    const daily = Object.assign({}, current.daily || {});
    daily[currentDay] = Object.assign({}, daily[currentDay] || {}, patch, { updatedAt: Date.now() });
    const next = Object.assign({}, current, { daily, updatedAt: Date.now() });
    wx.setStorageSync(ENTRY_STATE_KEY, next);
    return next;
  },

  inputPhone(e) {
    const phone = e.detail.value;
    this.saveEntryState({ phone });
    this.setData({
      phone
    });
  },

  toggleVow(e) {
    const key = e.currentTarget.dataset.key;
    const wasChecked = !!this.data.checkedMap[key];
    const checkedMap = Object.assign({}, this.data.checkedMap, {
      [key]: !this.data.checkedMap[key]
    });
    const checkedCount = VOWS.filter((item) => checkedMap[item.key]).length;
    const entryPatch = { checkedMap };
    if (checkedCount < VOWS.length) {
      entryPatch.heartCardDone = false;
      entryPatch.heartCardDoneAt = null;
      clearTodayHeartCard();
    }
    this.saveTodayEntryState(entryPatch);
    if (checkedCount >= VOWS.length) {
      updateProfile({ vowsAccepted: true, lastVowDate: todayKey() });
      syncLocalState({ silent: true }).catch(() => {});
    }
    this.loadEntryState();
    if (!wasChecked && checkedMap[key]) this.setData({ sealEffectKey: key });
    if (!wasChecked && checkedMap[key]) {
      clearTimeout(this.sealEffectTimer);
      this.sealEffectTimer = setTimeout(() => {
        if (this.data.sealEffectKey === key) this.setData({ sealEffectKey: "" });
      }, 760);
    }
  },

  beginTodayRitual() {
    this.handleTodayAction();
  },

  enterRitual() {
    this.handleTodayAction();
  },

  persistRitualEntry() {
    const phone = String(this.data.phone || "").trim();
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "手机号格式不完整", icon: "none" });
      return false;
    }
    if (this.data.checkedCount < VOWS.length) {
      wx.showToast({ title: "请先落下今日三印", icon: "none" });
      return false;
    }

    this.saveEntryState({ phone, entered: true, enteredAt: Date.now() });
    const profilePatch = {
      stage: this.data.stageState.currentStage.name,
      vowsAccepted: true
    };
    if (phone) profilePatch.phone = phone;
    updateProfile(profilePatch);
    syncLocalState({ silent: true }).catch(() => {});
    return true;
  },

  generateHeartCardImage() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select("#heartCardCanvas").fields({ node: true, size: true }).exec((res) => {
        const canvasInfo = res && res[0];
        if (!canvasInfo || !canvasInfo.node) {
          reject(new Error("心证卡画布未就绪"));
          return;
        }

        const canvas = canvasInfo.node;
        const width = Math.max(Number(canvasInfo.width || 0), 320);
        const height = Math.max(Number(canvasInfo.height || 0), 560);
        const dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);
        drawHeartProofPoster(ctx, {
          shareCard: this.data.shareCard,
          heroView: this.data.heroView,
          dailyContent: this.data.dailyContent
        }, width, height);
        ctx.restore();

        wx.canvasToTempFilePath({
          canvas,
          fileType: "png",
          quality: 1,
          destWidth: width * dpr,
          destHeight: height * dpr,
          success: (result) => resolve(result.tempFilePath),
          fail: (error) => reject(new Error((error && error.errMsg) || "心证卡生成失败"))
        }, this);
      });
    });
  },

  persistHeartCardImage(tempFilePath) {
    return new Promise((resolve) => {
      if (!tempFilePath || !wx.getFileSystemManager) {
        resolve(tempFilePath);
        return;
      }
      try {
        wx.getFileSystemManager().saveFile({
          tempFilePath,
          success: (result) => resolve(result.savedFilePath || tempFilePath),
          fail: () => resolve(tempFilePath)
        });
      } catch (error) {
        resolve(tempFilePath);
      }
    });
  },

  async completeHeartCard({ preview = false } = {}) {
    wx.showLoading({ title: "落成中", mask: true });
    try {
      const tempFilePath = await this.generateHeartCardImage();
      const imagePath = await this.persistHeartCardImage(tempFilePath);
      const card = this.data.shareCard || {};
      const daily = this.data.dailyContent || {};
      const scoreState = getZhixingScoreState();
      const latestScore = scoreState.latest || {};
      const record = saveTodayHeartCard({
        dayKey: todayKey(),
        dayId: daily.id || card.dayId,
        stageKey: daily.stageKey || "",
        stageName: daily.stageName || card.stageName,
        heartProof: daily.heartProof || card.heartProof,
        commandment: daily.commandment || card.commandment,
        trainingAction: daily.trainingAction || daily.training || card.training,
        reflectionQuestion: daily.reflectionQuestion || daily.review || "",
        zhixingDimension: daily.zhixingDimension || "",
        score: latestScore.total || 0,
        rankName: card.rankName,
        streakText: card.streakText,
        imagePath,
        tempFilePath,
        shareTitle: card.shareTitle,
        sharePath: card.sharePath,
        source: "home_canvas",
        completedAt: Date.now()
      });

      this.saveTodayEntryState({
        heartCardDone: true,
        heartCardDoneAt: record.latest.updatedAt,
        heartCardImagePath: imagePath
      });
      updateProfile({ lastHeartCardDay: todayKey(), lastHeartCardAt: Date.now() });
      syncLocalState({ silent: true }).catch(() => {});
      wx.hideLoading();
      wx.showToast({ title: "心证卡已落成", icon: "success" });
      this.loadEntryState();
      setTimeout(() => {
        if (preview && imagePath) {
          wx.previewImage({ urls: [imagePath], current: imagePath });
          return;
        }
        wx.pageScrollTo({
          selector: ".scene-companion",
          duration: 560
        });
      }, 380);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || "心证卡生成失败", icon: "none" });
    }
  },

  handleTodayAction() {
    const ritual = this.data.homeRitualState || {};
    if (ritual.key === "seal") {
      wx.pageScrollTo({
        selector: ".scene-oath",
        duration: 520
      });
      return;
    }
    if (ritual.key === "heartCard") {
      this.completeHeartCard();
      return;
    }
    if (ritual.key === "done") {
      wx.pageScrollTo({
        selector: ".scene-companion",
        duration: 560
      });
      return;
    }
    if (!this.persistRitualEntry()) return;
    wx.redirectTo({
      url: ritual.route || getStageRoute((this.data.dailyContent || {}).stageKey, this.data.hasAssessment)
    });
  },

  previewHeartCard() {
    const record = this.data.heartCardRecord || getTodayHeartCard();
    const imagePath = (record || {}).imagePath || this.data.heartCardImagePath;
    const ritualKey = (this.data.homeRitualState || {}).key;
    if (ritualKey === "done" && imagePath) {
      wx.previewImage({ urls: [imagePath], current: imagePath });
      return;
    }
    if (ritualKey === "heartCard" || ritualKey === "done") {
      this.completeHeartCard({ preview: true });
      return;
    }
    wx.showToast({ title: "完成今日闭环后落成", icon: "none" });
  },

  goDailyTool(e) {
    const key = e.currentTarget.dataset.key;
    const url = e.currentTarget.dataset.url;
    if (key === "companion") {
      wx.showModal({
        title: "今日陪伴",
        content: this.data.companionPrompt,
        showCancel: false,
        confirmText: "记下这一念"
      });
      return;
    }
    if (url) wx.redirectTo({ url });
  },

  goContent365() {
    wx.navigateTo({ url: "/pages/content365/index" });
  },

  goLoopStep(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const step = this.data.loopSteps[index];
    if (!step) return;
    if (step.locked) {
      wx.showToast({ title: `请先完成${this.data.loopState.nextStep.name}`, icon: "none" });
      return;
    }
    wx.redirectTo({ url: step.route });
  },

  goNextStep() {
    const nextStep = this.data.loopState.nextStep || {};
    wx.redirectTo({ url: nextStep.route || "/pages/mind/index" });
  },

  openPosterMode() {
    this.setData({
      posterMode: true,
      ripple: null
    });
  },

  closePosterMode() {
    this.setData({ posterMode: false });
  },

  noop() {},

  createRipple(e) {
    if (this.data.posterMode) return;
    if (e.target && e.target.dataset && e.target.dataset.noripple) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const id = Date.now();
    this.setData({
      ripple: {
        id,
        x: touch.clientX,
        y: touch.clientY
      }
    });
    setTimeout(() => {
      if (this.data.ripple?.id === id) this.setData({ ripple: null });
    }, 460);
  },

  onShareAppMessage() {
    const card = this.data.shareCard || {};
    const record = this.data.heartCardRecord || getTodayHeartCard();
    return {
      title: card.shareTitle || "今日心证：先立其志，再入其事。",
      path: card.sharePath || "/pages/home/index",
      imageUrl: (record || {}).imagePath || ""
    };
  },

  onShareTimeline() {
    const card = this.data.shareCard || {};
    const record = this.data.heartCardRecord || getTodayHeartCard();
    return {
      title: card.shareTitle || "今日心证：先立其志，再入其事。",
      query: `day=${(this.data.dailyContent || {}).dayNumber || 1}&from=timeline`,
      imageUrl: (record || {}).imagePath || ""
    };
  }
});
