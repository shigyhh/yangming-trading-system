const assert = require("assert");
const { readFileSync, readdirSync, statSync } = require("fs");
const { join } = require("path");
const {
  buildHomeTodayStateView
} = require("./modules/mini-loop/index");
const {
  buildKlineMindSession
} = require("./modules/kline-mind/index");

const root = process.cwd();

function collectFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? collectFiles(file) : file;
  });
}

function readPage(page, file) {
  return readFileSync(join(root, "miniprogram", "pages", page, file), "utf8");
}

const allPageWxml = collectFiles(join(root, "miniprogram", "pages"))
  .filter((file) => file.endsWith(".wxml"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const homeWxml = readPage("home", "index.wxml");
const profileWxml = readPage("profile", "index.wxml");
const trainingWxml = readPage("training", "index.wxml");
const livingMirrorWxml = readPage("living-mirror", "index.wxml");
const livingMirrorJs = readPage("living-mirror", "index.js");
const klineMindWxml = readPage("kline-mind", "index.wxml");
const klineMindJs = readPage("kline-mind", "index.js");
const klineMindJson = readPage("kline-mind", "index.json");
const tradeReviewWxml = readPage("trade-review", "index.wxml");
const tradeReviewJs = readPage("trade-review", "index.js");
const reportWxml = readPage("report", "index.wxml");
const profileJs = readPage("profile", "index.js");
const appJs = readFileSync(join(root, "miniprogram", "app.js"), "utf8");
const appJsonText = readFileSync(join(root, "miniprogram", "app.json"), "utf8");
const appJson = JSON.parse(appJsonText);
const appWxss = readFileSync(join(root, "miniprogram", "app.wxss"), "utf8");
const bottomTabWxss = readFileSync(join(root, "miniprogram", "components", "bottom-tab-bar", "index.wxss"), "utf8");
const bottomTabJs = readFileSync(join(root, "miniprogram", "components", "bottom-tab-bar", "index.js"), "utf8");
const bottomTabWxml = readFileSync(join(root, "miniprogram", "components", "bottom-tab-bar", "index.wxml"), "utf8");
const complianceNoticeJs = readFileSync(join(root, "miniprogram", "components", "compliance-notice", "index.js"), "utf8");
const complianceNoticeWxml = readFileSync(join(root, "miniprogram", "components", "compliance-notice", "index.wxml"), "utf8");
const complianceNoticeWxss = readFileSync(join(root, "miniprogram", "components", "compliance-notice", "index.wxss"), "utf8");
const homeWxss = readPage("home", "index.wxss");
const klineMindWxss = readPage("kline-mind", "index.wxss");
const tradeReviewWxss = readPage("trade-review", "index.wxss");
const trainingWxss = readPage("training", "index.wxss");
const livingMirrorWxss = readPage("living-mirror", "index.wxss");
const profileWxss = readPage("profile", "index.wxss");

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end > start ? text.slice(start, end) : text.slice(start);
}

function assertRuleHas(css, selector, properties, message) {
  const marker = `${selector} {`;
  const index = css.indexOf(marker);
  assert.ok(index >= 0, `${message}: missing selector ${selector}`);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  assert.ok(start > index && end > start, `${message}: malformed rule ${selector}`);
  const block = css.slice(start + 1, end);
  properties.forEach((property) => {
    assert.ok(block.includes(property), `${message}: ${selector} should include ${property}`);
  });
}

const todayStateView = buildHomeTodayStateView({
  status: "not_trained",
  nextAction: "K线训练",
  progress: 35,
  updatedAt: "2026-06-24T12:24:12.853Z"
});

assert.equal(
  /T\d{2}:\d{2}:\d{2}/.test(todayStateView.updatedAt),
  false,
  "home today state should not expose raw ISO time"
);
assert.ok(
  todayStateView.updatedAt.includes("更新"),
  "home today state should render a reader-facing update label"
);
assert.ok(
  homeWxml.includes("serverTodayStateView.updatedAt"),
  "home should keep rendering the normalized TodayState update label"
);
assert.ok(
  homeWxml.includes("{{homeFocusView.done ? '' : 'single-focus'}}"),
  "home incomplete first screen should use the compact single-focus layout"
);

const demoSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "30m",
    historySlice: {
      source: "local_demo",
      candles: [
        { date: "2024-01-02", open: 9.2, high: 9.4, low: 9.1, close: 9.32, volume: 1000 },
        { date: "2024-01-03", open: 9.31, high: 9.5, low: 9.2, close: 9.22, volume: 1200 },
        { date: "2024-01-04", open: 9.2, high: 9.7, low: 9.16, close: 9.62, volume: 2200 },
        { date: "2024-01-05", open: 9.6, high: 9.66, low: 9.3, close: 9.34, volume: 1900 },
        { date: "2024-01-08", open: 9.35, high: 9.42, low: 9.18, close: 9.28, volume: 1400 },
        { date: "2024-01-09", open: 9.3, high: 9.58, low: 9.24, close: 9.52, volume: 2100 }
      ]
    }
  }
});
assert.strictEqual(demoSession.dataStatusText, "离线练习模式");
assert.equal(klineMindWxml.includes("session.market.defaultSymbol"), false, "kline mind page should not expose raw symbol codes in status meta");
assert.equal(klineMindWxml.includes("数据状态"), false, "kline mind page should use user-facing source labels");
assert.equal(klineMindWxml.includes('class="sim-meta"'), false, "kline mind should not render cockpit-style data status blocks");
assert.ok(klineMindWxml.includes('class="wave-source-line"'), "kline mind should collapse source/rhythm into quiet metadata");
assert.ok(klineMindWxml.includes("K线盲练"), "kline mind should frame the session as K-line blind practice");
assert.ok(klineMindWxml.includes("今日针对训练"), "kline mind should surface review-driven targeted training when mistake cards exist");
assert.ok(klineMindJs.includes("buildReviewTrainingFocus"), "kline mind should read real-review mistake patterns before building the daily training line");
assert.equal(klineMindWxml.includes("真实历史盲练"), false, "kline mind should not keep a duplicated blind-practice control block above the chart");
assert.ok(klineMindWxml.includes('wx:if="{{savedRecord && savedRecord.completed}}" class="path-links"'), "kline mind should show cross-page links only after the record is complete");
assertRuleHas(klineMindWxss, ".wave-board", ["position: relative", "overflow: hidden"], "kline mind wave board should act as a fixed blind viewport");
assertRuleHas(klineMindWxss, ".wave-board-content", ["width: 100%", "display: flex", "gap: var(--kline-gap, 6rpx)"], "kline mind candle strip should fill the visible board and rely on scroll-left for the current-candle boundary");

assert.ok(profileWxml.includes('wx:if="{{debugMode}}" class="debug-release-tools card"'), "profile debug release tools should be hidden behind debugMode");
assert.equal(profileWxml.includes('class="danger-clear"'), false, "profile should not expose dangerous clear action in normal page flow");
assert.ok(profileWxml.includes('wx:if="{{debugMode}}" class="membership-card card"'), "membership system should be hidden for release preview");
assert.ok(profileWxml.includes('wx:if="{{debugMode}}" class="subscription-card card"'), "subscription proof should be hidden for release preview");
assert.equal(profileWxml.includes("生成同修身份证明"), false, "profile should not expose unfinished identity proof CTA");
assert.equal(profileWxml.includes("小程序定位"), false, "profile should not show internal product positioning copy in the normal user center");
assert.equal(profileWxml.includes('class="mission-card card"'), false, "profile should not render product positioning as a normal card");

assert.ok(trainingWxml.includes('wx:if="{{showTrainingPlan}}" class="seven-day-list quiet-plan-list"'), "training full seven-day list should be opt-in and visually quiet");
assert.ok(trainingWxml.includes("toggleTrainingPlan"), "training should expose a plan toggle instead of dumping every day on first screen");
assert.ok(trainingWxml.indexOf('class="seven-training-card card"') < trainingWxml.indexOf('class="mind-bridge card"'), "training should lead with the current day instead of an auxiliary bridge card");
assert.ok(trainingWxml.includes("今日只练一件事"), "training should frame the first screen as a single daily task");
assert.ok(trainingWxml.includes("开始K线观心"), "training should make the primary daily action clear and connected to the core K-line practice");

assert.ok(livingMirrorWxml.includes('class="mirror-summary-card card"'), "living mirror should lead with a compact growth summary");
assert.ok(livingMirrorWxml.includes("toggleMirrorDepth"), "living mirror should expose depth modules as opt-in");
assert.ok(livingMirrorWxml.includes('wx:if="{{showMirrorDepth}}" class="reminder-card card"'), "living mirror repeated next-action reminder should stay inside depth mode");
assert.ok(livingMirrorWxml.includes('wx:if="{{showMirrorDepth}}" class="stability-card card"'), "living mirror stability detail should be folded by default");
assert.ok(livingMirrorWxml.includes('wx:if="{{showMirrorDepth}}" class="triple-card card"'), "living mirror triple reflection detail should be folded by default");
assert.ok(livingMirrorJs.includes("formatLivingMirrorUpdatedAt(profile.updatedAt)"), "living mirror server profile time should be normalized for readers");
assert.equal(livingMirrorJs.includes("updatedAt: profile.updatedAt ||"), false, "living mirror should not pass raw server ISO time into the page");
assert.ok(livingMirrorJs.includes("buildTradeReviewTop3Stats"), "living mirror should compute Top3 mistake statistics from real-review records");
assert.ok(livingMirrorWxml.includes('class="review-top3-card card"'), "living mirror should surface a compact Top3 card from real reviews");
assert.ok(livingMirrorWxml.includes("近 {{reviewTop3.windowDays}} 天活镜"), "living mirror Top3 card should be named as a 30-day mirror");
assert.ok(livingMirrorWxml.includes("最高频错题"), "living mirror should show repeated mistake patterns");
assert.ok(livingMirrorWxml.includes("最高频第一念"), "living mirror should show first-thought frequency");
assert.ok(livingMirrorWxml.includes("下次执行动作"), "living mirror should show the highest-frequency next action");
assertRuleHas(livingMirrorWxss, ".review-top3-card", ["border: 1rpx solid rgba(216, 183, 111, 0.18)"], "living mirror Top3 card should match the mistake-card visual system");

assert.ok(tradeReviewWxml.includes('wx:if="{{showAdvanced}}" class="record-flow card"'), "trade review flow explainer should be opt-in detail");
assert.ok(tradeReviewWxml.includes('class="primary-btn upload-primary" bindtap="chooseImage"'), "trade review should make screenshot upload the main path");
assert.ok(tradeReviewWxml.includes('class="manual-anchor-link" bindtap="showManualAnchor"'), "trade review manual code entry should be a quiet fallback link");
assert.ok(tradeReviewWxml.indexOf("上传交易截图") < tradeReviewWxml.indexOf("没有截图，手动填写"), "trade review should present upload before manual fallback");
assert.ok(tradeReviewWxml.includes('bindtap="showManualAnchor"'), "trade review should support manual code/date anchors as the same review path");
assert.ok(tradeReviewWxml.includes('class="anchor-card card"'), "trade review should expose one shared anchor confirmation card");
assert.ok(tradeReviewWxml.includes("确认锚点"), "trade review should make manual and OCR market anchors explicit");
assert.equal(tradeReviewWxml.includes("数据品类"), false, "trade review should not expose unsupported market categories before they are ready");
assert.equal(tradeReviewWxml.includes("周期切片"), false, "trade review should default to the daily A-share anchor instead of asking users to choose periods");
assert.equal(tradeReviewWxml.includes('wx:for="{{markets}}"'), false, "trade review should not render market category chips");
assert.equal(tradeReviewWxml.includes('wx:for="{{timeframes}}"'), false, "trade review should not render timeframe chips");
assert.equal(tradeReviewJs.includes("MARKET_PRESETS"), false, "trade review should not import simulator market presets for the real-review anchor");
assert.equal(tradeReviewJs.includes("TIMEFRAME_PRESETS"), false, "trade review should not import simulator timeframe presets for the real-review anchor");
assert.ok(tradeReviewJs.includes("fetchTradeReviewMarketContext"), "trade review should prefetch deterministic market context through the shared api helper");
assert.ok(tradeReviewJs.includes("marketContext: this.data.marketContext || null"), "trade review generation should pass the shared market context into the review model");
assert.ok(tradeReviewWxml.includes("只回答三件事"), "trade review should communicate the lightweight 60-second path");
assert.ok(tradeReviewWxml.includes('wx:for="{{firstThoughtOptions}}"'), "trade review should offer first-thought choices instead of requiring typing");
assert.ok(tradeReviewJs.includes("TRIGGER_SCENE_OPTIONS"), "trade review should offer trigger-scene choices for the mistake-card loop");
assert.ok(tradeReviewWxml.includes("触发情境"), "trade review should ask what scene triggered the first thought");
assert.ok(tradeReviewWxml.includes('wx:for="{{positionStates}}"'), "trade review should capture holding/closed/trapped state with choices");
assert.ok(tradeReviewWxml.includes('wx:for="{{nextActionOptions}}"'), "trade review should offer next-law choices instead of requiring prose");
assertRuleHas(tradeReviewWxss, ".quick-choice-grid.three", ["repeat(2, minmax(0, 1fr))"], "trade review quick choices should stay readable on true-device narrow screens");
["怕错过", "不甘心", "想证明", "怕亏", "想扳回", "买少了", "卖飞了", "追高了", "被套了", "想补仓", "放量拉升", "冲高回落", "弱反弹", "刚卖就涨", "持仓中", "已平仓", "被套中", "计划内", "计划外", "说不清", "停十秒", "只按计划", "不追涨", "不扛单", "先记录"].forEach((label) => {
  assert.ok(tradeReviewWxml.includes(label) || tradeReviewJs.includes(label), `trade review should expose quick choice: ${label}`);
});
assert.ok(tradeReviewWxml.includes("可选补充一句"), "trade review text input should be framed as optional supplement");
assert.ok(tradeReviewWxml.includes('class="primary-stack quick-actions"'), "trade review should make generated review the only dominant action row");
assert.ok(tradeReviewWxml.includes("你的第一面活镜"), "trade review should explain the missing-material state as a mirror promise");
assert.ok(tradeReviewWxml.includes("mistake-card"), "trade review result should surface a mistake-card output");
assert.ok(tradeReviewWxml.includes("主错题"), "trade review mistake card should lead with the main error type");
assert.ok(tradeReviewWxml.includes("活镜归因"), "trade review mistake card should show a mirror attribution line");
assert.ok(tradeReviewWxml.includes("下次执行动作"), "trade review mistake card should use the P1 execution-action wording");
assert.ok(tradeReviewWxml.includes("训练处方"), "trade review mistake card should show the K-line training prescription");
assert.equal(tradeReviewWxml.includes("下一次守法"), false, "trade review user-facing result copy should avoid old law wording");
["守法", "破法", "守法率"].forEach((term) => {
  assert.equal(tradeReviewWxml.includes(term), false, `trade review wxml should not expose ${term}`);
  assert.equal(tradeReviewJs.includes(term), false, `trade review page js should not expose ${term}`);
});
assert.ok(klineMindWxml.includes("执行一致率"), "kline training result should use execution consistency wording");
assert.equal(klineMindWxml.includes("按计划执行结果"), false, "kline training result should not use old law-result wording");
assert.ok(tradeReviewWxml.includes("mirror-deposit-card"), "trade review result should show living-mirror deposition");
assert.ok(tradeReviewWxml.includes("prescription-card"), "trade review result should show the next K-line training prescription");
assert.ok(tradeReviewWxml.includes("mirror-top3-card"), "trade review should surface living-mirror Top3 mistake statistics");
assert.ok(tradeReviewWxml.includes("最近重复最多的错题"), "trade review Top3 should name repeated mistake patterns");
assertRuleHas(tradeReviewWxss, ".mirror-top3-card", ["border: 1rpx solid rgba(216, 183, 111, 0.18)"], "trade review Top3 card should match the mirror/prescription visual system");
["拿不住", "空仓焦虑", "等确认", "破位认错", "盈利按规则拿", "空仓也算按计划"].forEach((label) => {
  assert.ok(tradeReviewWxml.includes(label) || tradeReviewJs.includes(label), `trade review should expose expanded v1 quick choice: ${label}`);
});

assert.ok(complianceNoticeJs.includes("variant"), "compliance notice should support full/compact/link variants");
assert.ok(complianceNoticeWxml.includes("resolvedVariant === 'link'"), "compliance notice should render a link-only mode");
assertRuleHas(complianceNoticeWxss, ".compliance--full", ["border: 1rpx solid rgba(201, 157, 76, 0.25)"], "full compliance should keep the complete bordered notice");
assertRuleHas(complianceNoticeWxss, ".compliance--compact", ["background: transparent", "border: 0"], "compact compliance should be a quiet line, not a repeated card");
assertRuleHas(complianceNoticeWxss, ".compliance--link", ["justify-content: flex-end", "background: transparent"], "link compliance should be a minimal profile entry");
assert.equal(/<compliance-notice\s*\/>/.test(allPageWxml), false, "pages should not fall back to the default full compliance card");
assert.equal(/<compliance-notice\s+compact=/.test(allPageWxml), false, "pages should use explicit compliance variants instead of legacy compact prop");
assert.ok(homeWxml.includes('<compliance-notice variant="compact" />'), "home should use compact compliance");
assert.ok(trainingWxml.includes('<compliance-notice variant="compact" />'), "training should use compact compliance");
assert.ok(livingMirrorWxml.includes('<compliance-notice variant="compact" />'), "living mirror should use compact compliance");
assert.ok(klineMindWxml.includes('<compliance-notice variant="full" />'), "kline mind should keep the full compliance notice");
assert.ok(tradeReviewWxml.includes('<compliance-notice variant="full" />'), "trade review should keep the full compliance notice");
assert.ok(profileWxml.includes('<compliance-notice variant="link" />'), "profile should only expose a compliance boundary link");

assert.ok(profileWxml.includes('bindtap="toggleProfileDepth"'), "profile should offer one restrained archive/sync depth entry");
assert.ok(profileWxml.includes('wx:if="{{showProfileDepth}}" class="profile-depth-stack"'), "profile system, sync, and handoff content should be folded by default");
assert.equal(profileWxml.includes("手机号贯穿档案"), false, "profile should not expose phone/archive system language in the default user center");
assert.equal(profileWxml.includes("高频陪跑端"), false, "profile should not expose operations positioning language in the default user center");
assert.equal(profileWxml.includes("统一档案ID"), false, "profile should not expose internal archive ids in reader-facing copy");
assert.equal(profileWxml.includes("<text>助教承接</text>"), false, "profile should not present assistant handoff as a first-level product module");
assert.ok(trainingWxml.includes('bindtap="toggleTrainingDepth"'), "training should expose detailed prescription only after the one-task first screen");
assert.ok(trainingWxml.includes('wx:if="{{showTrainingDepth}}" class="training-depth"'), "training prescription, checklist, reflection, and completion actions should be folded below the first screen");
assert.ok(tradeReviewWxml.includes('wx:if="{{form.screenshotPath || manualAnchorVisible || form.symbol}}" class="quick-review-card card"'), "trade review should reveal first-thought writing after screenshot or manual anchor starts");
assert.ok(tradeReviewWxml.includes('wx:if="{{form.firstThought}}" class="quick-next-step"'), "trade review should reveal plan/position/next-law fields after the first thought is chosen");
assert.ok(tradeReviewWxml.includes('wx:if="{{(form.screenshotPath || manualAnchorVisible || form.symbol) && form.firstThought && form.nextAction}}" class="primary-stack quick-actions"'), "trade review should not show the generate action until source, first thought, and next law are present");
assert.ok(tradeReviewWxml.includes("查看心镜报告"), "trade review completion should reveal a productized H5/report action");
assert.ok(tradeReviewWxml.includes('class="report-arrival-card card"'), "trade review completion should present the report as a natural result card");
assert.ok(tradeReviewWxml.includes("复盘完成后，心镜报告会在这里出现"), "trade review should set the expectation that report follows completion");
assert.ok(reportWxml.includes("复盘心镜<br />报告"), "report page should frame itself as a post-review mirror report");
assert.equal(reportWxml.includes("九型人格<br />心证"), false, "report page should not lead with personality-test language");
assert.equal(reportWxml.includes("还没有人格心证"), false, "empty report state should not send the user back to a personality-test mental model");
assert.equal(profileJs.includes("交易人格心证"), false, "profile menu should not make the report feel like a hidden personality module");
assert.ok(klineMindWxml.includes('class="first-thought-focus"'), "kline mind should lead the record section with one first-thought question");
assert.ok(klineMindJs.includes("REACTION_DIRECTIONS"), "kline mind should provide broad reaction directions before detailed tags");
assert.ok(klineMindWxml.includes('class="reaction-direction-row"'), "kline mind should ask for one broad reaction direction first");
assert.ok(klineMindWxml.includes('wx:if="{{form.reactionDirection}}" class="reaction-detail-tags"'), "kline detailed reaction tags should unfold only after a broad direction");
assert.ok(klineMindWxml.includes('wx:if="{{form.firstReaction}}" class="record-depth-fields"'), "kline mind body/boundary/detail fields should unfold only after the first reaction is chosen");
assertRuleHas(klineMindWxss, ".reaction-direction-row", ["grid-template-columns: 1fr"], "kline first-thought choices should stack calmly instead of overlapping in a cramped three-column row");
assertRuleHas(klineMindWxss, ".reaction-direction-pill", ["width: 100%", "min-width: 0", "margin: 0", "box-sizing: border-box"], "kline first-thought choice buttons should not inherit native button widths that overlap");
assert.ok(klineMindWxml.includes('bindtap="switchSlice"'), "kline change-slice action should actually request the next training slice");
assert.ok(klineMindJs.includes("getNextKlineMindSliceSeed"), "kline page should rotate the training slice seed instead of only expanding selectors");
assert.equal(klineMindWxml.includes("session.stageGate.seal"), false, "kline blind practice card should not show unexplained six-gate seal text such as 良");
assert.ok(klineMindWxml.includes('class="slice-playbook"'), "kline chart should include an immediate concrete playbook for how to train this slice");
assert.ok(klineMindWxml.includes("点最牵动的一根"), "kline playbook should tell the user exactly what to do with the chart");
assert.ok(klineMindWxml.includes('bindtouchmove="onChartPanMove"'), "kline blind chart should allow touch dragging to review revealed history");
assert.ok(klineMindJs.includes("setKlineRuntimeViewportPan"), "kline blind chart should clamp touch panning through the training viewport engine");
assert.ok(klineMindJs.includes("chartPanOffset"), "kline blind chart should keep viewport pan state instead of relying on native scroll position");
assert.equal(klineMindWxml.includes('bounces="true"'), false, "kline blind chart should not keep native horizontal panning that can reveal unreplayed candles");
assert.equal(klineMindJs.includes('label: item.key === activeKey ? "当"'), false, "kline chart should not render a text marker on the active candle");
assert.equal(klineMindWxml.includes('<text wx:if="{{item.label}}"'), false, "kline chart should not render any text labels inside real K-line candles");
assert.ok(klineMindWxml.includes('class="chart-stepper"'), "kline chart should expose compact -/+ zoom controls in the chart corner");
assert.ok(klineMindWxml.includes("bindtap=\"decreaseChartZoom\""), "kline chart should let the user zoom out with a minus control");
assert.ok(klineMindWxml.includes("bindtap=\"increaseChartZoom\""), "kline chart should let the user zoom in with a plus control");
assert.ok(klineMindWxml.indexOf('class="chart-stepper"') < klineMindWxml.indexOf('class="wave-board-scroll"'), "kline zoom controls should stay fixed in the visible chart corner, not inside the horizontal candle canvas");
const klineChartTouchStart = klineMindWxml.indexOf('class="wave-board-scroll"');
const klineIndicatorRailStart = klineMindWxml.indexOf('class="indicator-strip"', klineChartTouchStart);
assert.ok(klineMindWxml.indexOf('class="indicator-strip-spacer"', klineChartTouchStart) < klineIndicatorRailStart, "kline chart should reserve space for a fixed indicator rail inside the candle canvas");
assert.ok(klineIndicatorRailStart > klineChartTouchStart, "kline indicator rail should stay fixed outside the touch-panned candle canvas");
assert.equal(klineMindWxml.includes("缩小"), false, "kline chart should not render the old segmented zoom labels");
assert.equal(klineMindWxml.includes("标准"), false, "kline chart should not render the old segmented zoom labels");
assert.equal(klineMindWxml.includes("放大"), false, "kline chart should not render the old segmented zoom labels");
assert.equal(klineMindJs.includes("模拟买入"), false, "kline decision buttons should not repeat simulation wording");
assert.equal(klineMindJs.includes("模拟卖出"), false, "kline decision buttons should not repeat simulation wording");
assert.equal(klineMindJs.includes("已记录模拟动作"), false, "kline action toast should not repeat simulation wording");
assert.equal(sliceBetween(klineMindWxml, 'class="decision-actions"', 'class="runtime-next').includes("{{item.detail}}"), false, "kline decision buttons should stay compact without secondary detail rows");
assert.equal(sliceBetween(klineMindWxml, 'class="decision-actions"', '<button class="runtime-next').includes("<button"), false, "kline decision actions should avoid native buttons that overlap in WeChat");
assert.equal(klineMindWxml.includes("训练方法"), false, "kline page should not show a separate training-method explainer entry");
assert.equal(klineMindWxml.includes('class="practice-flow"'), false, "kline record flow should not look like three inactive navigation pills");
assert.ok(klineMindWxml.includes("横屏训练更稳"), "kline chart should recommend landscape practice for dense K-line training");
assert.ok(klineMindJson.includes('"pageOrientation": "auto"'), "kline mind should allow landscape practice on real devices");
assert.ok(klineMindWxml.includes('class="sub-indicator-board'), "kline indicator layer should render below the chart");
assert.ok(klineMindWxml.includes('class="indicator-strip"'), "kline indicators should render as a single-row selector");
assert.ok(klineMindWxml.includes("交易风格"), "kline timeframe selector should be framed as trading style, not chart period switching");
assert.equal(klineMindWxml.includes("<text>周期</text>"), false, "kline timeframe selector should not look like same-symbol period switching");
assert.equal(klineMindWxml.includes("{{showSelectors ? '收起' : '周期'}}"), false, "kline selector toggle should not call the style drawer a chart period");
assert.equal(klineMindWxml.includes("toggleSelectors"), false, "kline page should not keep a duplicate selector drawer above the chart");
assert.ok(
  sliceBetween(klineMindWxml, 'class="chart-toolbar-row"', 'class="chart-orientation-note"').includes('class="slice-change-btn')
    && sliceBetween(klineMindWxml, 'class="chart-toolbar-row"', 'class="chart-orientation-note"').includes('bindtap="switchSlice"'),
  "kline change-slice action should sit inside the chart toolbar"
);
assert.ok(klineMindWxml.includes("正在读取历史数据"), "kline empty state should show a loading copy instead of immediately looking broken");
assert.ok(klineMindJs.includes("historySliceCache"), "kline style switching should use an in-page history slice cache");
assert.equal(klineMindJs.includes("&& !historySlice.hot_pool"), false, "kline style switching should cache hot-pool slices inside the page instead of changing every time the user returns to a style");
assert.equal(klineMindJs.includes("&& !historySlice.hotPool"), false, "kline style switching should cache hotPool slices inside the page instead of changing every time the user returns to a style");
assert.ok(
  sliceBetween(klineMindJs, "selectTimeframe(e)", "selectChartZoom(e)").includes("if (timeframeKey === currentTimeframeKey) return;"),
  "kline style switching should not reload or change slice when the selected style is tapped again"
);
assert.ok(klineMindJs.includes("prefetchTimeframeSlices"), "kline page should prefetch style slices so switching feels instant");
assert.ok(klineMindJs.includes("KLINE_TRAINING_WINDOW_SIZE"), "kline page should request the full prewarmed training slice instead of a shorter temporary segment");
assert.ok(klineMindJs.includes('const CHART_ZOOM_ORDER = ["overview", "wide", "standard", "focus"];'), "kline zoom controls should support one more overview zoom-out step");
assert.ok(
  sliceBetween(klineMindJs, "switchSlice()", "advanceRuntimeCandle()").includes("this.loadServerHistorySlice(form, { keepCurrentChart: true })"),
  "kline change-slice action should keep the current chart visible while the next slice loads"
);
assert.ok(klineMindJs.includes("const SLICE_SWITCH_LIMIT = 9;"), "kline change-slice action should allow a generous nine-switch practice quota");
assert.equal(klineMindJs.includes("SLICE_SWITCH_COOLDOWN_MS"), false, "kline change-slice action should not grey out for an artificial cooldown after every tap");
assert.equal(klineMindJs.includes("sliceSwitchLocked"), false, "kline change-slice action should not use a per-tap disabled lock state");
assert.ok(klineMindJs.includes("sliceSwitchExhausted"), "kline change-slice action should only enter disabled state after the quota is exhausted");
assert.ok(klineMindWxml.includes("{{sliceSwitchRemainingText}}"), "kline change-slice button should show a quiet remaining-count hint");
assert.ok(klineMindWxml.includes('disabled="{{sliceSwitchExhausted}}"'), "kline change-slice button should only be disabled when the quota is exhausted");
assert.ok(appJs.includes("prefetchKlineTrainingSlices"), "miniapp launch should warm real historical K-line slices before the user enters training");
assert.ok(klineMindJs.includes("prefetchNextSlice"), "kline page should keep the next random history slice warm for the change-slice action");
assert.equal(klineMindWxml.includes("模拟盈亏"), false, "kline runtime metrics should avoid repeating the simulation caveat in every small label");
assert.equal(klineMindJs.includes("先做模拟决策"), false, "kline runtime button should say decision directly after the global simulation boundary is present");
assert.equal(klineMindWxml.includes("toggleIndicatorPicker"), false, "kline indicators should not use a dropdown picker");
assert.equal(klineMindWxml.includes('class="sub-indicator-menu"'), false, "kline indicators should not render a dropdown menu");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("主图"), false, "kline indicator row should not spell out main-chart labels");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("副图"), false, "kline indicator row should not spell out sub-chart labels");
assert.ok(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("chart-indicator-chip"), "kline indicator row should use chart-scoped chip styles");
assert.deepStrictEqual(demoSession.mainIndicatorOptions.map((item) => item.label), ["MA", "BOLL"]);
assert.deepStrictEqual(demoSession.indicatorPanelOptions.map((item) => item.label), ["VOL", "MACD", "RSI", "KDJ"]);
assert.deepStrictEqual(demoSession.indicatorCatalog.map((item) => item.label), ["MA", "MACD", "BOLL", "VOL", "RSI", "KDJ"]);
assert.ok(klineMindWxml.includes("lines.rsi"), "kline indicator panel should render RSI as a line indicator");
assert.ok(klineMindWxml.includes("lines.k"), "kline indicator panel should render KDJ K line");
assert.ok(klineMindWxml.includes("lines.d"), "kline indicator panel should render KDJ D line");
assert.ok(klineMindWxml.includes("lines.j"), "kline indicator panel should render KDJ J line");
assertRuleHas(klineMindWxss, ".chart-toolbar-row", ["grid-template-columns: minmax(0, 1fr) minmax(112rpx, 128rpx)", "width: 100%", "overflow: hidden"], "kline toolbar should keep trading style and change-slice action inside the card");
assertRuleHas(klineMindWxss, ".chart-period-rail", ["display: flex", "width: 100%", "overflow-x: auto"], "kline timeframe selector should use a compact scrollable toolbar instead of a full-width segmented block");
assertRuleHas(klineMindWxss, ".slice-change-btn", ["width: 100%", "max-width: 128rpx", "justify-content: center"], "kline change-slice button should not overlap the trading style rail");
assertRuleHas(klineMindWxss, ".indicator-strip", ["display: flex", "overflow-x: auto"], "kline indicator selector should be one horizontal row");
assertRuleHas(klineMindWxss, ".chart-indicator-chip", ["flex: 0 0 auto", "height: 38rpx"], "kline indicator chips should stay compact inside the chart toolbar");
assertRuleHas(klineMindWxss, ".chart-scroll-inner", ["width: 100%", "min-width: 100%"], "kline chart should fill the visible viewport even at the widest zoom-out");
assertRuleHas(klineMindWxss, ".wave-board-content", ["width: 100%", "gap: var(--kline-gap, 6rpx)"], "kline candle track should fill the board while using the runtime gap");
assertRuleHas(klineMindWxss, ".mind-candle", ["flex: 0 0 var(--kline-candle-width, 4rpx)"], "kline zoom should use runtime bar width instead of fixed segmented classes");
assertRuleHas(klineMindWxss, ".sub-indicator-item", ["flex: 0 0 var(--kline-candle-width, 4rpx)"], "kline sub indicators should share the same runtime bar width");
assertRuleHas(klineMindWxss, ".decision-action", ["width: 100%", "box-sizing: border-box"], "kline decision actions should use stable non-native button boxes");
assert.ok(trainingWxml.includes('class="training-subtle-links"'), "training plan/detail entries should sit in a quiet secondary link row");
assert.ok(trainingWxml.indexOf('class="primary-btn kline-entry-btn"') < trainingWxml.indexOf('class="training-subtle-links"'), "training first screen should visually encounter the single primary action before optional links");
assertRuleHas(trainingWxss, ".training-subtle-link", ["background: transparent", "border: 0", "box-shadow: none"], "training optional links should be visually quieter than buttons");
assert.ok(livingMirrorWxml.includes('wx:if="{{hasRecords}}" class="ghost-btn mirror-depth-toggle"'), "living mirror should show growth details only after at least one record exists");
assert.equal((appJson.tabBar || {}).custom, true, "five main entries should be owned by native custom tabBar");
assert.deepStrictEqual(
  ((appJson.tabBar || {}).list || []).map((item) => item.pagePath),
  [
    "pages/home/index",
    "pages/trade-review/index",
    "pages/training/index",
    "pages/living-mirror/index",
    "pages/profile/index"
  ],
  "native tabBar should contain the five main miniapp entries in product order"
);
assert.ok(bottomTabJs.includes("wx.switchTab({"), "bottom tab primary navigation should use native switchTab");
assert.equal(bottomTabJs.includes("wx.redirectTo({"), false, "bottom tab should not destroy and recreate tab pages with redirectTo");
assert.equal(bottomTabJs.includes("wx.reLaunch({"), false, "bottom tab should not fall back to full app relaunch for tab routes");
assert.equal(bottomTabJs.includes("this.setData({ activeKey: key });"), false, "bottom tab should not visually switch the old page before the route has changed");
assert.equal(bottomTabJs.includes("transitioning"), false, "bottom tab should not need an artificial transition veil after moving to native tabBar");
assert.equal(bottomTabWxml.includes("tab-transition-veil"), false, "bottom tab should not render a route-change veil after moving to native tabBar");
[
  homeWxml,
  tradeReviewWxml,
  trainingWxml,
  livingMirrorWxml,
  profileWxml
].forEach((pageWxml) => {
  assert.equal(pageWxml.includes("<bottom-tab-bar"), false, "native tab pages should not mount a duplicate page-level bottom tab component");
});
assert.ok(homeWxml.includes('class="home-quiet-paths"'), "home should expose quiet secondary paths without competing with the main CTA");
assert.ok(homeWxml.includes("K线观心"), "home should make the core K-line mind training naturally discoverable");
assert.ok(homeWxml.indexOf("今日只练一件事") < homeWxml.indexOf('class="home-quiet-paths"'), "home should encounter the single daily task before secondary paths");
assert.equal(homeWxml.includes("当前状态"), false, "home should not explain the same first-screen task twice");
assert.ok(trainingWxml.includes("开始K线观心"), "training primary button should name the core K-line mind practice");
assert.ok(profileWxml.includes("toggleEvidenceChain"), "profile should fold the closure chain behind a quiet disclosure");
assert.ok(profileWxml.includes('wx:if="{{showEvidenceChain}}" class="closure-chain-list"'), "profile should not expand the full six-step closure chain by default");

assert.equal(appWxss.includes("button:active::after {\n  opacity: 1;"), false, "all buttons should not receive the primary light sweep");
assert.ok(appWxss.includes(".primary-btn:active::after"), "only the primary button should keep the strong pressed light sweep");
assert.ok(appWxss.includes("button > text,\nbutton > view"), "button children should inherit a stable line box");
assertRuleHas(appWxss, ".primary-btn,\n.secondary-btn,\n.ghost-btn", ["line-height: 1.2", "text-align: center"], "shared buttons should have stable centered text baselines");
assertRuleHas(bottomTabWxss, ".tab", ["line-height: 1.2", "text-align: center"], "bottom tab labels should align to a stable baseline");
assertRuleHas(bottomTabWxss, ".tab", ["min-height: 108rpx"], "bottom tab should keep a generous stable hit area");
assertRuleHas(homeWxss, ".scene-edict.edict-hero.single-focus", ["min-height: calc(100vh - 112rpx)", "padding-bottom: calc(156rpx + env(safe-area-inset-bottom))"], "home incomplete first screen should be a complete two-card viewport");
assertRuleHas(homeWxss, ".scene-edict.edict-hero.single-focus .edict-scroll", ["flex: 1 1 auto", "margin-top: 22rpx"], "home incomplete first screen should let the status card fill the remaining viewport");
assertRuleHas(homeWxss, ".scene-edict.edict-hero.single-focus .home-focus-card", ["flex: 1 1 auto", "min-height: 356rpx", "display: flex", "justify-content: flex-start"], "home current-status card should expand into a balanced first-screen lower panel");
assert.equal(homeWxss.includes(".companion-copy text"), false, "home should not keep dead tag selectors that trigger DevTools WXSS warnings");
assert.equal(homeWxss.includes(".growth-grid > view:last-child"), false, "home should not keep dead growth-grid tag selectors that trigger DevTools WXSS warnings");
assert.equal(homeWxss.includes(".mini-card-qr > view"), false, "home QR preview should use class selectors instead of tag selectors");
assert.equal(homeWxss.includes(".retention-next view"), false, "home retention next detail should use class selectors instead of tag selectors");
assertRuleHas(homeWxss, ".mini-primary", ["line-height: 1.2"], "home primary CTA should use the shared button baseline");
assertRuleHas(homeWxss, ".home-today-state-action", ["line-height: 1.2"], "home compact action should use the shared button baseline");
assertRuleHas(klineMindWxss, ".slice-change-btn", ["display: inline-flex", "align-items: center", "justify-content: center", "line-height: 1.2"], "kline slice switch should center its label");
assertRuleHas(klineMindWxss, ".option-pill", ["display: flex", "align-items: center", "justify-content: center", "line-height: 1.2"], "kline option pills should center text vertically");
assertRuleHas(tradeReviewWxss, ".mini-choice button", ["display: flex", "align-items: center", "justify-content: center", "line-height: 1.2"], "trade review binary choices should center labels");
assertRuleHas(trainingWxss, ".plan-toggle", ["line-height: 1.2"], "training plan toggle should use the shared button baseline");
assertRuleHas(appWxss, ".split-actions", ["grid-template-columns: repeat(2, minmax(0, 1fr))", "align-items: stretch"], "split action rows should stay inside the page width");
assertRuleHas(appWxss, ".split-actions .ghost-btn,\n.split-actions .secondary-btn,\n.split-actions .primary-btn", ["width: 100%", "min-width: 0", "box-sizing: border-box"], "split action buttons should shrink inside their grid cells");
assertRuleHas(profileWxss, ".journey-progress-grid", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile progress grid should not overflow its card");
assertRuleHas(profileWxss, ".handoff-grid", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile handoff grid should not overflow its card");
assertRuleHas(profileWxss, ".handoff-triggers", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile handoff trigger grid should not overflow its card");
assertRuleHas(profileWxss, ".handoff-rows", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile handoff detail grid should not overflow its card");
assertRuleHas(profileWxss, ".sync-bridge-grid", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile sync bridge grid should not overflow its card");
assertRuleHas(profileWxss, ".share-moment-grid", ["grid-template-columns: repeat(2, minmax(0, 1fr))"], "profile share moment grid should not overflow its card");
assertRuleHas(profileWxss, ".journey-progress-grid > view", ["min-width: 0", "overflow-wrap: anywhere"], "profile progress grid cells should contain long text");
assertRuleHas(profileWxss, ".handoff-grid > view", ["min-width: 0", "overflow-wrap: anywhere"], "profile handoff grid cells should contain long text");
assertRuleHas(profileWxss, ".handoff-triggers > view", ["min-width: 0", "overflow-wrap: anywhere"], "profile handoff trigger cells should contain long text");
assertRuleHas(profileWxss, ".handoff-rows > view", ["min-width: 0", "overflow-wrap: anywhere"], "profile handoff detail cells should contain long text");
assertRuleHas(profileWxss, ".sync-bridge-grid view,\n.debug-grid view", ["min-width: 0", "overflow-wrap: anywhere"], "profile sync bridge cells should contain long text");
assertRuleHas(profileWxss, ".share-moment-grid button", ["min-width: 0", "overflow-wrap: anywhere"], "profile share moment buttons should contain long text");
assertRuleHas(profileWxss, ".identity-input", ["grid-template-columns: minmax(0, 1fr) minmax(128rpx, 150rpx)", "align-items: stretch"], "profile phone binding row should keep input and button inside the card");
assertRuleHas(profileWxss, ".identity-input input,\n.identity-input button", ["width: 100%", "min-width: 0", "box-sizing: border-box"], "profile phone binding controls should shrink inside their grid cells");
assertRuleHas(profileWxss, ".sync-actions", ["grid-template-columns: repeat(2, minmax(0, 1fr))", "align-items: stretch"], "profile sync action buttons should stay inside the card grid");
assertRuleHas(profileWxss, ".sync-actions .ghost-btn,\n.sync-actions .secondary-btn,\n.sync-actions .primary-btn", ["width: 100%", "min-width: 0", "box-sizing: border-box"], "profile sync action buttons should shrink inside their grid cells");
assertRuleHas(profileWxss, ".handoff-actions", ["grid-template-columns: minmax(0, 1fr)", "justify-items: center"], "profile assistant handoff action should align to the card center");
assertRuleHas(profileWxss, ".handoff-actions button", ["display: flex", "align-items: center", "justify-content: center", "line-height: 1.2", "text-align: center"], "profile assistant handoff button label should be visually centered");

console.log("MiniApp UI release R1 guard passed.");
