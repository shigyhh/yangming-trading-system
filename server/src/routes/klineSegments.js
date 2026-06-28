import { readJson, sendJson, notFound } from "../lib/http.js";
import {
  createKlineSegment,
  getKlineSegment,
  listKlineSegments,
  setKlineSegmentEnabled,
  updateKlineSegment,
} from "../services/klineSegments.js";

export async function handleKlineSegmentRoute(req, res, { url, pathname }) {
  if (req.method === "GET" && pathname === "/api/v1/kline-segments") {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const filters = {
      includeDisabled,
      errorType: url.searchParams.get("errorType") || url.searchParams.get("error_type") || "",
      sceneTag: url.searchParams.get("sceneTag") || url.searchParams.get("scene_tag") || "",
      trainingPackId: url.searchParams.get("trainingPackId") || url.searchParams.get("training_pack_id") || "",
      symbol: url.searchParams.get("symbol") || "",
      period: url.searchParams.get("period") || "",
    };
    const klineSegments = await listKlineSegments(filters);
    sendJson(res, 200, {
      ok: true,
      kline_segments: klineSegments,
      klineSegments,
      count: klineSegments.length,
      include_disabled: includeDisabled,
      includeDisabled,
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/v1/kline-segments") {
    const body = await readJson(req);
    const klineSegment = await createKlineSegment(body);
    sendJson(res, 201, {
      ok: true,
      kline_segment: klineSegment,
      klineSegment,
    });
    return true;
  }

  const enabledMatch = pathname.match(/^\/api\/v1\/kline-segments\/([^/]+)\/enabled$/);
  if (req.method === "PATCH" && enabledMatch) {
    const body = await readJson(req);
    const klineSegment = await setKlineSegmentEnabled(decodeURIComponent(enabledMatch[1]), body.enabled);
    if (!klineSegment) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      kline_segment: klineSegment,
      klineSegment,
    });
    return true;
  }

  const detailMatch = pathname.match(/^\/api\/v1\/kline-segments\/([^/]+)$/);
  if (req.method === "GET" && detailMatch) {
    const klineSegment = await getKlineSegment(decodeURIComponent(detailMatch[1]));
    if (!klineSegment) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      kline_segment: klineSegment,
      klineSegment,
    });
    return true;
  }

  if (req.method === "PATCH" && detailMatch) {
    const body = await readJson(req);
    const klineSegment = await updateKlineSegment(decodeURIComponent(detailMatch[1]), body);
    if (!klineSegment) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      kline_segment: klineSegment,
      klineSegment,
    });
    return true;
  }

  return false;
}

function parseBooleanQuery(value) {
  return value === "true" || value === "1";
}
