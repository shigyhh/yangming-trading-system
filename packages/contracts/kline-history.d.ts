export type KlineHistoryMarketKey = "cn_equity" | "hk_equity" | "us_equity" | "futures" | "crypto"

export type KlineHistoryTimeframeKey = "5m" | "10m" | "30m" | "60m" | "1d" | "1w" | "1mo" | "1y"

export type KlineHistoryAdjustmentModeKey = "none" | "forward" | "backward" | "dynamic_forward"

export type KlineHistoryTrainingModeKey = "step_replay" | "firecracker" | "boundary" | "personality" | "gate"

export type KlineHistoryProviderKey = "tushare" | "futu" | "okx"

export type KlineHistoryMarket = {
  key: KlineHistoryMarketKey
  label: string
  default_timeframe: KlineHistoryTimeframeKey
  timeframes: KlineHistoryTimeframeKey[]
}

export type KlineHistoryTimeframe = {
  key: KlineHistoryTimeframeKey
  label: string
  granularity: "intraday" | "daily" | "weekly" | "monthly" | "yearly"
  minutes?: number
}

export type KlineHistoryRules = {
  settlement: "T+1" | "T+0" | "7x24"
  lotSize: number | string
  session: string
  boundaryNotes: string[]
  dataUse: string
}

export type KlineHistoryAdjustmentMode = {
  key: KlineHistoryAdjustmentModeKey
  label: string
  description: string
  applied?: boolean
}

export type KlineHistoryTrainingMode = {
  key: KlineHistoryTrainingModeKey
  label: string
  prompt: string
}

export type KlineHistoryProvider = {
  key: KlineHistoryProviderKey
  label: string
  markets: KlineHistoryMarketKey[]
  timeframes: KlineHistoryTimeframeKey[]
  requires: string[]
  note: string
}

export type KlineHistoryGatePractice = {
  key: string
  label: string
  focus: string
  action: string
}

export type KlineHistoryPersonalityPractice = {
  label: string
  focus: string
  action: string
}

export type KlineHistoryInstrument = {
  symbol: string
  name: string
  secid?: string
  instrument_key: string
  market_key?: KlineHistoryMarketKey
  timeframe_key?: KlineHistoryTimeframeKey
  data_ready?: boolean
  source?: string
  candle_count?: number
}

export type KlineHistoryPublicCandle = {
  index: number
  time: number | string
  label: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
  pct_chg: number | null
}

export type KlineHistoryTrainingBrief = {
  mode: KlineHistoryTrainingMode
  personality: KlineHistoryPersonalityPractice
  gate: KlineHistoryGatePractice
  title: string
  first_question: string
  boundary_question: string
  boundary_action: string
  review_prompt: string
}

export type KlineHistoryReveal = {
  version: "kline_slice_v1"
  slice_id: string
  market_key: KlineHistoryMarketKey
  market_label: string
  symbol: string
  name: string
  timeframe_key: KlineHistoryTimeframeKey
  timeframe_label: string
  adjustment_mode: KlineHistoryAdjustmentModeKey
  data_start: string
  data_end: string
  source: string
  generated_at: string
}

export type KlineHistorySlice = {
  id: string
  blind: boolean
  market: KlineHistoryMarket
  timeframe: KlineHistoryTimeframe
  adjustment: KlineHistoryAdjustmentMode
  instrument:
    | { label: "历史片段"; masked: true }
    | { symbol: string; name: string; label: string; masked: false }
  price_mode: "relative_blind" | "raw"
  candles: KlineHistoryPublicCandle[]
  visible_count: number
  data_range:
    | { masked: true; label: string }
    | { masked: false; start: string; end: string }
  source: string
  rules: KlineHistoryRules
  training: KlineHistoryTrainingBrief
  reveal_token: string
  reveal: KlineHistoryReveal | null
  compliance: string
}

export type KlineHistoryCatalogResponse = {
  ok: true
  markets: Array<KlineHistoryMarket & { rules: KlineHistoryRules }>
  timeframes: KlineHistoryTimeframe[]
  adjustment_modes: KlineHistoryAdjustmentMode[]
  training_modes: KlineHistoryTrainingMode[]
  providers: KlineHistoryProvider[]
  gates: KlineHistoryGatePractice[]
  personality_prescriptions: KlineHistoryPersonalityPractice[]
  storage_contract: {
    root: string
    instrument_file: string
    kline_file: string
    ashare_legacy_file: string
  }
  compliance: string
}

export type KlineHistoryDownloadRequest = {
  provider?: KlineHistoryProviderKey
  market: KlineHistoryMarketKey
  symbol: string
  name?: string
  timeframe: KlineHistoryTimeframeKey
  adjustment?: KlineHistoryAdjustmentModeKey
  start_date?: string
  end_date?: string
  limit?: number
  incremental?: boolean
  dry_run?: boolean
}

export type KlineHistoryDownloadJob = {
  provider: KlineHistoryProviderKey
  source: string
  market_key: KlineHistoryMarketKey
  market_label: string
  symbol: string
  name: string
  timeframe_key: KlineHistoryTimeframeKey
  timeframe_label: string
  adjustment_mode: KlineHistoryAdjustmentModeKey
  candle_count: number
  downloaded_count: number
  added_count: number
  data_start: string
  data_end: string
  file: string
  dry_run: boolean
  updated_at: string
}

export type KlineHistoryDownloadResponse = {
  ok: true
  job: KlineHistoryDownloadJob
  compliance: string
}

export type KlineHistoryInstrumentsResponse = {
  ok: true
  market: KlineHistoryMarket
  timeframe: KlineHistoryTimeframe
  total: number
  instruments: KlineHistoryInstrument[]
  compliance: string
}

export type KlineHistoryRulesResponse = {
  ok: true
  market: KlineHistoryMarket
  rules: KlineHistoryRules
  compliance: string
}

export type KlineHistorySliceResponse = {
  ok: true
  slice: KlineHistorySlice
}

export type KlineHistoryRevealResponse = {
  ok: true
  reveal: KlineHistoryReveal
  compliance: string
}
