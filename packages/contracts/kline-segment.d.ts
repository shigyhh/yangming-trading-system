export type KlineSegmentSceneTag =
  | "放量拉升"
  | "假突破"
  | "冲高回落"
  | "破位下跌"
  | "弱反弹"
  | "连续阴跌"
  | "下跌中继"
  | "反抽诱多"
  | "洗盘后走强"
  | "趋势中继"
  | "横盘噪音"
  | "突然异动"
  | "普涨行情"
  | "快速反弹"
  | string;

export type KlineSegmentErrorType =
  | "追高冲动"
  | "扛单被套"
  | "卖飞懊悔"
  | "补仓冲动"
  | "计划外交易"
  | "盈利拿不住"
  | "空仓焦虑"
  | "急于翻本"
  | string;

export type KlineSegmentDifficulty = "初级" | "中级" | "高级" | string;

export type KlineSegment = {
  id: string;
  symbol: string;
  name: string;
  period: string;
  startDate: string;
  start_date: string;
  endDate: string;
  end_date: string;
  sceneTags: KlineSegmentSceneTag[];
  scene_tags: KlineSegmentSceneTag[];
  errorTypes: KlineSegmentErrorType[];
  error_types: KlineSegmentErrorType[];
  trainingPackIds: string[];
  training_pack_ids: string[];
  difficulty: KlineSegmentDifficulty;
  note: string;
  enabled: boolean;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
};

export type CreateKlineSegmentInput = {
  id?: string;
  symbol: string;
  name?: string;
  period: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  sceneTags?: KlineSegmentSceneTag[];
  scene_tags?: KlineSegmentSceneTag[];
  errorTypes?: KlineSegmentErrorType[];
  error_types?: KlineSegmentErrorType[];
  trainingPackIds?: string[];
  training_pack_ids?: string[];
  difficulty?: KlineSegmentDifficulty;
  note?: string;
  enabled?: boolean;
};

export type UpdateKlineSegmentInput = Partial<CreateKlineSegmentInput> & {
  symbol?: string;
  period?: string;
};

export type KlineSegmentListFilters = {
  includeDisabled?: boolean;
  include_disabled?: boolean;
  errorType?: KlineSegmentErrorType;
  error_type?: KlineSegmentErrorType;
  sceneTag?: KlineSegmentSceneTag;
  scene_tag?: KlineSegmentSceneTag;
  trainingPackId?: string;
  training_pack_id?: string;
  symbol?: string;
  period?: string;
};

export type KlineSegmentResponse = {
  ok: boolean;
  klineSegment: KlineSegment;
  kline_segment: KlineSegment;
};

export type KlineSegmentListResponse = {
  ok: boolean;
  klineSegments: KlineSegment[];
  kline_segments: KlineSegment[];
  count: number;
  includeDisabled: boolean;
  include_disabled: boolean;
};
