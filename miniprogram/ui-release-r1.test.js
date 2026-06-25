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
const reportWxml = readPage("report", "index.wxml");
const profileJs = readPage("profile", "index.js");
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
assert.ok(klineMindWxml.includes("真实历史盲练"), "kline mind should frame the session as a real historical blind-practice ritual");
assert.ok(klineMindWxml.includes('wx:if="{{savedRecord && savedRecord.completed}}" class="path-links"'), "kline mind should show cross-page links only after the record is complete");
assertRuleHas(klineMindWxss, ".wave-board", ["display: flex", "justify-content: flex-start", "overflow: hidden"], "kline mind wave board should use a horizontal training strip instead of a sparse fixed grid");

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

assert.ok(tradeReviewWxml.includes('wx:if="{{showAdvanced}}" class="record-flow card"'), "trade review flow explainer should be opt-in detail");
assert.ok(tradeReviewWxml.includes('class="secondary-btn" bindtap="chooseImage"'), "trade review upload should be secondary to the generated review action");
assert.ok(tradeReviewWxml.includes("只回答三件事"), "trade review should communicate the lightweight 60-second path");
assert.ok(tradeReviewWxml.includes('class="primary-stack quick-actions"'), "trade review should make generated review the only dominant action row");
assert.ok(tradeReviewWxml.includes("你的第一面活镜"), "trade review should explain the missing-material state as a mirror promise");

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
assert.ok(tradeReviewWxml.includes('wx:if="{{form.screenshotPath}}" class="quick-review-card card"'), "trade review should reveal first-thought writing only after a real record is uploaded");
assert.ok(tradeReviewWxml.includes('wx:if="{{form.firstThought}}" class="quick-next-step"'), "trade review should reveal next-action fields after the first thought is written");
assert.ok(tradeReviewWxml.includes('wx:if="{{form.screenshotPath && form.firstThought && form.nextAction}}" class="primary-stack quick-actions"'), "trade review should not show the generate action until upload, first thought, and next action are present");
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
assert.ok(klineMindWxml.includes('class="slice-playbook"'), "kline chart should include an immediate concrete playbook for how to train this slice");
assert.ok(klineMindWxml.includes("点最牵动的一根"), "kline playbook should tell the user exactly what to do with the chart");
assert.ok(klineMindWxml.includes('scroll-view class="wave-board-scroll" scroll-x="true"'), "kline chart should use a horizontal training canvas for many real candles");
assert.ok(klineMindWxml.includes('class="chart-stepper"'), "kline chart should expose compact -/+ zoom controls in the chart corner");
assert.ok(klineMindWxml.includes("bindtap=\"decreaseChartZoom\""), "kline chart should let the user zoom out with a minus control");
assert.ok(klineMindWxml.includes("bindtap=\"increaseChartZoom\""), "kline chart should let the user zoom in with a plus control");
assert.ok(klineMindWxml.indexOf('class="chart-stepper"') < klineMindWxml.indexOf('scroll-view class="wave-board-scroll"'), "kline zoom controls should stay fixed in the visible chart corner, not inside the horizontal candle canvas");
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
assert.equal(klineMindWxml.includes("toggleIndicatorPicker"), false, "kline indicators should not use a dropdown picker");
assert.equal(klineMindWxml.includes('class="sub-indicator-menu"'), false, "kline indicators should not render a dropdown menu");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("主图"), false, "kline indicator row should not spell out main-chart labels");
assert.equal(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("副图"), false, "kline indicator row should not spell out sub-chart labels");
assert.ok(sliceBetween(klineMindWxml, 'class="indicator-strip"', 'class="sub-indicator-board').includes("chart-indicator-chip"), "kline indicator row should use chart-scoped chip styles");
assert.deepStrictEqual(demoSession.indicatorCatalog.map((item) => item.label), ["MA", "MACD", "BOLL", "VOL"]);
assertRuleHas(klineMindWxss, ".slice-switch", ["flex-wrap: wrap"], "kline slice controls should wrap instead of overflowing on narrow screens");
assertRuleHas(klineMindWxss, ".slice-switch > .slice-actions", ["grid-template-columns: repeat(2, minmax(0, 1fr))", "width: 100%"], "kline slice action buttons should stay inside the card");
assertRuleHas(klineMindWxss, ".chart-period-rail", ["display: inline-flex", "align-items: center"], "kline timeframe selector should use a compact toolbar instead of a full-width segmented block");
assertRuleHas(klineMindWxss, ".indicator-strip", ["display: flex", "overflow-x: auto"], "kline indicator selector should be one horizontal row");
assertRuleHas(klineMindWxss, ".chart-indicator-chip", ["flex: 0 0 auto", "height: 38rpx"], "kline indicator chips should stay compact inside the chart toolbar");
assertRuleHas(klineMindWxss, ".decision-action", ["width: 100%", "box-sizing: border-box"], "kline decision actions should use stable non-native button boxes");
assert.ok(trainingWxml.includes('class="training-subtle-links"'), "training plan/detail entries should sit in a quiet secondary link row");
assert.ok(trainingWxml.indexOf('class="primary-btn kline-entry-btn"') < trainingWxml.indexOf('class="training-subtle-links"'), "training first screen should visually encounter the single primary action before optional links");
assertRuleHas(trainingWxss, ".training-subtle-link", ["background: transparent", "border: 0", "box-shadow: none"], "training optional links should be visually quieter than buttons");
assert.ok(livingMirrorWxml.includes('wx:if="{{hasRecords}}" class="ghost-btn mirror-depth-toggle"'), "living mirror should show growth details only after at least one record exists");
assert.ok(bottomTabJs.includes("wx.redirectTo({"), "bottom tab primary navigation should use light redirect navigation to avoid full-page white reloads");
assert.ok(bottomTabJs.includes("fail: () => wx.reLaunch({"), "bottom tab navigation should keep reLaunch only as a fallback when redirect fails");
assert.equal(bottomTabJs.includes("this.setData({ activeKey: key });"), false, "bottom tab should not visually switch the old page before the route has changed");
assert.ok(bottomTabJs.includes("transitioning"), "bottom tab should expose an in-flight transition state to cover stale or white page frames");
assert.ok(bottomTabJs.includes("setTimeout("), "bottom tab should let the transition veil paint before starting the route change");
assert.ok(bottomTabWxml.includes('wx:if="{{transitioning}}" class="tab-transition-veil"'), "bottom tab should render a dark transition veil while routes change");
assertRuleHas(bottomTabWxss, ".tab-transition-veil", ["position: fixed", "z-index: 58"], "bottom tab transition veil should cover the page content but leave the tab bar stable");
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
assertRuleHas(klineMindWxss, ".slice-switch button", ["display: inline-flex", "align-items: center", "justify-content: center", "line-height: 1.2"], "kline slice switch should center its label");
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
