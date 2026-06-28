export type TrainingPackDifficulty = "初级" | "中级" | "高级" | string;

export type TrainingPack = {
  id: string;
  title: string;
  errorType: string;
  error_type: string;
  sceneTags: string[];
  scene_tags: string[];
  trainingGoal: string;
  training_goal: string;
  expectedAction: string;
  expected_action: string;
  defaultPrompt: string;
  default_prompt: string;
  trainingPrescription: string;
  training_prescription: string;
  difficulty: TrainingPackDifficulty;
  enabled: boolean;
  sortOrder: number;
  sort_order: number;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
};

export type CreateTrainingPackInput = {
  id?: string;
  title: string;
  errorType?: string;
  error_type?: string;
  sceneTags?: string[];
  scene_tags?: string[];
  trainingGoal?: string;
  training_goal?: string;
  expectedAction?: string;
  expected_action?: string;
  defaultPrompt?: string;
  default_prompt?: string;
  trainingPrescription?: string;
  training_prescription?: string;
  difficulty?: TrainingPackDifficulty;
  enabled?: boolean;
  sortOrder?: number;
  sort_order?: number;
};

export type UpdateTrainingPackInput = Partial<CreateTrainingPackInput> & {
  title?: string;
};

export type TrainingPackResponse = {
  ok: boolean;
  trainingPack: TrainingPack;
  training_pack: TrainingPack;
};

export type TrainingPackListResponse = {
  ok: boolean;
  trainingPacks: TrainingPack[];
  training_packs: TrainingPack[];
  count: number;
  includeDisabled: boolean;
  include_disabled: boolean;
};
