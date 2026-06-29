import { readJson, sendJson, notFound } from "../lib/http.js";
import {
  createExecutionPlanBinding,
  createInterventionEventBinding,
  createInterventionRuleBinding,
  createTrainingBookmarkBinding,
  deleteExecutionPlanBinding,
  deleteInterventionEventBinding,
  deleteInterventionRuleBinding,
  deleteTrainingBookmarkBinding,
  getDashboardSummaryBinding,
  getMirrorArchiveBinding,
  getMirrorArchiveItemBinding,
  getWeeklyMirrorSummaryBinding,
  listExecutionPlanBindings,
  listInterventionEventBindings,
  listInterventionRuleBindings,
  listTrainingBookmarkBindings,
  updateExecutionPlanBinding,
  updateInterventionEventBinding,
  updateInterventionRuleBinding,
  updateTrainingBookmarkBinding
} from "../services/dataBinding.js";

export async function handleDataBindingRoute(req, res, { url, pathname }) {
  const dashboardSummaryMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/dashboard-summary$/);
  if (req.method === "GET" && dashboardSummaryMatch) {
    const result = await getDashboardSummaryBinding(decodeURIComponent(dashboardSummaryMatch[1]), {
      range: url.searchParams.get("range") || "30d",
      dateFrom: url.searchParams.get("dateFrom") || url.searchParams.get("date_from") || "",
      dateTo: url.searchParams.get("dateTo") || url.searchParams.get("date_to") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const dashboardWeeklyMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/dashboard-weekly$/);
  if (req.method === "GET" && dashboardWeeklyMatch) {
    const result = await getWeeklyMirrorSummaryBinding(decodeURIComponent(dashboardWeeklyMatch[1]), {
      week: url.searchParams.get("week") || "current",
      weekStart: url.searchParams.get("weekStart") || url.searchParams.get("week_start") || "",
      weekEnd: url.searchParams.get("weekEnd") || url.searchParams.get("week_end") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const mirrorArchiveMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/mirror-archive$/);
  if (req.method === "GET" && mirrorArchiveMatch) {
    const result = await getMirrorArchiveBinding(decodeURIComponent(mirrorArchiveMatch[1]));
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const mirrorArchiveItemMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/mirror-archive\/([^/]+)$/);
  if (req.method === "GET" && mirrorArchiveItemMatch) {
    const result = await getMirrorArchiveItemBinding(
      decodeURIComponent(mirrorArchiveItemMatch[1]),
      decodeURIComponent(mirrorArchiveItemMatch[2])
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const trainingBookmarksMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/training-bookmarks$/);
  if (req.method === "GET" && trainingBookmarksMatch) {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const result = await listTrainingBookmarkBindings(decodeURIComponent(trainingBookmarksMatch[1]), {
      includeDisabled,
      bookmarkType: url.searchParams.get("bookmarkType") || url.searchParams.get("bookmark_type") || "",
      sourceType: url.searchParams.get("sourceType") || url.searchParams.get("source_type") || "",
      errorType: url.searchParams.get("errorType") || url.searchParams.get("error_type") || "",
      segmentId: url.searchParams.get("segmentId") || url.searchParams.get("segment_id") || "",
      trainingPackId: url.searchParams.get("trainingPackId") || url.searchParams.get("training_pack_id") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "POST" && trainingBookmarksMatch) {
    const body = await readJson(req);
    const payload = body.training_bookmark || body.trainingBookmark || body.bookmark || body;
    const result = await createTrainingBookmarkBinding(decodeURIComponent(trainingBookmarksMatch[1]), {
      ...payload,
      user: {
        ...(body.user || payload.user || {}),
        userId: decodeURIComponent(trainingBookmarksMatch[1])
      }
    });
    sendJson(res, 201, {
      ok: true,
      ...result
    });
    return true;
  }

  const trainingBookmarkMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/training-bookmarks\/([^/]+)$/);
  if (req.method === "PATCH" && trainingBookmarkMatch) {
    const body = await readJson(req);
    const result = await updateTrainingBookmarkBinding(
      decodeURIComponent(trainingBookmarkMatch[1]),
      decodeURIComponent(trainingBookmarkMatch[2]),
      body.training_bookmark || body.trainingBookmark || body.bookmark || body
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "DELETE" && trainingBookmarkMatch) {
    const result = await deleteTrainingBookmarkBinding(
      decodeURIComponent(trainingBookmarkMatch[1]),
      decodeURIComponent(trainingBookmarkMatch[2])
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const interventionEventsMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/intervention-events$/);
  if (req.method === "GET" && interventionEventsMatch) {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const result = await listInterventionEventBindings(decodeURIComponent(interventionEventsMatch[1]), {
      includeDisabled,
      triggerType: url.searchParams.get("triggerType") || url.searchParams.get("trigger_type") || "",
      sourceType: url.searchParams.get("sourceType") || url.searchParams.get("source_type") || "",
      errorType: url.searchParams.get("errorType") || url.searchParams.get("error_type") || "",
      sessionId: url.searchParams.get("sessionId") || url.searchParams.get("session_id") || "",
      reviewId: url.searchParams.get("reviewId") || url.searchParams.get("review_id") || "",
      planId: url.searchParams.get("planId") || url.searchParams.get("plan_id") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "POST" && interventionEventsMatch) {
    const body = await readJson(req);
    const payload = body.intervention_event || body.interventionEvent || body.event || body;
    const result = await createInterventionEventBinding(decodeURIComponent(interventionEventsMatch[1]), {
      ...payload,
      user: {
        ...(body.user || payload.user || {}),
        userId: decodeURIComponent(interventionEventsMatch[1])
      }
    });
    sendJson(res, 201, {
      ok: true,
      ...result
    });
    return true;
  }

  const interventionEventMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/intervention-events\/([^/]+)$/);
  if (req.method === "PATCH" && interventionEventMatch) {
    const body = await readJson(req);
    const result = await updateInterventionEventBinding(
      decodeURIComponent(interventionEventMatch[1]),
      decodeURIComponent(interventionEventMatch[2]),
      body.intervention_event || body.interventionEvent || body.event || body
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "DELETE" && interventionEventMatch) {
    const result = await deleteInterventionEventBinding(
      decodeURIComponent(interventionEventMatch[1]),
      decodeURIComponent(interventionEventMatch[2])
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const interventionRulesMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/intervention-rules$/);
  if (req.method === "GET" && interventionRulesMatch) {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const result = await listInterventionRuleBindings(decodeURIComponent(interventionRulesMatch[1]), {
      includeDisabled,
      triggerType: url.searchParams.get("triggerType") || url.searchParams.get("trigger_type") || "",
      errorType: url.searchParams.get("errorType") || url.searchParams.get("error_type") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "POST" && interventionRulesMatch) {
    const body = await readJson(req);
    const payload = body.intervention_rule || body.interventionRule || body.rule || body;
    const result = await createInterventionRuleBinding(decodeURIComponent(interventionRulesMatch[1]), {
      ...payload,
      user: {
        ...(body.user || payload.user || {}),
        userId: decodeURIComponent(interventionRulesMatch[1])
      }
    });
    sendJson(res, 201, {
      ok: true,
      ...result
    });
    return true;
  }

  const interventionRuleMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/intervention-rules\/([^/]+)$/);
  if (req.method === "PATCH" && interventionRuleMatch) {
    const body = await readJson(req);
    const result = await updateInterventionRuleBinding(
      decodeURIComponent(interventionRuleMatch[1]),
      decodeURIComponent(interventionRuleMatch[2]),
      body.intervention_rule || body.interventionRule || body.rule || body
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "DELETE" && interventionRuleMatch) {
    const result = await deleteInterventionRuleBinding(
      decodeURIComponent(interventionRuleMatch[1]),
      decodeURIComponent(interventionRuleMatch[2])
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  const executionPlansMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/execution-plans$/);
  if (req.method === "GET" && executionPlansMatch) {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const result = await listExecutionPlanBindings(decodeURIComponent(executionPlansMatch[1]), {
      includeDisabled,
      errorType: url.searchParams.get("errorType") || url.searchParams.get("error_type") || ""
    });
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "POST" && executionPlansMatch) {
    const body = await readJson(req);
    const payload = body.execution_plan || body.executionPlan || body.plan || body;
    const result = await createExecutionPlanBinding(decodeURIComponent(executionPlansMatch[1]), {
      ...payload,
      user: {
        ...(body.user || payload.user || {}),
        userId: decodeURIComponent(executionPlansMatch[1])
      }
    });
    sendJson(res, 201, {
      ok: true,
      ...result
    });
    return true;
  }

  const executionPlanMatch = pathname.match(/^\/api\/v1\/data-binding\/users\/([^/]+)\/execution-plans\/([^/]+)$/);
  if (req.method === "PATCH" && executionPlanMatch) {
    const body = await readJson(req);
    const result = await updateExecutionPlanBinding(
      decodeURIComponent(executionPlanMatch[1]),
      decodeURIComponent(executionPlanMatch[2]),
      body.execution_plan || body.executionPlan || body.plan || body
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  if (req.method === "DELETE" && executionPlanMatch) {
    const result = await deleteExecutionPlanBinding(
      decodeURIComponent(executionPlanMatch[1]),
      decodeURIComponent(executionPlanMatch[2])
    );
    if (!result) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
    return true;
  }

  return false;
}

function parseBooleanQuery(value) {
  return value === "true" || value === "1";
}
