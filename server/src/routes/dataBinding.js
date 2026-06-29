import { readJson, sendJson, notFound } from "../lib/http.js";
import {
  createTrainingBookmarkBinding,
  deleteTrainingBookmarkBinding,
  getDashboardSummaryBinding,
  getMirrorArchiveBinding,
  getMirrorArchiveItemBinding,
  getWeeklyMirrorSummaryBinding,
  listTrainingBookmarkBindings,
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

  return false;
}

function parseBooleanQuery(value) {
  return value === "true" || value === "1";
}
