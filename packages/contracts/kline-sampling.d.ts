export type SamplingSource =
  | "segment"
  | "fallback_catalog_slice"
  | "fallback_instruments_slice"
  | "no_match"
  | string;

export type SamplingRequest = {
  userId?: string;
  user_id?: string;
  sourceType?: string;
  source_type?: string;
  errorType?: string;
  error_type?: string;
  sceneTags?: string[];
  scene_tags?: string[];
  trainingPackId?: string;
  training_pack_id?: string;
  difficulty?: string;
  period?: string;
  excludeSegmentIds?: string[];
  exclude_segment_ids?: string[];
  limit?: number;
};

export type SamplingResult = {
  segmentId: string;
  segment_id: string;
  trainingPackId: string;
  training_pack_id: string;
  errorType: string;
  error_type: string;
  sceneTags: string[];
  scene_tags: string[];
  symbol: string;
  name: string;
  period: string;
  startDate: string;
  start_date: string;
  endDate: string;
  end_date: string;
  bars: unknown[];
  fallbackUsed: boolean;
  fallback_used: boolean;
  fallbackReason: string;
  fallback_reason: string;
  source: SamplingSource;
};

export type KlineTrainingSampleResponse = SamplingResult & {
  ok: boolean;
  samplingResult: SamplingResult;
  sampling_result: SamplingResult;
};
