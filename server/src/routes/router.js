import { config } from "../config.js";
import { readJson, readRawBody, sendJson, notFound, serveStatic } from "../lib/http.js";
import { startAssessment, submitAssessment, getAssessment, getUserAssessmentHistory } from "../services/assessments.js";
import { getNextAssistantQr } from "../services/assistantQr.js";
import { assertUserAccess, authenticateRequest, getUser, loginOrRegisterUser } from "../services/auth.js";
import { syncReportToFeishu } from "../services/feishu.js";
import { createForumComment, createForumPost, forumCategories, getForumPost, listForumPosts } from "../services/forum.js";
import { checkInUser, getUserHabit } from "../services/habits.js";
import { getUserInfluence } from "../services/influence.js";
import { getKlineBankStats, getKlineLeaderboard, getNextKlinePractice, getUserKlineLevel, getUserKlineStats, submitKlinePractice } from "../services/marketPractice.js";
import { getMiniprogramState, saveMiniprogramState } from "../services/miniprogramSync.js";
import { bindDojoMentor, createDojoTask, getDojoLeaderboard, getMentorDashboard, getUserDojoBindings, getUserDojoSummary, listDojoMentors, listDojoMindRecords, listDojoTasks, registerDojoMentor, saveDojoMindRecord, saveUserDojoTaskRecord } from "../services/dojo.js";
import { createPhoneLoginCode, normalizePhone, verifyPhoneLoginCode } from "../services/phoneAuth.js";
import { getPublicStats } from "../services/stats.js";
import { getI18nBundle, listSupportedLocales } from "../services/i18n.js";
import { getQuestionBankStats } from "../services/questionBank.js";
import { consumeWechatAuthCode, createWechatAuthUrl } from "../services/wechatAuth.js";
import { advanceZhixingReplaySession, finishZhixingReplaySession, getZhixingReplaySession, listZhixingReplayResults, startZhixingReplaySession, submitZhixingReplayDecision } from "../services/zhixingReplay.js";
import { dispatchTrainingPrescriptionBinding, generateShareCardBinding, getAdminUserFromBindings, getDataBindingUserSummary, getInviteSourceStatsBinding, getRetestComparisonBinding, getShareCardBinding, getTrainingPrescriptionBinding, getUserReportBinding, listAdminUsersFromBindings, listTradeReviewBindings, saveAssessmentReportBinding, saveKLineRecordBinding, saveRetestResultBinding, saveTradeReviewBinding, saveTrainingRecordBinding, syncAssistantSummaryToFeishuBinding, updateAssistantHandoffBinding } from "../services/dataBinding.js";
import { getGlobalReflectionToday, listGlobalReflectionChoices, submitGlobalReflectionVote } from "../services/globalReflection.js";
import { buildHistoricalKlineSlice, downloadHistoricalKline, getHistoricalKlineRules, listHistoricalKlineCatalog, listHistoricalKlineInstruments, revealHistoricalKlineSlice } from "../services/historicalKline.js";
import { buildTradeReviewOcrDraft } from "../services/tradeReviewOcr.js";
import { createYmtyLivecode, createYmtyOrder, getYmtyAdminCampaign, getYmtyAfterpayEntrance, getYmtyAuditLogs, getYmtyOrderForPayment, getYmtyOrderStatus, getYmtyPublicCampaign, isYmtyMockPaymentAllowed, listYmtyCourseUsers, listYmtyLivecodeAssignments, listYmtyLivecodes, listYmtyOrders, markYmtyMockPaySuccess, markYmtyOrderPaid, switchYmtyAfterpayLivecode, toggleYmtyLivecodeFull, toggleYmtyLivecodeStatus, updateYmtyCampaign, updateYmtyLivecode, updateYmtyLivecodeByKey } from "../services/ymtyCampaign.js";
import { getYmtyAnalyticsSummary, recordYmtyFrontendEvent } from "../services/ymtyAnalytics.js";
import { addYmtyCrmNote, exportYmtyCrmCsv, getYmtyCrmLead, listYmtyCrmLeads, publicYmtyCrmLead, publicYmtyCrmLeadDetail, updateYmtyCrmLead, updateYmtyCrmLeadStage } from "../services/ymtyCrm.js";
import { getYmtyWecomSummary, linkYmtyWecomEventToLead, listYmtyWecomEvents, listYmtyWecomSyncJobs, publicYmtyWecomEvent, publicYmtyWecomSyncJob, receiveYmtyWecomCallback, retryYmtyWecomSyncJob, verifyYmtyWecomCallbackUrl } from "../services/wecomCustomer.js";
import { getYmtyRefundConfigStatus, getYmtyRefundPolicy, previewYmtyRefund, updateYmtyRefundPolicy } from "../services/ymtyRefundPolicy.js";
import { approveYmtyRefund, createYmtyRefund, executeYmtyRefund, getYmtyRefund, handleWechatRefundNotify, listYmtyRefunds, queryYmtyRefundProvider, rejectYmtyRefund } from "../services/ymtyRefunds.js";
import { authenticateYmtyAdmin, changeYmtyAdminPassword, getYmtyAdminMe, loginYmtyAdmin, logoutYmtyAdmin } from "../services/adminAuth.js";
import { saveYmtyLivecodeUpload } from "../services/ymtyUpload.js";
import { assertRealPayConfigReady, createH5Order, createJsapiOrder, createWapOrder, isPaymentConfigError, normalizePayChannel, parseAlipayNotify, parseWechatNotify, validateAlipayPayment, validateWechatPayment, verifyAlipayNotify, verifyWechatNotify } from "../services/payments/index.js";
import { handleKlineSegmentRoute } from "./klineSegments.js";
import { handleKlineSamplingRoute } from "./klineSampling.js";
import { handleTrainingPackRoute } from "./trainingPacks.js";
import { handleDataBindingRoute } from "./dataBinding.js";

export async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/v1") {
    return sendJson(res, 200, {
      ok: true,
      service: "trading-personality-server",
      message: "AI交易人格测评后端正在运行。请访问下面的接口路径。",
      endpoints: {
        health: "GET /health",
        public_stats: "GET /api/v1/stats/public",
        question_stats: "GET /api/v1/questions/stats",
        demo_login: "POST /api/v1/auth/demo-login",
        send_sms_code: "POST /api/v1/auth/sms/send",
        phone_login: "POST /api/v1/auth/phone-login",
        assistant_qr_next: "GET /api/v1/assistant-qrs/next",
        wechat_start: "GET /api/v1/auth/wechat/start?mode=auto|mp|open",
        wechat_callback: "GET /api/v1/auth/wechat/callback",
        user_habit: "GET /api/v1/users/:user_id/habit",
        user_assessments: "GET /api/v1/users/:user_id/assessments",
        user_check_in: "POST /api/v1/users/:user_id/check-in",
        user_miniprogram_state: "GET|POST /api/v1/users/:user_id/miniprogram-state",
        user_influence: "GET /api/v1/users/:user_id/influence",
        dojo_summary: "GET /api/v1/users/:user_id/dojo/summary",
        dojo_bindings: "GET|POST /api/v1/users/:user_id/dojo/bindings",
        dojo_task_record: "POST /api/v1/users/:user_id/dojo/tasks/:task_id/records",
        dojo_mind_records: "GET|POST /api/v1/users/:user_id/dojo/mind-records",
        dojo_mentors: "GET /api/v1/dojo/mentors",
        dojo_mentor_register: "POST /api/v1/dojo/mentors/register",
        dojo_mentor_dashboard: "GET /api/v1/dojo/mentor-dashboard",
        dojo_tasks: "GET|POST /api/v1/dojo/tasks",
        dojo_leaderboard: "GET /api/v1/dojo/leaderboard",
        start_assessment: "POST /api/v1/assessments/start",
        get_assessment: "GET /api/v1/assessments/:assessment_id",
        submit_assessment: "POST /api/v1/assessments/:assessment_id/submit",
        kline_practice_submit: "POST /api/v1/kline-practice/submit",
        kline_practice_next: "GET /api/v1/kline-practice/next",
        kline_practice_levels: "GET /api/v1/kline-practice/levels?user_id=xxx",
        kline_practice_stats: "GET /api/v1/kline-practice/stats",
        kline_practice_leaderboard: "GET /api/v1/kline-practice/leaderboard?period=week|month|all",
        kline_history_catalog: "GET /api/v1/kline-history/catalog",
        kline_history_instruments: "GET /api/v1/kline-history/instruments?market=cn_equity&timeframe=1d",
        kline_history_rules: "GET /api/v1/kline-history/rules?market=cn_equity",
        kline_history_slice: "GET /api/v1/kline-history/slice?market=cn_equity&symbol=600519&timeframe=1d&blind=1",
        kline_history_reveal: "GET /api/v1/kline-history/reveal?token=xxx",
        kline_history_download: "POST /api/v1/kline-history/download",
        kline_segments: "GET|POST /api/v1/kline-segments",
        kline_segment: "GET|PATCH /api/v1/kline-segments/:id",
        kline_segment_enabled: "PATCH /api/v1/kline-segments/:id/enabled",
        kline_training_sample: "POST /api/v1/kline-training/sample",
        zhixing_replay_start: "POST /api/v1/zhixing-replay/start",
        zhixing_replay_session: "GET /api/v1/zhixing-replay/:session_id",
        zhixing_replay_decision: "POST /api/v1/zhixing-replay/:session_id/decision",
        zhixing_replay_next: "POST /api/v1/zhixing-replay/:session_id/next",
        zhixing_replay_finish: "POST /api/v1/zhixing-replay/:session_id/finish",
        zhixing_replay_results: "GET /api/v1/users/:user_id/zhixing-replay/results",
        training_packs: "GET|POST /api/v1/training-packs",
        training_pack: "PATCH /api/v1/training-packs/:id",
        training_pack_enabled: "PATCH /api/v1/training-packs/:id/enabled",
        forum_posts: "GET /api/v1/forum/posts?category=&q=",
        forum_create_post: "POST /api/v1/forum/posts",
        forum_post: "GET /api/v1/forum/posts/:post_id",
        forum_comment: "POST /api/v1/forum/posts/:post_id/comments",
        feishu_report_sync: "POST /api/v1/integrations/feishu/report",
        data_binding_assessment_report: "POST /api/v1/data-binding/assessment-report",
        data_binding_user_report: "GET /api/v1/data-binding/users/:user_id/report",
        data_binding_training_record: "POST /api/v1/data-binding/users/:user_id/training-records",
        data_binding_kline_record: "POST /api/v1/data-binding/users/:user_id/kline-records",
        data_binding_training_bookmarks: "GET|POST /api/v1/data-binding/users/:user_id/training-bookmarks",
        data_binding_training_bookmark: "PATCH|DELETE /api/v1/data-binding/users/:user_id/training-bookmarks/:id",
        data_binding_trade_review: "GET|POST /api/v1/data-binding/users/:user_id/trade-reviews",
        data_binding_trade_review_ocr: "POST /api/v1/data-binding/users/:user_id/trade-review-ocr",
        data_binding_retest: "POST /api/v1/data-binding/users/:user_id/retests",
        data_binding_retest_comparison: "GET /api/v1/data-binding/users/:user_id/retest-comparison",
        data_binding_user_summary: "GET /api/v1/data-binding/users/:user_id/summary",
        data_binding_training_prescription: "GET|POST /api/v1/data-binding/users/:user_id/training-prescription",
        admin_users: "GET /api/v1/admin/users",
        admin_user_detail: "GET /api/v1/admin/users/:user_id",
        admin_assistant_handoff: "POST /api/v1/admin/users/:user_id/assistant-handoff",
        admin_feishu_sync: "POST /api/v1/admin/users/:user_id/feishu-sync",
        admin_invite_sources: "GET /api/v1/admin/invite-sources",
        data_binding_share_card: "GET|POST /api/v1/data-binding/users/:user_id/share-card",
        i18n_locales: "GET /api/v1/i18n/locales",
        i18n_bundle: "GET /api/v1/i18n/bundle?locale=zh-CN",
        global_reflection_options: "GET /api/v1/global-reflection/options",
        global_reflection_today: "GET /api/v1/global-reflection/today",
        global_reflection_vote: "POST /api/v1/global-reflection/vote",
        ymty_pay_create: "POST /api/pay/create",
        ymty_track: "POST /api/track/ymty",
        ymty_wechat_notify: "POST /api/pay/wechat/notify",
        ymty_alipay_notify: "POST /api/pay/alipay/notify",
        ymty_order_status: "GET /api/order/status?order_id=ymty_xxx",
        ymty_afterpay_entrance: "GET /api/afterpay/entrance?order_id=ymty_xxx",
        ymty_course_my: "GET /api/course/my?user_id=xxx"
      }
    });
  }

  if (req.method === "GET" && pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "trading-personality-server",
      time: new Date().toISOString()
    });
  }

  if (await handleTrainingPackRoute(req, res, { url, pathname })) return;
  if (await handleKlineSegmentRoute(req, res, { url, pathname })) return;
  if (await handleKlineSamplingRoute(req, res, { url, pathname })) return;
  if (await handleDataBindingRoute(req, res, { url, pathname })) return;

  if (req.method === "GET" && pathname === "/api/v1/stats/public") {
    const stats = await getPublicStats();
    return sendJson(res, 200, { ok: true, ...stats });
  }

  if (req.method === "GET" && pathname === "/api/public/campaign/ymty") {
    const campaign = await getYmtyPublicCampaign();
    return sendJson(res, 200, { ok: true, ...campaign });
  }

  if (req.method === "GET" && pathname === "/api/wecom/customer/callback") {
    try {
      const result = verifyYmtyWecomCallbackUrl(Object.fromEntries(url.searchParams.entries()));
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      return res.end(result.echostr);
    } catch (error) {
      return sendWecomRouteError(res, error);
    }
  }

  if (req.method === "POST" && pathname === "/api/wecom/customer/callback") {
    const rawBody = await readRawBody(req, 256 * 1024);
    try {
      const result = await receiveYmtyWecomCallback({
        query: Object.fromEntries(url.searchParams.entries()),
        rawBody: rawBody.toString("utf8")
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      return sendWecomRouteError(res, error);
    }
  }

  if (req.method === "POST" && pathname === "/api/track/ymty") {
    const body = await readLimitedJson(req, 16 * 1024);
    const orderId = body.order_id || body.orderId || "";
    let isOrderPaid = false;
    if (orderId) {
      try {
        const order = await getYmtyOrderForPayment(orderId);
        isOrderPaid = order.pay_status === "paid";
      } catch {
        isOrderPaid = false;
      }
    }
    const result = await recordYmtyFrontendEvent({
      body,
      ip: getIp(req),
      userAgent: req.headers["user-agent"] || "",
      isOrderPaid
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/pay/create") {
    const body = await readJson(req);
    const track = body.track && typeof body.track === "object" ? body.track : {};
    const payChannel = normalizePayChannel(body.pay_channel || body.payChannel || "mock");
    try {
      assertRealPayConfigReady(payChannel);
    } catch (error) {
      if (isPaymentConfigError(error)) {
        return sendJson(res, error.statusCode || 503, {
          code: error.statusCode || 503,
          message: error.message
        });
      }
      throw error;
    }

    if (payChannel === "wechat_jsapi") {
      const openid = body.openid || body.openId || getCookie(req, "ymty_wechat_openid");
      if (!openid) {
        const oauthReturnUrl = body.oauth_return_url || body.oauthReturnUrl || req.headers.referer || "/hd/ymty/index.html";
        return sendJson(res, 428, {
          ok: false,
          provider: "wechat",
          code: "OAUTH_REQUIRED",
          message: "微信 JSAPI 支付需要 openid，请先完成微信网页授权",
          oauth_url: buildWechatOAuthStartUrl(req, oauthReturnUrl)
        });
      }
    }

    const created = await createYmtyOrder({
      productCode: body.product_code || body.productCode,
      payChannel,
      channel: body.channel || track.channel,
      campaign: body.campaign || track.campaign,
      creative: body.creative || track.creative,
      sessionId: track.session_id || track.sessionId,
      clickId: track.click_id || track.gdt_vid || track.bd_vid || track.douyin_click_id,
      landingUrl: track.landing_url,
      referrerHost: getReferrerHost(track.referrer || req.headers.referer || "")
    });

    if (payChannel !== "mock") {
      const redirectUrl = buildSuccessUrl(req, created.order, body.success_url || body.successUrl || "");
      const context = {
        ip: getIp(req),
        userAgent: req.headers["user-agent"] || "",
        redirectUrl,
        returnUrl: redirectUrl,
        openid: body.openid || body.openId || getCookie(req, "ymty_wechat_openid")
      };
      let payment;
      try {
        payment = payChannel === "wechat_jsapi"
          ? await createJsapiOrder(created.order, context)
          : payChannel === "wechat_h5"
            ? await createH5Order(created.order, context)
            : await createWapOrder(created.order, context);
      } catch (error) {
        if (error.provider) {
          return sendJson(res, error.statusCode || 502, {
            ok: false,
            provider: error.provider,
            code: error.providerCode || "PAYMENT_PROVIDER_ERROR",
            message: error.providerMessage || error.message
          });
        }
        throw error;
      }
      return sendJson(res, 200, { ok: true, order: created.order, payment });
    }

    return sendJson(res, 200, { ok: true, ...created });
  }

  if (req.method === "GET" && pathname === "/api/order/status") {
    const result = await getYmtyOrderStatus({
      orderId: url.searchParams.get("order_id") || url.searchParams.get("orderId") || "",
      token: url.searchParams.get("token") || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/afterpay/entrance") {
    try {
      const result = await getYmtyAfterpayEntrance({
        orderId: url.searchParams.get("order_id") || url.searchParams.get("orderId") || "",
        token: url.searchParams.get("token") || ""
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      if (error.code === "NO_AVAILABLE_LIVECODE") {
        return sendJson(res, error.statusCode || 503, {
          ok: false,
          code: error.code,
          message: error.message
        });
      }
      throw error;
    }
  }

  if (req.method === "POST" && pathname === "/api/afterpay/entrance/switch") {
    const body = await readJson(req);
    try {
      const result = await switchYmtyAfterpayLivecode({
        orderId: body.order_id || body.orderId || "",
        token: body.token || "",
        reason: body.reason || "user_reported_failure",
        ip: getIp(req)
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      if (["NO_ALTERNATIVE_LIVECODE", "SWITCH_LIMIT_EXCEEDED", "NO_AVAILABLE_LIVECODE"].includes(error.code)) {
        return sendJson(res, error.statusCode || 503, {
          ok: false,
          code: error.code,
          message: error.message
        });
      }
      throw error;
    }
  }

  if (req.method === "POST" && pathname === "/api/mock/pay-success") {
    if (!isYmtyMockPaymentAllowed()) return notFound(res);
    const body = await readJson(req);
    const result = await markYmtyMockPaySuccess({
      orderId: body.order_id || body.orderId || url.searchParams.get("order_id") || "",
      token: body.token || url.searchParams.get("token") || "",
      transactionId: body.transaction_id || body.transactionId || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/pay/mock/complete") {
    if (!isYmtyMockPaymentAllowed()) return notFound(res);
    const body = await readJson(req);
    const result = await markYmtyMockPaySuccess({
      orderId: body.order_id || body.orderId || url.searchParams.get("order_id") || "",
      token: body.token || url.searchParams.get("token") || "",
      transactionId: body.transaction_id || body.transactionId || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/course/my") {
    const query = Object.fromEntries(url.searchParams.entries());
    const { course_users: courseUsers } = await listYmtyCourseUsers();
    const courses = courseUsers.filter((item) => {
      if (query.order_id || query.orderId) return item.order_id === (query.order_id || query.orderId);
      if (query.user_id || query.userId) return item.user_id === (query.user_id || query.userId);
      if (query.openid) return item.openid === query.openid;
      if (query.unionid) return item.unionid === query.unionid;
      return false;
    }).map((item) => ({
      course_id: item.product_code,
      course_name: item.course_name,
      status: item.status,
      order_id: item.order_id,
      unlocked_at: item.paid_at,
      product_code: item.product_code
    }));
    return sendJson(res, 200, { ok: true, courses });
  }

  if (req.method === "GET" && pathname === "/api/wechat/oauth/start") {
    const oauthUrl = buildWechatOAuthAuthorizeUrl(req, url.searchParams.get("return_url") || "");
    res.writeHead(302, {
      Location: oauthUrl,
      "Cache-Control": "no-store"
    });
    return res.end();
  }

  if (req.method === "GET" && pathname === "/api/wechat/oauth/callback") {
    const result = await exchangeWechatOAuthCode({
      code: url.searchParams.get("code") || ""
    });
    const state = parseOAuthState(url.searchParams.get("state") || "");
    res.writeHead(302, {
      Location: normalizeOAuthReturnUrl(req, state.returnUrl || ""),
      "Set-Cookie": `ymty_wechat_openid=${encodeURIComponent(result.openid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800`,
      "Cache-Control": "no-store"
    });
    return res.end();
  }

  if (req.method === "POST" && pathname === "/api/pay/wechat/notify") {
    const rawBody = await readRawBody(req, 1024 * 1024);
    try {
      await verifyWechatNotify(req.headers, rawBody);
      const payload = await parseWechatNotify(rawBody);
      const order = await getYmtyOrderForPayment(payload.out_trade_no);
      validateWechatPayment(payload, order);
      await markYmtyOrderPaid({
        orderId: order.order_id,
        payChannel: order.pay_channel,
        transactionId: payload.transaction_id,
        eventType: "wechat_pay_success",
        rawPayload: {
          out_trade_no: payload.out_trade_no,
          transaction_id: payload.transaction_id,
          trade_state: payload.trade_state,
          amount: payload.amount
        },
        verifyStatus: "wechat_verified"
      });
      return sendJson(res, 200, { code: "SUCCESS", message: "成功" });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        code: "FAIL",
        message: error.message || "微信支付通知处理失败"
      });
    }
  }

  if (req.method === "POST" && pathname === "/api/pay/wechat/refund-notify") {
    const rawBody = await readRawBody(req, 1024 * 1024);
    try {
      await handleWechatRefundNotify({
        headers: req.headers,
        body: rawBody
      });
      return sendJson(res, 200, { code: "SUCCESS", message: "成功" });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        code: "FAIL",
        message: error.message || "微信退款通知处理失败"
      });
    }
  }

  if (req.method === "POST" && pathname === "/api/pay/alipay/notify") {
    const rawBody = await readRawBody(req, 1024 * 1024);
    const params = Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
    try {
      await verifyAlipayNotify(params);
      const payload = await parseAlipayNotify(params);
      const order = await getYmtyOrderForPayment(payload.out_trade_no);
      validateAlipayPayment(payload, order);
      await markYmtyOrderPaid({
        orderId: order.order_id,
        payChannel: order.pay_channel,
        transactionId: payload.trade_no,
        eventType: "alipay_pay_success",
        rawPayload: {
          out_trade_no: payload.out_trade_no,
          trade_no: payload.trade_no,
          trade_status: payload.trade_status,
          total_amount: payload.total_amount
        },
        verifyStatus: "alipay_verified"
      });
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      return res.end("success");
    } catch (error) {
      res.writeHead(error.statusCode || 400, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      return res.end("fail");
    }
  }

  if (req.method === "POST" && pathname === "/api/admin/login") {
    const body = await readJson(req);
    const result = await loginYmtyAdmin({
      username: body.username || "",
      password: body.password || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/me") {
    const result = await getYmtyAdminMe(req);
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/change-password") {
    const body = await readJson(req);
    const result = await changeYmtyAdminPassword(req, {
      oldPassword: body.old_password || body.oldPassword || "",
      newPassword: body.new_password || body.newPassword || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    const result = await logoutYmtyAdmin(req);
    return sendJson(res, 200, result);
  }

  if (req.method === "GET" && pathname === "/api/admin/campaign/ymty") {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyAdminCampaign();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/campaign/ymty") {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyCampaign({
      adminId: admin.adminId,
      patch: body,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/livecode") {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyLivecode({
      adminId: admin.adminId,
      patch: body,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/livecodes") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyLivecodes();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/livecodes") {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await createYmtyLivecode({
      adminId: admin.adminId,
      patch: body,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const livecodeToggleFullMatch = pathname.match(/^\/api\/admin\/livecodes\/([^/]+)\/toggle-full$/);
  if (req.method === "POST" && livecodeToggleFullMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await toggleYmtyLivecodeFull({
      adminId: admin.adminId,
      codeKey: decodeURIComponent(livecodeToggleFullMatch[1]),
      manualFull: body.manual_full ?? body.manualFull,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const livecodeToggleStatusMatch = pathname.match(/^\/api\/admin\/livecodes\/([^/]+)\/toggle-status$/);
  if (req.method === "POST" && livecodeToggleStatusMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await toggleYmtyLivecodeStatus({
      adminId: admin.adminId,
      codeKey: decodeURIComponent(livecodeToggleStatusMatch[1]),
      status: body.status || "active",
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const livecodeUpdateMatch = pathname.match(/^\/api\/admin\/livecodes\/([^/]+)$/);
  if (req.method === "POST" && livecodeUpdateMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyLivecodeByKey({
      adminId: admin.adminId,
      codeKey: decodeURIComponent(livecodeUpdateMatch[1]),
      patch: body,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/livecode-assignments") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyLivecodeAssignments();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/upload") {
    try {
      await assertYmtyAdminAccess(req);
      const result = await saveYmtyLivecodeUpload(req);
      return sendJson(res, 200, { code: 0, data: result });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        code: error.statusCode || 400,
        message: error.message || "上传失败"
      });
    }
  }

  if (req.method === "GET" && pathname === "/api/admin/orders") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyOrders();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/audit-logs") {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyAuditLogs();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/crm/leads") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyCrmLeads(Object.fromEntries(url.searchParams.entries()));
    return sendJson(res, 200, { ok: true, leads: result.leads.map((lead) => publicYmtyCrmLead(lead)) });
  }

  if (req.method === "GET" && pathname === "/api/admin/crm/export.csv") {
    await assertYmtyAdminAccess(req);
    const csv = await exportYmtyCrmCsv(Object.fromEntries(url.searchParams.entries()));
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"ymty-crm-leads.csv\"",
      "Cache-Control": "no-store"
    });
    return res.end(csv);
  }

  const crmLeadMatch = pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)$/);
  if (req.method === "GET" && crmLeadMatch) {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyCrmLead(decodeURIComponent(crmLeadMatch[1]));
    return sendJson(res, 200, { ok: true, ...publicYmtyCrmLeadDetail(result) });
  }

  if (req.method === "POST" && crmLeadMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyCrmLead({
      leadId: decodeURIComponent(crmLeadMatch[1]),
      patch: body,
      adminId: admin.adminId,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, lead: publicYmtyCrmLead(result.lead) });
  }

  const crmStageMatch = pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)\/stage$/);
  if (req.method === "POST" && crmStageMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyCrmLeadStage({
      leadId: decodeURIComponent(crmStageMatch[1]),
      stage: body.stage || "",
      reason: body.reason || body.note || "",
      adminId: admin.adminId,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, lead: publicYmtyCrmLead(result.lead) });
  }

  const crmNoteMatch = pathname.match(/^\/api\/admin\/crm\/leads\/([^/]+)\/note$/);
  if (req.method === "POST" && crmNoteMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await addYmtyCrmNote({
      leadId: decodeURIComponent(crmNoteMatch[1]),
      body: body.body || body.note || "",
      adminId: admin.adminId,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/refunds/config") {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyRefundConfigStatus();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/refund-policy") {
    await assertYmtyAdminAccess(req);
    const policy = await getYmtyRefundPolicy();
    return sendJson(res, 200, { ok: true, policy });
  }

  if (req.method === "POST" && pathname === "/api/admin/refund-policy") {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await updateYmtyRefundPolicy({
      patch: body,
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/refunds/preview") {
    await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await previewYmtyRefund({
      orderId: body.order_id || body.orderId || "",
      amountCents: body.amount_cents ?? body.amountCents,
      triggerType: body.trigger_type || body.triggerType || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/refunds") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyRefunds(Object.fromEntries(url.searchParams.entries()));
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/admin/refunds") {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await createYmtyRefund({
      orderId: body.order_id || body.orderId || "",
      amountCents: body.amount_cents ?? body.amountCents,
      reason: body.reason || "",
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const refundApproveMatch = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/approve$/);
  if (req.method === "POST" && refundApproveMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const result = await approveYmtyRefund({
      refundId: decodeURIComponent(refundApproveMatch[1]),
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const refundRejectMatch = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/reject$/);
  if (req.method === "POST" && refundRejectMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await rejectYmtyRefund({
      refundId: decodeURIComponent(refundRejectMatch[1]),
      reason: body.reason || body.note || "",
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const refundExecuteMatch = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/execute$/);
  if (req.method === "POST" && refundExecuteMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await executeYmtyRefund({
      refundId: decodeURIComponent(refundExecuteMatch[1]),
      confirmOrderSuffix: body.confirm_order_suffix || body.confirmOrderSuffix || "",
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const refundQueryMatch = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/query$/);
  if (req.method === "POST" && refundQueryMatch) {
    const admin = await assertYmtyAdminAccess(req);
    const result = await queryYmtyRefundProvider({
      refundId: decodeURIComponent(refundQueryMatch[1]),
      admin,
      ip: getIp(req)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const refundDetailMatch = pathname.match(/^\/api\/admin\/refunds\/([^/]+)$/);
  if (req.method === "GET" && refundDetailMatch) {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyRefund(decodeURIComponent(refundDetailMatch[1]));
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/wecom/customer/summary") {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyWecomSummary();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/wecom/customer/events") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyWecomEvents(Object.fromEntries(url.searchParams.entries()));
    return sendJson(res, 200, { ok: true, events: result.events.map((event) => publicYmtyWecomEvent(event)) });
  }

  if (req.method === "GET" && pathname === "/api/admin/wecom/customer/sync-jobs") {
    await assertYmtyAdminAccess(req);
    const result = await listYmtyWecomSyncJobs(Object.fromEntries(url.searchParams.entries()));
    return sendJson(res, 200, { ok: true, jobs: result.jobs.map((job) => publicYmtyWecomSyncJob(job)) });
  }

  const wecomEventLinkMatch = pathname.match(/^\/api\/admin\/wecom\/customer\/events\/([^/]+)\/link$/);
  if (req.method === "POST" && wecomEventLinkMatch) {
    await assertYmtyAdminAccess(req);
    const body = await readJson(req);
    const result = await linkYmtyWecomEventToLead({
      eventId: decodeURIComponent(wecomEventLinkMatch[1]),
      leadId: body.lead_id || body.leadId || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const wecomSyncRetryMatch = pathname.match(/^\/api\/admin\/wecom\/customer\/sync-jobs\/([^/]+)\/retry$/);
  if (req.method === "POST" && wecomSyncRetryMatch) {
    await assertYmtyAdminAccess(req);
    const result = await retryYmtyWecomSyncJob(decodeURIComponent(wecomSyncRetryMatch[1]));
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/admin/analytics/summary") {
    await assertYmtyAdminAccess(req);
    const result = await getYmtyAnalyticsSummary(Object.fromEntries(url.searchParams.entries()));
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/questions/stats") {
    const stats = await getQuestionBankStats();
    return sendJson(res, 200, { ok: true, ...stats });
  }

  if (req.method === "GET" && pathname === "/api/v1/i18n/locales") {
    return sendJson(res, 200, {
      ok: true,
      defaultLocale: "zh-CN",
      supportedLocales: listSupportedLocales()
    });
  }

  if (req.method === "GET" && pathname === "/api/v1/i18n/bundle") {
    const bundle = getI18nBundle({
      locale: url.searchParams.get("locale") || "",
      acceptLanguage: req.headers["accept-language"] || ""
    });
    return sendJson(res, 200, { ok: true, ...bundle });
  }

  if (req.method === "GET" && pathname === "/api/v1/global-reflection/options") {
    return sendJson(res, 200, {
      ok: true,
      choices: listGlobalReflectionChoices()
    });
  }

  if (req.method === "GET" && pathname === "/api/v1/global-reflection/today") {
    const summary = await getGlobalReflectionToday({
      dateKey: url.searchParams.get("date_key") || ""
    });
    return sendJson(res, 200, { ok: true, summary });
  }

  if (req.method === "POST" && pathname === "/api/v1/global-reflection/vote") {
    const body = await readJson(req);
    const result = await submitGlobalReflectionVote({
      anonymousId: body.anonymous_id || body.anonymousId,
      thoughtKey: body.thought_key || body.thoughtKey,
      primaryType: body.primary_type || body.primaryType,
      sourceChannel: body.source_channel || body.sourceChannel,
      dateKey: body.date_key || body.dateKey
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/admin/users") {
    const users = await listAdminUsersFromBindings();
    return sendJson(res, 200, {
      ok: true,
      source: "data-binding-runtime-json",
      users
    });
  }

  if (req.method === "GET" && pathname === "/api/v1/admin/invite-sources") {
    const inviteSources = await getInviteSourceStatsBinding();
    return sendJson(res, 200, {
      ok: true,
      source: "data-binding-runtime-json",
      inviteSources
    });
  }

  const adminUserMatch = pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
  if (req.method === "GET" && adminUserMatch) {
    const user = await getAdminUserFromBindings(adminUserMatch[1]);
    if (!user) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, {
      ok: true,
      source: "data-binding-runtime-json",
      user
    });
  }

  const adminAssistantHandoffMatch = pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)\/assistant-handoff$/);
  if (req.method === "POST" && adminAssistantHandoffMatch) {
    const body = await readJson(req);
    const result = await updateAssistantHandoffBinding(adminAssistantHandoffMatch[1], {
      status: body.status,
      owner: body.owner,
      note: body.note,
      handoffAt: body.handoff_at || body.handoffAt
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const adminFeishuSyncMatch = pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)\/feishu-sync$/);
  if (req.method === "POST" && adminFeishuSyncMatch) {
    const body = await readJson(req);
    const result = await syncAssistantSummaryToFeishuBinding(adminFeishuSyncMatch[1], {
      dryRun: body.dry_run !== false
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/data-binding/assessment-report") {
    const body = await readJson(req);
    const result = await saveAssessmentReportBinding({
      user: body.user,
      report: body.report,
      answers: body.answers,
      questionOrder: body.question_order || body.questionOrder,
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingUserReportMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/report$/);
  if (req.method === "GET" && dataBindingUserReportMatch) {
    const report = await getUserReportBinding(dataBindingUserReportMatch[1]);
    if (!report) return sendJson(res, 404, { ok: false, error: "报告不存在" });
    return sendJson(res, 200, { ok: true, report });
  }

  const dataBindingTrainingMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/training-records$/);
  if (req.method === "POST" && dataBindingTrainingMatch) {
    const body = await readJson(req);
    const result = await saveTrainingRecordBinding({
      user: { ...(body.user || {}), userId: dataBindingTrainingMatch[1] },
      record: body.record,
      practiceState: body.practice_state || body.practiceState || null,
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingKlineMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/kline-records$/);
  if (req.method === "POST" && dataBindingKlineMatch) {
    const body = await readJson(req);
    const result = await saveKLineRecordBinding({
      user: { ...(body.user || {}), userId: dataBindingKlineMatch[1] },
      record: body.record,
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingTradeReviewMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/trade-reviews$/);
  if (req.method === "GET" && dataBindingTradeReviewMatch) {
    const result = await listTradeReviewBindings(dataBindingTradeReviewMatch[1]);
    if (!result) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && dataBindingTradeReviewMatch) {
    const body = await readJson(req);
    const result = await saveTradeReviewBinding({
      user: { ...(body.user || {}), userId: dataBindingTradeReviewMatch[1] },
      review: body.review,
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingTradeReviewOcrMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/trade-review-ocr$/);
  if (req.method === "POST" && dataBindingTradeReviewOcrMatch) {
    const body = await readJson(req);
    const ocrDraft = await buildTradeReviewOcrDraft({
      user: { ...(body.user || {}), userId: dataBindingTradeReviewOcrMatch[1] },
      image: body.image || {},
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ocr_draft: ocrDraft });
  }

  const dataBindingRetestMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/retests$/);
  if (req.method === "POST" && dataBindingRetestMatch) {
    const body = await readJson(req);
    const result = await saveRetestResultBinding({
      user: { ...(body.user || {}), userId: dataBindingRetestMatch[1] },
      report: body.report,
      comparison: body.comparison,
      source: body.source || body.source_channel || "api"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingRetestComparisonMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/retest-comparison$/);
  if (req.method === "GET" && dataBindingRetestComparisonMatch) {
    const comparison = await getRetestComparisonBinding(dataBindingRetestComparisonMatch[1]);
    return sendJson(res, 200, { ok: true, comparison });
  }

  const dataBindingSummaryMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/summary$/);
  if (req.method === "GET" && dataBindingSummaryMatch) {
    const summary = await getDataBindingUserSummary(dataBindingSummaryMatch[1]);
    if (!summary) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, { ok: true, ...summary });
  }

  const dataBindingPrescriptionMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/training-prescription$/);
  if (req.method === "GET" && dataBindingPrescriptionMatch) {
    const result = await getTrainingPrescriptionBinding(dataBindingPrescriptionMatch[1]);
    if (!result) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && dataBindingPrescriptionMatch) {
    const body = await readJson(req);
    const result = await dispatchTrainingPrescriptionBinding(dataBindingPrescriptionMatch[1], {
      source: body.source || body.source_channel || "web-next"
    });
    if (!result) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dataBindingShareCardMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/share-card$/);
  if (req.method === "GET" && dataBindingShareCardMatch) {
    const shareCard = await getShareCardBinding(dataBindingShareCardMatch[1]);
    if (!shareCard) return sendJson(res, 404, { ok: false, error: "分享卡不存在" });
    return sendJson(res, 200, { ok: true, share_card: shareCard });
  }

  if (req.method === "POST" && dataBindingShareCardMatch) {
    const body = await readJson(req);
    const result = await generateShareCardBinding(dataBindingShareCardMatch[1], {
      channel: body.channel || body.source_channel || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/assistant-qrs/next") {
    const result = await getNextAssistantQr();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/auth/demo-login") {
    const body = await readJson(req);
    const result = await loginOrRegisterUser({
      method: body.method || "web_demo",
      displayName: body.display_name || body.nickname || "体验学员",
      contact: body.contact || body.phone || body.openid || "",
      wechatBound: Boolean(body.wechat_bound),
      inviteCode: body.invite_code || "",
      sourceChannel: body.source_channel || body.channel || "网页MVP",
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/auth/sms/send") {
    const body = await readJson(req);
    const result = await createPhoneLoginCode({
      phone: body.phone,
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/auth/phone-login") {
    const body = await readJson(req);
    const phone = normalizePhone(body.phone);
    await verifyPhoneLoginCode({
      phone,
      code: body.code
    });
    const result = await loginOrRegisterUser({
      method: "phone",
      displayName: body.display_name || body.nickname || maskPhone(phone),
      contact: phone,
      wechatBound: Boolean(body.wechat_bound),
      inviteCode: body.invite_code || "",
      sourceChannel: body.source_channel || body.channel || "网页MVP",
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/auth/wechat/start") {
    const result = await createWechatAuthUrl({
      mode: url.searchParams.get("mode") || "auto",
      origin: getPublicOrigin(req),
      redirectPath: url.searchParams.get("redirect_path") || "/",
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    res.writeHead(302, {
      Location: result.auth_url,
      "Cache-Control": "no-store"
    });
    return res.end();
  }

  if (req.method === "GET" && pathname === "/api/v1/auth/wechat/callback") {
    const wechatUser = await consumeWechatAuthCode({
      code: url.searchParams.get("code") || "",
      state: url.searchParams.get("state") || ""
    });
    const result = await loginOrRegisterUser({
      method: `wechat_${wechatUser.mode}`,
      displayName: wechatUser.nickname || "微信学员",
      contact: wechatUser.unionid || wechatUser.openid,
      wechatBound: true,
      inviteCode: "",
      sourceChannel: "微信授权",
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    return sendWechatCallbackHtml(res, {
      user: result.user,
      accessToken: result.access_token,
      expiresAt: result.expires_at,
      redirectPath: wechatUser.redirect_path
    });
  }

  const userMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)$/);
  if (req.method === "GET" && userMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, userMatch[1]);
    const user = await getUser(userMatch[1]);
    if (!user) return sendJson(res, 404, { ok: false, error: "用户不存在" });
    return sendJson(res, 200, { ok: true, user });
  }

  const habitMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/habit$/);
  if (req.method === "GET" && habitMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, habitMatch[1]);
    const habit = await getUserHabit(habitMatch[1]);
    return sendJson(res, 200, { ok: true, habit });
  }

  const userAssessmentsMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/assessments$/);
  if (req.method === "GET" && userAssessmentsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, userAssessmentsMatch[1]);
    const result = await getUserAssessmentHistory(userAssessmentsMatch[1], {
      limit: url.searchParams.get("limit") || 8
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const checkInMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/check-in$/);
  if (req.method === "POST" && checkInMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, checkInMatch[1]);
    const body = await readJson(req);
    const habit = await checkInUser({
      userId: checkInMatch[1],
      sourceChannel: body.source_channel || body.channel || "网页MVP",
      note: body.note || ""
    });
    return sendJson(res, 200, { ok: true, habit });
  }

  const miniprogramStateMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/miniprogram-state$/);
  if (req.method === "GET" && miniprogramStateMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, miniprogramStateMatch[1]);
    const state = await getMiniprogramState(miniprogramStateMatch[1]);
    return sendJson(res, 200, { ok: true, state });
  }

  if (req.method === "POST" && miniprogramStateMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, miniprogramStateMatch[1]);
    const body = await readJson(req);
    const state = await saveMiniprogramState({
      userId: miniprogramStateMatch[1],
      state: body.state || body,
      sourceChannel: body.source_channel || body.channel || "微信小程序MVP"
    });
    return sendJson(res, 200, { ok: true, state });
  }

  const influenceMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/influence$/);
  if (req.method === "GET" && influenceMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, influenceMatch[1]);
    const influence = await getUserInfluence(influenceMatch[1]);
    return sendJson(res, 200, { ok: true, influence });
  }

  const dojoSummaryMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/dojo\/summary$/);
  if (req.method === "GET" && dojoSummaryMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoSummaryMatch[1]);
    const summary = await getUserDojoSummary(dojoSummaryMatch[1]);
    return sendJson(res, 200, { ok: true, summary });
  }

  const dojoBindingsMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/dojo\/bindings$/);
  if (req.method === "GET" && dojoBindingsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoBindingsMatch[1]);
    const relation = await getUserDojoBindings(dojoBindingsMatch[1]);
    return sendJson(res, 200, { ok: true, relation });
  }

  if (req.method === "POST" && dojoBindingsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoBindingsMatch[1]);
    const body = await readJson(req);
    const result = await bindDojoMentor({
      userId: dojoBindingsMatch[1],
      mentorCode: body.mentor_code || body.mentorCode,
      role: body.role || body.mentor_role || "",
      sourceChannel: body.source_channel || body.channel || "微信小程序MVP"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dojoTaskRecordMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/dojo\/tasks\/([^/]+)\/records$/);
  if (req.method === "POST" && dojoTaskRecordMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoTaskRecordMatch[1]);
    const body = await readJson(req);
    const result = await saveUserDojoTaskRecord({
      userId: dojoTaskRecordMatch[1],
      taskId: dojoTaskRecordMatch[2],
      action: body.action || body.status,
      note: body.note || "",
      sourceChannel: body.source_channel || body.channel || "微信小程序MVP"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const dojoMindRecordsMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/dojo\/mind-records$/);
  if (req.method === "GET" && dojoMindRecordsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoMindRecordsMatch[1]);
    const records = await listDojoMindRecords(dojoMindRecordsMatch[1], {
      limit: url.searchParams.get("limit") || 20
    });
    return sendJson(res, 200, { ok: true, records });
  }

  if (req.method === "POST" && dojoMindRecordsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, dojoMindRecordsMatch[1]);
    const body = await readJson(req);
    const record = await saveDojoMindRecord({
      userId: dojoMindRecordsMatch[1],
      input: body.input || body.question || body.content,
      reply: body.reply || null,
      context: body.context || {},
      sourceChannel: body.source_channel || body.channel || "微信小程序MVP"
    });
    return sendJson(res, 200, { ok: true, record });
  }

  if (req.method === "GET" && pathname === "/api/v1/dojo/mentors") {
    const mentors = await listDojoMentors({
      role: url.searchParams.get("role") || "",
      status: url.searchParams.get("status") || "active",
      limit: url.searchParams.get("limit") || 50
    });
    return sendJson(res, 200, { ok: true, mentors });
  }

  if (req.method === "POST" && pathname === "/api/v1/dojo/mentors/register") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const mentor = await registerDojoMentor({
      userId: auth.user.id,
      role: body.role || "coach",
      displayName: body.display_name || body.nickname || auth.user.nickname,
      bio: body.bio || "",
      sourceChannel: body.source_channel || body.channel || "后端API"
    });
    return sendJson(res, 200, { ok: true, mentor });
  }

  if (req.method === "GET" && pathname === "/api/v1/dojo/mentor-dashboard") {
    const auth = await authenticateRequest(req);
    const dashboard = await getMentorDashboard({
      mentorUserId: auth.user.id,
      limit: url.searchParams.get("limit") || 100
    });
    return sendJson(res, 200, { ok: true, dashboard });
  }

  if (req.method === "GET" && pathname === "/api/v1/dojo/mentors/dashboard") {
    const auth = await authenticateRequest(req);
    const dashboard = await getMentorDashboard({
      mentorUserId: auth.user.id,
      limit: url.searchParams.get("limit") || 100
    });
    return sendJson(res, 200, { ok: true, dashboard });
  }

  if (req.method === "GET" && pathname === "/api/v1/dojo/tasks") {
    const tasks = await listDojoTasks({
      personalityType: url.searchParams.get("personality_type") || "",
      stage: url.searchParams.get("stage") || "",
      status: url.searchParams.get("status") || "active",
      limit: url.searchParams.get("limit") || 50
    });
    return sendJson(res, 200, { ok: true, tasks });
  }

  if (req.method === "POST" && pathname === "/api/v1/dojo/tasks") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const task = await createDojoTask({
      creatorUserId: auth.user.id,
      title: body.title,
      discipline: body.discipline,
      action: body.action,
      personalityType: body.personality_type || "通用",
      stage: body.stage || "事上磨关",
      targetRole: body.target_role || "all",
      sourceChannel: body.source_channel || body.channel || "后端API"
    });
    return sendJson(res, 200, { ok: true, task });
  }

  if (req.method === "GET" && pathname === "/api/v1/dojo/leaderboard") {
    const leaderboard = await getDojoLeaderboard({
      period: url.searchParams.get("period") || "week",
      limit: url.searchParams.get("limit") || 30
    });
    return sendJson(res, 200, { ok: true, period: url.searchParams.get("period") || "week", leaderboard });
  }

  const userKlineStatsMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/kline-practice\/stats$/);
  if (req.method === "GET" && userKlineStatsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, userKlineStatsMatch[1]);
    const stats = await getUserKlineStats(userKlineStatsMatch[1]);
    return sendJson(res, 200, { ok: true, stats });
  }

  if (req.method === "POST" && pathname === "/api/v1/assessments/start") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const result = await startAssessment({
      userId: auth.user.id,
      nickname: body.nickname || body.user?.displayName || body.user?.nickname || auth.user.nickname || "测试用户",
      testVersion: body.test_version || "45",
      sourceChannel: body.source_channel || body.channel || "未知渠道",
      excludeQuestionIds: body.exclude_question_ids || [],
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const assessmentMatch = pathname.match(/^\/api\/v1\/assessments\/([^/]+)$/);
  if (req.method === "GET" && assessmentMatch) {
    const auth = await authenticateRequest(req);
    const assessment = await getAssessment(assessmentMatch[1]);
    if (!assessment) return sendJson(res, 404, { ok: false, error: "测评会话不存在" });
    assertUserAccess(auth, assessment.user_id);
    return sendJson(res, 200, { ok: true, assessment });
  }

  const submitMatch = pathname.match(/^\/api\/v1\/assessments\/([^/]+)\/submit$/);
  if (req.method === "POST" && submitMatch) {
    const auth = await authenticateRequest(req);
    const assessment = await getAssessment(submitMatch[1]);
    if (!assessment) return sendJson(res, 404, { ok: false, error: "测评会话不存在" });
    assertUserAccess(auth, assessment.user_id);
    const body = await readJson(req);
    const result = await submitAssessment({
      assessmentId: submitMatch[1],
      answers: body.answers
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/integrations/feishu/report") {
    await authenticateRequest(req);
    const body = await readJson(req);
    const result = await syncReportToFeishu({
      payload: body,
      webhookUrl: config.allowClientFeishuWebhook ? body.webhook_url || "" : "",
      dryRun: Boolean(body.dry_run)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-history/catalog") {
    return sendJson(res, 200, { ok: true, ...listHistoricalKlineCatalog() });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-history/instruments") {
    const result = await listHistoricalKlineInstruments({
      marketKey: url.searchParams.get("market") || url.searchParams.get("market_key") || "",
      timeframeKey: url.searchParams.get("timeframe") || url.searchParams.get("timeframe_key") || url.searchParams.get("klt") || "",
      limit: url.searchParams.get("limit") || 50
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-history/rules") {
    const result = getHistoricalKlineRules({
      marketKey: url.searchParams.get("market") || url.searchParams.get("market_key") || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-history/slice") {
    const result = await buildHistoricalKlineSlice({
      marketKey: url.searchParams.get("market") || url.searchParams.get("market_key") || "",
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code") || url.searchParams.get("instrument") || "",
      timeframeKey: url.searchParams.get("timeframe") || url.searchParams.get("timeframe_key") || url.searchParams.get("klt") || "",
      adjustmentMode: url.searchParams.get("adjustment") || url.searchParams.get("adjustment_mode") || url.searchParams.get("fq") || "",
      windowSize: url.searchParams.get("window") || url.searchParams.get("window_size") || "",
      mode: url.searchParams.get("mode") || "step_replay",
      personalityType: url.searchParams.get("personality_type") || "",
      gateKey: url.searchParams.get("gate") || url.searchParams.get("gate_key") || "",
      blind: getBooleanParam(url, "blind", true),
      seed: url.searchParams.get("seed") || "",
      startDate: url.searchParams.get("start_date") || url.searchParams.get("start") || "",
      endDate: url.searchParams.get("end_date") || url.searchParams.get("end") || ""
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-history/reveal") {
    const result = revealHistoricalKlineSlice(url.searchParams.get("token") || "");
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/kline-history/download") {
    assertKlineDownloadAccess(req);
    const body = await readJson(req);
    const result = await downloadHistoricalKline({
      provider: body.provider,
      marketKey: body.market || body.market_key,
      symbol: body.symbol || body.code || body.instrument,
      name: body.name,
      timeframeKey: body.timeframe || body.timeframe_key || body.klt,
      adjustmentMode: body.adjustment || body.adjustment_mode || body.fq,
      startDate: body.start_date || body.start,
      endDate: body.end_date || body.end,
      limit: body.limit,
      incremental: body.incremental !== false,
      dryRun: Boolean(body.dry_run || body.dryRun)
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/kline-practice/submit") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const result = await submitKlinePractice({
      userId: auth.user.id,
      nickname: body.nickname || body.user?.displayName || body.user?.nickname || auth.user.nickname || "体验学员",
      scenarioId: body.scenario_id,
      decision: body.decision,
      score: body.score,
      discipline: body.discipline,
      note: body.note,
      requestNext: Boolean(body.request_next),
      stageId: body.stage_id || body.stage || "daily"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-practice/next") {
    const requestedUserId = url.searchParams.get("user_id") || "";
    if (requestedUserId) {
      const auth = await authenticateRequest(req);
      assertUserAccess(auth, requestedUserId);
    }
    const result = await getNextKlinePractice({
      userId: requestedUserId,
      excludeIds: url.searchParams.getAll("exclude_id"),
      stageId: url.searchParams.get("stage_id") || url.searchParams.get("stage") || "",
      personalityType: url.searchParams.get("personality_type") || "",
      timeframe: url.searchParams.get("timeframe") || url.searchParams.get("klt") || "",
      instrumentKey: url.searchParams.get("instrument_key") || "",
      axisFocus: url.searchParams.get("axis_focus") || "",
      axisSubtitle: url.searchParams.get("axis_subtitle") || "",
      requireReal: ["1", "true", "yes", "real"].includes(String(url.searchParams.get("require_real") || url.searchParams.get("source") || "").toLowerCase())
    });
    return sendJson(res, 200, { ok: true, scenario: result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-practice/levels") {
    const requestedUserId = url.searchParams.get("user_id") || "";
    if (requestedUserId) {
      const auth = await authenticateRequest(req);
      assertUserAccess(auth, requestedUserId);
    }
    const result = await getUserKlineLevel(
      requestedUserId,
      url.searchParams.get("stage_id") || url.searchParams.get("stage") || ""
    );
    return sendJson(res, 200, { ok: true, level: result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-practice/stats") {
    const result = await getKlineBankStats();
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "GET" && pathname === "/api/v1/kline-practice/leaderboard") {
    const result = await getKlineLeaderboard({
      limit: Math.min(Number(url.searchParams.get("limit") || 20), 100),
      period: url.searchParams.get("period") || "week"
    });
    return sendJson(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && pathname === "/api/v1/zhixing-replay/start") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const session = await startZhixingReplaySession({
      userId: auth.user.id,
      nickname: body.nickname || body.user?.displayName || body.user?.nickname || auth.user.nickname || "知行同修",
      stageId: body.stage_id || body.stage || "daily",
      personalityType: body.personality_type || "",
      timeframe: body.timeframe || body.klt || "101",
      dataSource: body.data_source || "auto",
      plan: body.plan || {},
      emotion: body.emotion || {}
    });
    return sendJson(res, 200, { ok: true, session });
  }

  const zhixingResultsMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/zhixing-replay\/results$/);
  if (req.method === "GET" && zhixingResultsMatch) {
    const auth = await authenticateRequest(req);
    assertUserAccess(auth, zhixingResultsMatch[1]);
    const results = await listZhixingReplayResults(zhixingResultsMatch[1], {
      limit: Math.min(Number(url.searchParams.get("limit") || 20), 100)
    });
    return sendJson(res, 200, { ok: true, results });
  }

  const zhixingSessionMatch = pathname.match(/^\/api\/v1\/zhixing-replay\/([^/]+)$/);
  if (req.method === "GET" && zhixingSessionMatch) {
    const auth = await authenticateRequest(req);
    const session = await getZhixingReplaySession(zhixingSessionMatch[1], auth.user.id);
    return sendJson(res, 200, { ok: true, session });
  }

  const zhixingDecisionMatch = pathname.match(/^\/api\/v1\/zhixing-replay\/([^/]+)\/decision$/);
  if (req.method === "POST" && zhixingDecisionMatch) {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const session = await submitZhixingReplayDecision({
      sessionId: zhixingDecisionMatch[1],
      userId: auth.user.id,
      action: body.action || body.decision,
      positionPct: body.position_pct,
      reason: body.reason || body.note || "",
      emotion: body.emotion || ""
    });
    return sendJson(res, 200, { ok: true, session });
  }

  const zhixingNextMatch = pathname.match(/^\/api\/v1\/zhixing-replay\/([^/]+)\/next$/);
  if (req.method === "POST" && zhixingNextMatch) {
    const auth = await authenticateRequest(req);
    const session = await advanceZhixingReplaySession(zhixingNextMatch[1], auth.user.id);
    return sendJson(res, 200, { ok: true, session });
  }

  const zhixingFinishMatch = pathname.match(/^\/api\/v1\/zhixing-replay\/([^/]+)\/finish$/);
  if (req.method === "POST" && zhixingFinishMatch) {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const session = await finishZhixingReplaySession(zhixingFinishMatch[1], auth.user.id, {
      reveal: Boolean(body.reveal)
    });
    return sendJson(res, 200, { ok: true, session });
  }

  if (req.method === "GET" && pathname === "/api/v1/forum/posts") {
    const posts = await listForumPosts({
      category: url.searchParams.get("category") || "",
      q: url.searchParams.get("q") || "",
      limit: url.searchParams.get("limit") || 30
    });
    return sendJson(res, 200, { ok: true, categories: forumCategories, posts });
  }

  if (req.method === "POST" && pathname === "/api/v1/forum/posts") {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const post = await createForumPost({
      userId: auth.user.id,
      nickname: body.nickname || auth.user.nickname || "知行同修",
      category: body.category,
      title: body.title,
      content: body.content,
      tags: body.tags,
      sourceChannel: body.source_channel || body.channel || "网页MVP"
    });
    return sendJson(res, 200, { ok: true, post });
  }

  const forumPostMatch = pathname.match(/^\/api\/v1\/forum\/posts\/([^/]+)$/);
  if (req.method === "GET" && forumPostMatch) {
    const result = await getForumPost(forumPostMatch[1]);
    if (!result) return sendJson(res, 404, { ok: false, error: "帖子不存在" });
    return sendJson(res, 200, { ok: true, ...result });
  }

  const forumCommentMatch = pathname.match(/^\/api\/v1\/forum\/posts\/([^/]+)\/comments$/);
  if (req.method === "POST" && forumCommentMatch) {
    const auth = await authenticateRequest(req);
    const body = await readJson(req);
    const comment = await createForumComment({
      postId: forumCommentMatch[1],
      userId: auth.user.id,
      nickname: body.nickname || auth.user.nickname || "知行同修",
      content: body.content
    });
    return sendJson(res, 200, { ok: true, comment });
  }

  if ((req.method === "GET" || req.method === "HEAD") && config.serveWeb && !pathname.startsWith("/api/")) {
    const served = await serveStatic(req, res, {
      rootDir: config.webDir,
      pathname
    });
    if (served) return;
  }

  return notFound(res);
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

function sendWecomRouteError(res, error) {
  return sendJson(res, error.statusCode || 400, {
    ok: false,
    code: error.code || "WECOM_CALLBACK_ERROR",
    message: error.message || "企业微信回调处理失败"
  });
}

function getPublicOrigin(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

async function readLimitedJson(req, limitBytes) {
  const raw = (await readRawBody(req, limitBytes)).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("请求体不是合法 JSON");
    error.statusCode = 400;
    throw error;
  }
}

function getReferrerHost(referrer = "") {
  try {
    return new URL(String(referrer || "")).hostname.slice(0, 120);
  } catch {
    return "";
  }
}

function buildSuccessUrl(req, order, providedSuccessUrl = "") {
  const base = String(providedSuccessUrl || process.env.ALIPAY_RETURN_URL || `${getPublicOrigin(req)}/hd/ymty/success.html`).split("?")[0];
  const url = new URL(base, getPublicOrigin(req));
  url.searchParams.set("order_id", order.order_id);
  url.searchParams.set("token", order.order_token);
  return url.toString();
}

function buildWechatOAuthStartUrl(req, returnUrl = "") {
  const url = new URL("/api/wechat/oauth/start", getPublicOrigin(req));
  if (returnUrl) url.searchParams.set("return_url", returnUrl);
  return `${url.pathname}${url.search}`;
}

function buildWechatOAuthAuthorizeUrl(req, returnUrl = "") {
  assertWechatOAuthConfig();
  const callbackUrl = process.env.WECHAT_JSAPI_OAUTH_REDIRECT_URL || `${getPublicOrigin(req)}/api/wechat/oauth/callback`;
  const state = Buffer.from(JSON.stringify({
    returnUrl: normalizeOAuthReturnUrl(req, returnUrl)
  })).toString("base64url");
  const params = new URLSearchParams({
    appid: process.env.WECHAT_SERVICE_APP_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "snsapi_base",
    state,
    connect_redirect: "1"
  });
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
}

async function exchangeWechatOAuthCode({ code = "" } = {}) {
  assertWechatOAuthConfig();
  if (!code) {
    const error = new Error("微信 OAuth code 缺失");
    error.statusCode = 400;
    throw error;
  }
  const params = new URLSearchParams({
    appid: process.env.WECHAT_SERVICE_APP_ID,
    secret: process.env.WECHAT_SERVICE_APP_SECRET,
    code,
    grant_type: "authorization_code"
  });
  const response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data.openid) {
    const error = new Error(data.errmsg || "微信 OAuth 获取 openid 失败");
    error.statusCode = response.status || 502;
    throw error;
  }
  return { openid: data.openid };
}

function parseOAuthState(state = "") {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeOAuthReturnUrl(req, returnUrl = "") {
  const fallback = "/hd/ymty/index.html";
  if (!returnUrl) return fallback;
  try {
    const origin = getPublicOrigin(req);
    const url = new URL(returnUrl, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function assertWechatOAuthConfig() {
  if (process.env.WECHAT_SERVICE_APP_ID && process.env.WECHAT_SERVICE_APP_SECRET) return;
  const error = new Error("微信 OAuth 配置未完成");
  error.statusCode = 503;
  throw error;
}

function getCookie(req, key) {
  const raw = String(req.headers.cookie || "");
  const item = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));
  return item ? decodeURIComponent(item.slice(key.length + 1)) : "";
}

function getBooleanParam(url, key, fallback = false) {
  if (!url.searchParams.has(key)) return fallback;
  const value = String(url.searchParams.get(key) || "").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function assertKlineDownloadAccess(req) {
  const configuredToken = config.klineDownloadToken || "";
  if (!configuredToken && config.nodeEnv !== "production") return;
  const provided = String(req.headers["x-kline-download-token"] || req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (configuredToken && provided === configuredToken) return;
  const error = new Error("K线下载服务未授权");
  error.statusCode = 403;
  throw error;
}

async function assertYmtyAdminAccess(req) {
  return authenticateYmtyAdmin(req);
}

function maskPhone(phone) {
  return `${String(phone).slice(0, 3)}****${String(phone).slice(-4)}`;
}

function sendWechatCallbackHtml(res, { user, accessToken, expiresAt, redirectPath }) {
  const safeUser = {
    id: user.id,
    serverId: user.id,
    displayName: user.nickname || "微信学员",
    method: user.login_method || "wechat",
    contact: user.contact || "",
    wechatBound: true,
    personalInviteCode: user.personal_invite_code,
    tokenExpiresAt: expiresAt,
    serverCreatedAt: user.created_at
  };
  const body = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>微信登录成功</title>
</head>
<body>
  <p>微信登录成功，正在进入测评系统...</p>
  <script>
    localStorage.setItem("tradingPersonality.authUser", ${JSON.stringify(JSON.stringify(safeUser))});
    sessionStorage.setItem("tradingPersonality.accessToken", ${JSON.stringify(accessToken)});
    location.replace(${JSON.stringify(redirectPath || "/")});
  </script>
</body>
</html>`;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}
