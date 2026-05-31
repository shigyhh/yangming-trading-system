CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(80),
  avatar_url TEXT,
  phone VARCHAR(32),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  wechat_bound BOOLEAN NOT NULL DEFAULT false,
  personal_invite_code VARCHAR(80) UNIQUE,
  referred_by_invite_code VARCHAR(80),
  source_channel VARCHAR(80),
  source_scene VARCHAR(120),
  invite_code VARCHAR(80),
  assistant_status VARCHAR(40) NOT NULL DEFAULT 'unknown',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_personal_invite_code ON users(personal_invite_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_invite_code ON users(referred_by_invite_code);
CREATE INDEX IF NOT EXISTS idx_users_source_channel ON users(source_channel);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(40) NOT NULL,
  provider_user_id VARCHAR(160) NOT NULL,
  union_id VARCHAR(160),
  raw_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  access_token_hash VARCHAR(160) NOT NULL,
  login_method VARCHAR(40),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS sms_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(160) NOT NULL,
  purpose VARCHAR(40) NOT NULL DEFAULT 'login',
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_created_at ON sms_codes(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120),
  channel VARCHAR(80),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code VARCHAR(40) NOT NULL UNIQUE,
  personality_type VARCHAR(40) NOT NULL,
  nature VARCHAR(40),
  sub_dimension VARCHAR(80) NOT NULL,
  scene_tag VARCHAR(160),
  question_text TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1,
  core_level VARCHAR(40),
  report_tag VARCHAR(120),
  training_ability VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  version VARCHAR(40) NOT NULL DEFAULT '3600_v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(personality_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_sub_dimension ON question_bank(sub_dimension);
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank(status);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  test_version VARCHAR(20) NOT NULL,
  question_count INTEGER NOT NULL,
  source_channel VARCHAR(80),
  status VARCHAR(30) NOT NULL DEFAULT 'started',
  selected_question_codes TEXT[] NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_created_at ON assessment_sessions(created_at);

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessment_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  question_code VARCHAR(40) NOT NULL,
  personality_type VARCHAR(40) NOT NULL,
  sub_dimension VARCHAR(80) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  weight NUMERIC(5,2) NOT NULL DEFAULT 1,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, question_code)
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_assessment_id ON assessment_answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_user_id ON assessment_answers(user_id);

CREATE TABLE IF NOT EXISTS score_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES assessment_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  main_type VARCHAR(40) NOT NULL,
  sub_type VARCHAR(40),
  risk_level VARCHAR(40) NOT NULL,
  recommended_camp VARCHAR(80),
  training_ability VARCHAR(120),
  easiest_loss_scene TEXT,
  current_trading_risk TEXT,
  yangming_reminder TEXT,
  score_percentages JSONB NOT NULL,
  raw_scores JSONB NOT NULL,
  top_sub_dimensions JSONB NOT NULL,
  actions_7_days JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_results_user_id ON score_results(user_id);
CREATE INDEX IF NOT EXISTS idx_score_results_main_type ON score_results(main_type);
CREATE INDEX IF NOT EXISTS idx_score_results_risk_level ON score_results(risk_level);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no VARCHAR(60) NOT NULL UNIQUE,
  assessment_id UUID NOT NULL UNIQUE REFERENCES assessment_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  score_result_id UUID REFERENCES score_results(id),
  title VARCHAR(160) NOT NULL,
  content_md TEXT NOT NULL,
  content_json JSONB,
  ai_provider VARCHAR(60),
  ai_model VARCHAR(80),
  prompt_version VARCHAR(80),
  public_token VARCHAR(120) UNIQUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  copied_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date_key DATE NOT NULL,
  source_channel VARCHAR(80),
  note TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date_key ON daily_checkins(date_key);

CREATE TABLE IF NOT EXISTS kline_practice_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  prompt TEXT NOT NULL,
  scene_type VARCHAR(80),
  personality_type VARCHAR(40),
  focus VARCHAR(80),
  candles JSONB NOT NULL,
  options JSONB NOT NULL,
  right_decision VARCHAR(80),
  wrong_decision VARCHAR(80),
  yangming_lesson TEXT,
  difficulty VARCHAR(40),
  version VARCHAR(60) NOT NULL DEFAULT 'kline_1500_v1',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kline_practice_bank_type ON kline_practice_bank(personality_type);
CREATE INDEX IF NOT EXISTS idx_kline_practice_bank_scene ON kline_practice_bank(scene_type);

CREATE TABLE IF NOT EXISTS kline_practice_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  nickname VARCHAR(80),
  scenario_id VARCHAR(80) NOT NULL,
  decision VARCHAR(80) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  discipline INTEGER NOT NULL CHECK (discipline BETWEEN 0 AND 100),
  practice_points INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kline_practice_user_id ON kline_practice_results(user_id);
CREATE INDEX IF NOT EXISTS idx_kline_practice_points ON kline_practice_results(practice_points DESC);
CREATE INDEX IF NOT EXISTS idx_kline_practice_created_at ON kline_practice_results(created_at DESC);

CREATE TABLE IF NOT EXISTS lead_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  assessment_id UUID REFERENCES assessment_sessions(id),
  report_id UUID REFERENCES reports(id),
  target VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_sync_logs_user_id ON lead_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_sync_logs_status ON lead_sync_logs(status);

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_name VARCHAR(80) NOT NULL,
  event_properties JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_name ON event_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);

CREATE TABLE IF NOT EXISTS dojo_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(30) NOT NULL CHECK (role IN ('coach', 'assistant')),
  mentor_code VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(80),
  bio TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  source_channel VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_dojo_mentors_user_id ON dojo_mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_dojo_mentors_role ON dojo_mentors(role);
CREATE INDEX IF NOT EXISTS idx_dojo_mentors_mentor_code ON dojo_mentors(mentor_code);

CREATE TABLE IF NOT EXISTS dojo_mentor_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mentor_id UUID NOT NULL REFERENCES dojo_mentors(id),
  mentor_user_id UUID NOT NULL REFERENCES users(id),
  mentor_code VARCHAR(40) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('coach', 'assistant')),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  source_channel VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_bindings_user_id ON dojo_mentor_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_dojo_bindings_mentor_user_id ON dojo_mentor_bindings(mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_dojo_bindings_status ON dojo_mentor_bindings(status);

CREATE TABLE IF NOT EXISTS dojo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES users(id),
  title VARCHAR(120) NOT NULL,
  discipline TEXT,
  action TEXT NOT NULL,
  personality_type VARCHAR(40) NOT NULL DEFAULT '通用',
  stage VARCHAR(40) NOT NULL DEFAULT '事上磨关',
  target_role VARCHAR(30) NOT NULL DEFAULT 'all',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  source_channel VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_tasks_personality_type ON dojo_tasks(personality_type);
CREATE INDEX IF NOT EXISTS idx_dojo_tasks_stage ON dojo_tasks(stage);
CREATE INDEX IF NOT EXISTS idx_dojo_tasks_status ON dojo_tasks(status);

CREATE TABLE IF NOT EXISTS dojo_task_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  task_id UUID NOT NULL REFERENCES dojo_tasks(id),
  date_key DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'accepted',
  note TEXT,
  source_channel VARCHAR(80),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_dojo_task_records_user_id ON dojo_task_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dojo_task_records_date_key ON dojo_task_records(date_key);
CREATE INDEX IF NOT EXISTS idx_dojo_task_records_status ON dojo_task_records(status);

CREATE TABLE IF NOT EXISTS dojo_mind_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date_key DATE NOT NULL,
  input TEXT NOT NULL,
  reply JSONB,
  context JSONB,
  source_channel VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_mind_records_user_id ON dojo_mind_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dojo_mind_records_date_key ON dojo_mind_records(date_key);
