import { readJson, sendJson, notFound } from "../lib/http.js";
import { createTrainingPack, listTrainingPacks, setTrainingPackEnabled, updateTrainingPack } from "../services/trainingPacks.js";

export async function handleTrainingPackRoute(req, res, { url, pathname }) {
  if (req.method === "GET" && pathname === "/api/v1/training-packs") {
    const includeDisabled = parseBooleanQuery(url.searchParams.get("include_disabled") || url.searchParams.get("includeDisabled"));
    const trainingPacks = await listTrainingPacks({ includeDisabled });
    sendJson(res, 200, {
      ok: true,
      training_packs: trainingPacks,
      trainingPacks,
      count: trainingPacks.length,
      include_disabled: includeDisabled,
      includeDisabled
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/v1/training-packs") {
    const body = await readJson(req);
    const trainingPack = await createTrainingPack(body);
    sendJson(res, 201, {
      ok: true,
      training_pack: trainingPack,
      trainingPack
    });
    return true;
  }

  const trainingPackEnabledMatch = pathname.match(/^\/api\/v1\/training-packs\/([^/]+)\/enabled$/);
  if (req.method === "PATCH" && trainingPackEnabledMatch) {
    const body = await readJson(req);
    const trainingPack = await setTrainingPackEnabled(decodeURIComponent(trainingPackEnabledMatch[1]), body.enabled);
    if (!trainingPack) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      training_pack: trainingPack,
      trainingPack
    });
    return true;
  }

  const trainingPackMatch = pathname.match(/^\/api\/v1\/training-packs\/([^/]+)$/);
  if (req.method === "PATCH" && trainingPackMatch) {
    const body = await readJson(req);
    const trainingPack = await updateTrainingPack(decodeURIComponent(trainingPackMatch[1]), body);
    if (!trainingPack) {
      notFound(res);
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      training_pack: trainingPack,
      trainingPack
    });
    return true;
  }

  return false;
}

function parseBooleanQuery(value) {
  return value === "true" || value === "1";
}
