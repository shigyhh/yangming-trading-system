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
const klineCanvasRendererJs = readFileSync(join(root, "miniprogram", "modules", "kline-mind", "canvas-renderer.js"), "utf8");
const klineMindJson = readPage("kline-mind", "index.json");
const tradeReviewWxml = readPage("trade-review", "index.wxml");
const tradeReviewJs = readPage("trade-review", "index.js");
const trainingJs = readPage("training", "index.js");
const reportWxml = readPage("report", "index.wxml");
const reportJs = readPage("report", "index.js");
const zhixingIndexJs = readPage("zhixing-index", "index.js");
const mirrorChallengeJs = readPage("mirror-challenge", "index.js");
const klineReviewJs = readPage("kline-review", "index.js");
const zhixingModuleJs = readFileSync(join(root, "miniprogram", "modules", "zhixing", "index.js"), "utf8");
const klineReviewWxml = readPage("kline-review", "index.wxml");
const klineSimulatorJs = readPage("kline-simulator", "index.js");
const klineSimulatorJson = readPage("kline-simulator", "index.json");
const klineSimulatorModuleJs = readFileSync(join(root, "miniprogram", "modules", "kline-simulator", "index.js"), "utf8");
const homeJs = readPage("home", "index.js");
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
const assessmentWxss = readPage("assessment", "index.wxss");
const tradeReviewWxss = readPage("trade-review", "index.wxss");
const trainingWxss = readPage("training", "index.wxss");
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
assert.equal(
  homeWxml.includes('class="home-quiet-paths"'),
  false,
  "home first screen should not keep a K-line shortcut beside the primary review action"
);
assert.equal(
  homeWxml.includes(">K线观心</button>"),
  false,
  "home first screen should not expose K-line training as a competing CTA"
);
assert.ok(
  homeWxml.includes('class="home-flow-strip"'),
  "home should expose a lightweight visible loop strip after the primary action"
);
assert.ok(
  homeWxml.includes('wx:for="{{homeFlowSteps}}"'),
  "home closure strip should be driven by loop state, not hard-coded decoration"
);
assert.ok(
  homeWxml.includes("{{item.done ? 'done' : ''}} {{item.current ? 'current' : ''}}"),
  "home closure strip should mark completed and current steps"
);
assert.ok(
  homeWxml.includes('wx:if="{{homeContinuityVisible && homeContinuitySteps.length}}" class="home-continuity-panel"'),
  "home should reveal the closure evidence panel only when there is meaningful progress and compact continuity steps"
);
assert.ok(
  homeJs.includes("function buildHomeFlowSteps"),
  "home page should derive the visible closure strip from current evidence state"
);
assert.ok(
  homeJs.includes("homeFlowSteps: buildHomeFlowSteps"),
  "home data should refresh the closure strip whenever entry state is loaded"
);
["真实记录", "第一念", "活镜", "今日训练", "心证卡"].forEach((label) => {
  assert.ok(homeWxml.includes(label) || homeJs.includes(label), `home loop strip should include ${label}`);
});

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
assert.strictEqual(demoSession.dataStatusText, "真实历史数据已载入");
assert.equal(klineMindWxml.includes("session.market.defaultSymbol"), false, "kline mind page should not expose raw symbol codes in status meta");
assert.equal(klineMindWxml.includes("数据状态"), false, "kline mind page should use user-facing source labels");
assert.equal(klineMindWxml.includes('class="sim-meta"'), false, "kline mind should not render cockpit-style data status blocks");
assert.ok(klineMindWxml.includes('class="wave-source-line"'), "kline mind should collapse source/rhythm into quiet metadata");
assert.ok(klineMindWxml.includes("K线盲练"), "kline mind should frame the session as K-line blind practice");
assert.equal(klineMindWxml.includes("真实历史盲练"), false, "kline mind should not keep a duplicated blind-practice control block above the chart");
assert.ok(klineMindWxml.includes('wx:if="{{savedRecord && savedRecord.completed}}" class="path-links"'), "kline mind should show cross-page links only after the record is complete");
assert.ok(klineMindWxml.includes('canvas-id="klineMainCanvas"'), "kline mind should render the main K-line chart through canvas");
assert.ok(klineMindWxml.includes('canvas-id="klineIndicatorCanvas"'), "kline mind should render indicator panels through canvas");
assert.equal(klineMindWxml.includes("mind-candle"), false, "kline mind should not render WXML candle decorations");
assert.ok(klineMindWxml.includes("historyError ||"), "kline mind empty state should surface the actual history load failure");
assert.ok(klineMindWxml.includes("goBackendSetup"), "kline mind history failure should route users to backend setup");
assert.ok(klineMindJs.includes("normalizeKlineMindEntryContext"), "kline mind page should normalize URL entry context before loading training data");
assert.ok(klineMindJs.includes("mergeKlineMindEntryContext"), "kline mind page should merge entry context into session and history slice requests");
assert.ok(klineMindJs.includes("this.entryContext"), "kline mind page should keep launch context for onShow reloads");
assert.ok(klineMindJs.includes("HISTORY_LOAD_TIMEOUT_MS"), "kline mind should not leave true-device history loading unresolved");
assert.ok(klineMindJs.includes("armHistoryLoadTimeout"), "kline mind should settle a stalled history request into an explicit failure state");
assert.ok(klineMindJs.includes("ym_profile_open_sync_setup"), "kline mind should open profile sync setup directly from history failure");
assertRuleHas(klineMindWxss, ".chart-canvas-stage", ["position: relative", "background: #030504"], "kline mind canvas stage should own the chart surface");
assertRuleHas(klineMindWxss, ".kline-main-canvas", ["height: 336rpx"], "kline mind main canvas should keep the blind viewport height");

assert.ok(profileWxml.includes('wx:if="{{debugMode}}" class="debug-release-tools card"'), "profile debug release tools should be hidden behind debugMode");
assert.ok(profileJs.includes("fetchDataBindingSummary"), "profile should refresh from the shared data-binding summary when opened");
assert.ok(profileJs.includes("buildUserDataChain(this.data.remoteArchiveSummary)"), "profile data chain should use the latest remote archive summary when available");
assert.ok(profileWxml.includes('class="sync-config-panel"'), "profile should expose backend setup inside the sync section for true-device preview");
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

assert.ok(tradeReviewWxml.includes('wx:if="{{showAdvanced}}" class="record-flow card"'), "trade review flow explainer should be opt-in detail");
assert.ok(tradeReviewWxml.includes('class="primary-btn upload-primary" bindtap="chooseImage"'), "trade review should make screenshot upload the main path");
assert.ok(tradeReviewWxml.includes('class="manual-anchor-link" bindtap="showManualAnchor"'), "trade review manual code entry should be a quiet fallback link");
assert.ok(tradeReviewWxml.indexOf("上传交易截图") < tradeReviewWxml.indexOf("没有截图，手动填写"), "trade review should present upload before manual fallback");
assert.ok(tradeReviewWxml.includes('bindtap="showManualAnchor"'), "trade review should support manual code/date anchors as the same review path");
assert.ok(tradeReviewWxml.includes('class="anchor-card card"'), "trade review should expose one shared anchor confirmation card");
assert.ok(tradeReviewWxml.includes("确认锚点"), "trade review should make manual and OCR market anchors explicit");
assert.ok(tradeReviewJs.includes("fetchTradeReviewMarketContext"), "trade review should prefetch deterministic market context through the shared api helper");
assert.ok(tradeReviewJs.includes("marketContext: this.data.marketContext || null"), "trade review generation should pass the shared market context into the review model");
assert.ok(tradeReviewWxml.includes("只回答三件事"), "trade review should communicate the lightweight 60-second path");
assert.ok(tradeReviewWxml.includes('wx:for="{{firstThoughtOptions}}"'), "trade review should offer first-thought choices instead of requiring typing");
assert.ok(tradeReviewWxml.includes('wx:for="{{positionStates}}"'), "trade review should capture holding/closed/trapped state with choices");
assert.ok(tradeReviewWxml.includes('wx:for="{{nextActionOptions}}"'), "trade review should offer next-law choices instead of requiring prose");
["怕错过", "不甘心", "想证明", "怕亏", "想扳回", "持仓中", "已平仓", "被套承压", "计划内", "计划外", "说不清", "停十秒", "只按计划", "不追涨", "不扛单", "先记录"].forEach((label) => {
  assert.ok(tradeReviewWxml.includes(label) || tradeReviewJs.includes(label), `trade review should expose quick choice: ${label}`);
});
assert.ok(tradeReviewWxml.includes("可选补充一句"), "trade review text input should be framed as optional supplement");
assert.ok(tradeReviewWxml.includes('class="primary-stack quick-actions"'), "trade review should make generated review the only dominant action row");
assert.ok(tradeReviewWxml.includes("你的第一面活镜"), "trade review should explain the missing-material state as a mirror promise");
assert.equal(zhixingIndexJs.includes('/pages/kline-simulator/index'), false, "zhixing index should route unfinished K-line work to the current K-line mind page");
assert.equal(mirrorChallengeJs.includes('/pages/kline-simulator/index'), false, "mirror challenge should not send users back to the legacy K-line simulator");
assert.equal(klineReviewJs.includes('/pages/kline-simulator/index'), false, "legacy K-line review actions should route to the current K-line mind page");
assert.equal(klineSimulatorJs.includes('/pages/kline-session/index'), false, "legacy K-line simulator page should not forward users into the old K-line session page");
assert.equal([reportWxml, reportJs, zhixingIndexJs, zhixingModuleJs, klineReviewWxml, klineSimulatorJson, klineSimulatorModuleJs].join("\n").includes("K线压力测试"), false, "release copy should call the current flow K-line mind practice, not legacy stress testing");

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
assert.ok(klineMindJs.includes("getTouchDistance"), "kline chart should measure two-finger distance for pinch zoom");
assert.ok(klineMindJs.includes("chartPinchStart"), "kline chart should keep pinch state separate from pan state");
assert.ok(klineMindJs.includes("if (this.chartPanStart || this.chartPinchStart) return;"), "kline long-press crosshair should not fire while panning or pinching");
assert.ok(klineMindJs.includes("this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);"), "kline pinch should reuse the same controlled zoom path as the chart corner controls");
assert.ok(klineMindJs.includes("updateChartPan"), "kline chart pan should use one controlled pan update path for buttons and drag");
assert.ok(klineMindJs.includes("panOffset: Number(nextRuntime.chartPanOffset || 0)"), "kline touch panning should update its drag anchor after each visible pan step");
assert.equal(klineMindWxml.includes('bounces="true"'), false, "kline blind chart should not keep native horizontal panning that can reveal unreplayed candles");
assert.equal(klineMindJs.includes('label: item.key === activeKey ? "当"'), false, "kline chart should not render a text marker on the active candle");
assert.equal(klineMindWxml.includes('<text wx:if="{{item.label}}"'), false, "kline chart should not render any text labels inside real K-line candles");
assert.ok(klineMindWxml.includes('<cover-view class="chart-stepper"'), "kline chart controls should use cover-view so they stay visible above native canvas on real devices");
assert.ok(klineMindWxml.includes("bindtap=\"decreaseChartZoom\""), "kline chart should let the user zoom out with a minus control");
assert.ok(klineMindWxml.includes("bindtap=\"increaseChartZoom\""), "kline chart should let the user zoom in with a plus control");
assert.ok(klineMindWxml.includes('bindtap="panChartLeft"'), "kline chart should expose an explicit left pan control for real-device use");
assert.ok(klineMindWxml.includes('bindtap="panChartRight"'), "kline chart should expose an explicit right pan control for real-device use");
assert.equal(klineMindWxml.includes("‹"), false, "kline chart pan controls should not use bracket-like chevrons on real devices");
assert.equal(klineMindWxml.includes("›"), false, "kline chart pan controls should not use bracket-like chevrons on real devices");
assert.ok(klineMindWxml.includes("←"), "kline chart left pan control should use a clear arrow glyph");
assert.ok(klineMindWxml.includes("→"), "kline chart right pan control should use a clear arrow glyph");
assert.ok(klineMindWxml.includes("左右滑动"), "kline chart should explain that the candle board can be panned horizontally");
assert.ok(klineMindWxml.includes('bindlongpress="showChartCrosshair"'), "kline chart should expose a long-press crosshair interaction");
assert.ok(/<cover-view\s+wx:if="{{chartCrosshair\.visible}}"\s+class="chart-crosshair-tooltip"/.test(klineMindWxml), "kline crosshair tooltip should use cover-view so it stays above native canvas on real devices");
assert.equal(klineMindWxml.includes('<view\n                wx:if="{{chartCrosshair.visible}}" class="chart-crosshair-tooltip"'), false, "kline crosshair tooltip should not use ordinary view over native canvas");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.open"), "kline tooltip should show the candle open value");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.high"), "kline tooltip should show the candle high value");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.low"), "kline tooltip should show the candle low value");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.close"), "kline tooltip should show the candle close value");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.volume"), "kline tooltip should show the candle volume value");
assert.ok(/<cover-view\s+wx:if="{{chartCrosshair\.visible}}"\s+class="chart-crosshair-readout/.test(klineMindWxml), "kline crosshair readout should use cover-view so it stays above native canvas on real devices");
assert.ok(klineMindWxml.includes('class="crosshair-readout-item"'), "kline crosshair readout should style cover-view children with explicit classes");
assert.ok(klineMindWxml.includes('class="crosshair-readout-label"'), "kline crosshair readout labels should not depend on text selectors inside cover-view");
assert.ok(klineMindWxml.includes('class="crosshair-readout-value"'), "kline crosshair readout values should not depend on view selectors inside cover-view");
assert.ok(klineMindWxml.includes("chartCrosshair.readout.changePct"), "kline readout should show selected candle change percentage");
assert.ok(klineMindWxml.includes("chartCrosshair.readout.amplitude"), "kline readout should show selected candle amplitude");
assert.ok(klineMindWxml.includes("chartCrosshair.readout.volume"), "kline readout should show selected candle volume detail");
assert.ok(klineMindJs.includes("showChartCrosshair"), "kline page should translate long-press coordinates into a chart crosshair");
assert.ok(klineMindJs.includes("chartCrosshair"), "kline page should keep crosshair state in page data");
assert.ok(klineCanvasRendererJs.includes("price-label"), "kline canvas renderer should draw price-axis labels");
assert.ok(klineCanvasRendererJs.includes("crosshair-line"), "kline canvas renderer should draw crosshair guide lines");
assert.ok(klineCanvasRendererJs.includes("time-label"), "kline canvas renderer should draw time-axis labels");
assert.ok(klineCanvasRendererJs.includes("volume-guide"), "kline canvas renderer should draw a linked volume guide in the indicator panel");
assert.ok(klineMindJs.includes("hideChartCrosshair();\n    this.updateChartZoom"), "kline zoom should clear crosshair state before changing viewport density");
assert.ok(klineMindJs.includes("hideChartCrosshair();\n    const currentForm = this.data.form || {};"), "kline slice switching should clear crosshair state before loading a new segment");
assert.ok(klineMindWxml.includes("chartCrosshair.tooltip.volume"), "kline crosshair tooltip should link the selected candle with volume detail");
const klineStepperStart = klineMindWxml.indexOf('<cover-view class="chart-stepper"');
const klineCanvasStageStart = klineMindWxml.indexOf('class="chart-canvas-stage"');
const klineMainCanvasStart = klineMindWxml.indexOf('class="kline-main-canvas"');
assert.ok(
  klineStepperStart > klineCanvasStageStart && klineStepperStart < klineMainCanvasStart,
  "kline zoom and pan controls should be cover-view overlays inside the canvas stage so real devices keep them above native canvas"
);
const klineChartTouchStart = klineMindWxml.indexOf('class="chart-canvas-scroll"');
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
assert.ok(klineMindWxml.includes('class="kline-indicator-canvas'), "kline indicator layer should render below the chart through canvas");
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
assert.ok(klineMindJs.includes("prefetchTimeframeSlices"), "kline page should prefetch style slices so switching feels instant");
assert.ok(klineMindJs.includes("KLINE_TRAINING_WINDOW_SIZE"), "kline page should request the full prewarmed training slice instead of a shorter temporary segment");
assert.ok(klineMindJs.includes('const CHART_ZOOM_ORDER = ["overview", "wide", "standard", "focus"];'), "kline zoom controls should support one more overview zoom-out step");
assert.ok(
  sliceBetween(klineMindJs, "switchSlice()", "advanceRuntimeCandle()").includes("this.loadServerHistorySlice(form, { keepCurrentChart: true })"),
  "kline change-slice action should keep the current chart visible while the next slice loads"
);
assert.equal(
  sliceBetween(klineMindJs, "switchSlice()", "this.loadServerHistorySlice(form, { keepCurrentChart: true })").includes("session,"),
  false,
  "kline change-slice should not replace the current visible chart session with an empty pending session before the next slice arrives"
);
assert.ok(appJs.includes("prefetchKlineTrainingSlices"), "miniapp launch should warm real historical K-line slices before the user enters training");
assert.ok(klineMindJs.includes("prefetchNextSlice"), "kline page should keep the next random history slice warm for the change-slice action");
assert.equal(klineMindWxml.includes("模拟盈亏"), false, "kline runtime metrics should avoid repeating the simulation caveat in every small label");
assert.equal(klineMindJs.includes("先做模拟决策"), false, "kline runtime button should say decision directly after the global simulation boundary is present");
assert.equal(klineMindWxml.includes("toggleIndicatorPicker"), false, "kline indicators should not use a dropdown picker");
assert.equal(klineMindWxml.includes('class="sub-indicator-menu"'), false, "kline indicators should not render a dropdown menu");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="runtime-card').includes("主图"), false, "kline indicator row should not spell out main-chart labels");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="runtime-card').includes("副图"), false, "kline indicator row should not spell out sub-chart labels");
assert.ok(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="runtime-card').includes("chart-indicator-chip"), "kline indicator row should use chart-scoped chip styles");
assert.deepStrictEqual(demoSession.mainIndicatorOptions.map((item) => item.label), ["MA", "BOLL"]);
assert.deepStrictEqual(demoSession.indicatorPanelOptions.map((item) => item.label), ["VOL", "MACD", "RSI", "KDJ"]);
assert.deepStrictEqual(demoSession.indicatorCatalog.map((item) => item.label), ["MA", "MACD", "BOLL", "VOL", "RSI", "KDJ"]);
assert.ok(klineCanvasRendererJs.includes("rsi"), "kline indicator canvas renderer should draw RSI as a line indicator");
assert.ok(klineCanvasRendererJs.includes("k:"), "kline indicator canvas renderer should draw KDJ K line");
assert.ok(klineCanvasRendererJs.includes("d:"), "kline indicator canvas renderer should draw KDJ D line");
assert.ok(klineCanvasRendererJs.includes("j:"), "kline indicator canvas renderer should draw KDJ J line");
assert.ok(klineCanvasRendererJs.includes("indicator-bar"), "kline indicator canvas renderer should draw VOL/MACD bars");
assertRuleHas(klineMindWxss, ".chart-toolbar-row", ["grid-template-columns: minmax(0, 1fr) minmax(96rpx, 112rpx)", "width: 100%", "overflow: hidden"], "kline toolbar should keep trading style and change-slice action inside the card");
assertRuleHas(klineMindWxss, ".chart-period-rail", ["display: flex", "width: 100%", "overflow-x: auto"], "kline timeframe selector should use a compact scrollable toolbar instead of a full-width segmented block");
assertRuleHas(klineMindWxss, ".slice-change-btn", ["width: 100%", "max-width: 112rpx", "justify-content: center"], "kline change-slice button should not overlap the trading style rail");
assertRuleHas(klineMindWxss, ".indicator-strip", ["display: flex", "overflow-x: auto"], "kline indicator selector should be one horizontal row");
assertRuleHas(klineMindWxss, ".chart-indicator-chip", ["flex: 0 0 auto", "height: 38rpx"], "kline indicator chips should stay compact inside the chart toolbar");
assertRuleHas(klineMindWxss, ".chart-scroll-inner", ["width: 100%", "min-width: 100%"], "kline chart should fill the visible viewport even at the widest zoom-out");
assertRuleHas(klineMindWxss, ".chart-canvas-stage", ["width: 100%", "min-width: 100%"], "kline canvas stage should fill the visible board");
assertRuleHas(klineMindWxss, ".kline-main-canvas", ["height: 336rpx"], "kline main canvas should own the real candle drawing surface");
assertRuleHas(klineMindWxss, ".kline-indicator-canvas", ["height: 104rpx"], "kline indicator canvas should own the indicator drawing surface");
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
assert.ok(bottomTabJs.includes("success: () => this.setData({ activeKey: normalizeActive(key) })"), "bottom tab should update active state only after switchTab succeeds");
assert.ok(bottomTabJs.includes("isCurrentRoute(url)"), "bottom tab should guard current-route no-op switches");
[
  homeJs,
  tradeReviewJs,
  trainingJs,
  livingMirrorJs,
  profileJs
].forEach((pageJs) => {
  assert.ok(pageJs.includes("syncPageTabBarActive(this);"), "native tab pages should sync the custom tab active state on show");
  assert.equal(pageJs.includes('require("../../utils/tab-bar")'), false, "native tab page sync should not depend on an extra runtime helper module");
});
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
assert.ok(homeWxml.includes('class="home-flow-strip"'), "home should expose the closure path without competing with the main CTA");
assert.equal(homeWxml.includes("K线观心"), false, "home should keep K-line training out of the first-screen dispatch");
assert.ok(homeWxml.indexOf("今日只练一件事") < homeWxml.indexOf('class="home-flow-strip"'), "home should encounter the single daily task before the closure path");
assertRuleHas(homeWxss, ".home-flow-step.done text", ["color: rgba(95, 132, 117, 0.86)"], "home closure path should visibly mark completed steps");
assertRuleHas(homeWxss, ".home-flow-step.current text", ["color: rgba(216, 183, 111, 0.9)"], "home closure path should visibly mark the current step");
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
assertRuleHas(klineMindWxss, ".simulation-console", ["overflow: hidden", "box-sizing: border-box"], "kline runtime training console should clip inner badges inside the card");
assertRuleHas(klineMindWxss, ".simulation-head", ["min-width: 0", "max-width: 100%", "overflow: hidden", "box-sizing: border-box"], "kline runtime head should not let the emotion badge escape the card");
assertRuleHas(klineMindWxss, ".emotion-badge", ["max-width: 132rpx", "box-sizing: border-box", "overflow: hidden", "text-overflow: ellipsis", "white-space: nowrap"], "kline runtime emotion badge should stay inside the head row");
assertRuleHas(klineMindWxss, ".option-grid", ["grid-template-columns: repeat(2, minmax(0, 1fr))", "max-width: 100%", "box-sizing: border-box"], "kline naming option grid should fit two calm columns on mobile");
assertRuleHas(klineMindWxss, ".option-pill", ["width: 100%", "min-width: 0", "box-sizing: border-box", "overflow-wrap: anywhere"], "kline naming pills should shrink and wrap inside their grid cells");
assertRuleHas(assessmentWxss, ".mode-card,\n.dynamic-card", ["overflow: hidden", "box-sizing: border-box"], "assessment depth cards should clip internal controls inside the card");
assertRuleHas(assessmentWxss, ".mode-head", ["min-width: 0", "max-width: 100%", "box-sizing: border-box"], "assessment depth head should stay inside the card width");
assertRuleHas(assessmentWxss, ".mode-head > view", ["min-width: 0", "overflow-wrap: anywhere", "text-align: right"], "assessment depth head right copy should wrap instead of pushing the card");
assertRuleHas(assessmentWxss, ".mode-btn", ["width: 100%", "min-width: 0", "margin: 0", "box-sizing: border-box", "overflow: hidden"], "assessment depth option buttons should not inherit native button overflow");

console.log("MiniApp UI release R1 guard passed.");
