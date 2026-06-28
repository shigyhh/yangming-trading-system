import { readJson, sendJson } from "../lib/http.js";
import { sampleKlineTraining } from "../services/klineSampling.js";

export async function handleKlineSamplingRoute(req, res, { pathname }) {
  if (req.method !== "POST" || pathname !== "/api/v1/kline-training/sample") return false;

  const body = await readJson(req);
  const samplingResult = await sampleKlineTraining(body);
  sendJson(res, 200, {
    ok: true,
    sampling_result: samplingResult,
    samplingResult,
    ...samplingResult,
  });
  return true;
}
