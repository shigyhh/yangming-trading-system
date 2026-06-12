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

CREATE TABLE IF NOT EXISTS ymty_product_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(80) NOT NULL UNIQUE,
  course_id VARCHAR(80) NOT NULL,
  course_name VARCHAR(160) NOT NULL,
  organizer VARCHAR(160),
  price_cents INTEGER NOT NULL,
  currency VARCHAR(12) NOT NULL DEFAULT 'CNY',
  training_days INTEGER NOT NULL DEFAULT 7,
  opening_time_text VARCHAR(160),
  lecturer VARCHAR(80),
  compliance_text TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  afterpay_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ymty_product_configs_status ON ymty_product_configs(status);

CREATE TABLE IF NOT EXISTS ymty_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(80) NOT NULL UNIQUE,
  client_order_no VARCHAR(120),
  user_id UUID REFERENCES users(id),
  openid VARCHAR(160),
  unionid VARCHAR(160),
  phone_hash VARCHAR(160),
  phone_mask VARCHAR(32),
  product_id VARCHAR(80) NOT NULL,
  course_id VARCHAR(80) NOT NULL,
  course_name VARCHAR(160) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(12) NOT NULL DEFAULT 'CNY',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_channel VARCHAR(40) NOT NULL DEFAULT 'mock',
  payment_mode VARCHAR(40) NOT NULL DEFAULT 'mock',
  transaction_id VARCHAR(160),
  source_channel VARCHAR(80),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ymty_orders_user_id ON ymty_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ymty_orders_openid ON ymty_orders(openid);
CREATE INDEX IF NOT EXISTS idx_ymty_orders_phone_hash ON ymty_orders(phone_hash);
CREATE INDEX IF NOT EXISTS idx_ymty_orders_status ON ymty_orders(status);
CREATE INDEX IF NOT EXISTS idx_ymty_orders_created_at ON ymty_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS ymty_payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(40) NOT NULL,
  order_no VARCHAR(80),
  transaction_id VARCHAR(160),
  verify_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  handled_status VARCHAR(40) NOT NULL DEFAULT 'received',
  raw_summary JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ymty_payment_notifications_provider ON ymty_payment_notifications(provider);
CREATE INDEX IF NOT EXISTS idx_ymty_payment_notifications_order_no ON ymty_payment_notifications(order_no);
CREATE INDEX IF NOT EXISTS idx_ymty_payment_notifications_received_at ON ymty_payment_notifications(received_at DESC);

CREATE TABLE IF NOT EXISTS ymty_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_no VARCHAR(80) NOT NULL UNIQUE,
  order_no VARCHAR(80) NOT NULL,
  user_id UUID REFERENCES users(id),
  openid VARCHAR(160),
  phone_hash VARCHAR(160),
  phone_mask VARCHAR(32),
  product_id VARCHAR(80) NOT NULL,
  course_id VARCHAR(80) NOT NULL,
  course_name VARCHAR(160) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  training_days INTEGER NOT NULL DEFAULT 7,
  opening_time_text VARCHAR(160),
  lecturer VARCHAR(80),
  miniprogram_path TEXT,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ymty_course_enrollments_order_no ON ymty_course_enrollments(order_no);
CREATE INDEX IF NOT EXISTS idx_ymty_course_enrollments_user_id ON ymty_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_ymty_course_enrollments_openid ON ymty_course_enrollments(openid);
CREATE INDEX IF NOT EXISTS idx_ymty_course_enrollments_phone_hash ON ymty_course_enrollments(phone_hash);

CREATE TABLE IF NOT EXISTS ymty_afterpay_entrances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrance_key VARCHAR(80) NOT NULL UNIQUE,
  product_id VARCHAR(80) NOT NULL,
  entrance_type VARCHAR(40) NOT NULL DEFAULT 'assistant_qr_rotation',
  lead_link TEXT,
  miniprogram_path TEXT,
  live_code_config JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ymty_afterpay_entrances_product_id ON ymty_afterpay_entrances(product_id);
CREATE INDEX IF NOT EXISTS idx_ymty_afterpay_entrances_status ON ymty_afterpay_entrances(status);

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

CREATE TABLE IF NOT EXISTS mirror_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no VARCHAR(60) UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  assessment_id UUID REFERENCES assessment_sessions(id),
  source_report_id UUID REFERENCES reports(id),
  mirror_spectrum JSONB NOT NULL DEFAULT '{}'::jsonb,
  main_mirror VARCHAR(40) NOT NULL,
  sub_mirror VARCHAR(40),
  primary_mirror_score NUMERIC(5,2),
  secondary_mirror_score NUMERIC(5,2),
  thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  verdict TEXT NOT NULL,
  risk_radar JSONB NOT NULL DEFAULT '[]'::jsonb,
  typical_cycle JSONB NOT NULL DEFAULT '{}'::jsonb,
  seven_day_prescription JSONB NOT NULL DEFAULT '[]'::jsonb,
  camp_suggestion VARCHAR(120),
  compliance_note TEXT NOT NULL DEFAULT '本报告用于交易心理觉察与训练，不构成投资建议。',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mirror_reports_user_id ON mirror_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_mirror_reports_assessment_id ON mirror_reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_mirror_reports_main_mirror ON mirror_reports(main_mirror);
CREATE INDEX IF NOT EXISTS idx_mirror_reports_created_at ON mirror_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS trade_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mirror_report_id UUID REFERENCES mirror_reports(id),
  image_url TEXT,
  image_storage_key TEXT,
  image_sha256 VARCHAR(128),
  trade_date DATE,
  symbol_masked VARCHAR(80),
  market_type VARCHAR(40),
  buy_reason TEXT,
  sell_reason TEXT,
  strongest_thought TEXT NOT NULL,
  detected_mirror VARCHAR(40),
  detected_thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  behavior_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  personal_cycle JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_text TEXT,
  ai_summary TEXT,
  compliance_note TEXT NOT NULL DEFAULT '本复盘仅用于交易心理觉察与行为训练，不构成投资建议。',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_reviews_user_id ON trade_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_trade_date ON trade_reviews(trade_date);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_detected_mirror ON trade_reviews(detected_mirror);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_created_at ON trade_reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS personal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mirror VARCHAR(40) NOT NULL,
  trigger_text TEXT,
  thought_text TEXT NOT NULL,
  action_text TEXT,
  result_text TEXT,
  recurrence_text TEXT,
  thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_review_id UUID REFERENCES trade_reviews(id),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_cycles_user_id ON personal_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_cycles_mirror ON personal_cycles(mirror);
CREATE INDEX IF NOT EXISTS idx_personal_cycles_last_occurred_at ON personal_cycles(last_occurred_at DESC);

CREATE TABLE IF NOT EXISTS daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date_key DATE NOT NULL,
  mirror VARCHAR(40),
  thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  today_insight TEXT NOT NULL,
  practice_action TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  source_channel VARCHAR(80),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_id ON daily_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_date_key ON daily_reflections(date_key);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_completed ON daily_reflections(completed);

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mirror_report_id UUID REFERENCES mirror_reports(id),
  trade_review_id UUID REFERENCES trade_reviews(id),
  daily_reflection_id UUID REFERENCES daily_reflections(id),
  date_key DATE NOT NULL,
  mirror VARCHAR(40),
  action TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  source_channel VARCHAR(80),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_records_user_id ON training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_training_records_date_key ON training_records(date_key);
CREATE INDEX IF NOT EXISTS idx_training_records_mirror ON training_records(mirror);
CREATE INDEX IF NOT EXISTS idx_training_records_completed ON training_records(completed);

CREATE TABLE IF NOT EXISTS living_mirror_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  mirror_spectrum JSONB NOT NULL DEFAULT '{}'::jsonb,
  mirror_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  thief_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  life_form_type VARCHAR(40) NOT NULL DEFAULT 'heart_mirror_tree',
  life_display_name VARCHAR(80) NOT NULL DEFAULT '心镜之树',
  life_stage VARCHAR(40) NOT NULL DEFAULT 'seed',
  vitality_score INTEGER NOT NULL DEFAULT 0 CHECK (vitality_score >= 0),
  tree_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  growth_trend JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cycle_relapse_count INTEGER NOT NULL DEFAULT 0,
  conscience_growth INTEGER NOT NULL DEFAULT 0 CHECK (conscience_growth BETWEEN 0 AND 100),
  last_main_mirror VARCHAR(40),
  last_sub_mirror VARCHAR(40),
  last_daily_reflection_at TIMESTAMPTZ,
  last_trade_review_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_living_mirror_stats_last_updated ON living_mirror_stats(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_living_mirror_stats_last_main_mirror ON living_mirror_stats(last_main_mirror);

CREATE TABLE IF NOT EXISTS living_mirror_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(40) NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  source_id UUID,
  mirror VARCHAR(40),
  thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  delta_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  life_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_living_mirror_events_user_id ON living_mirror_events(user_id);
CREATE INDEX IF NOT EXISTS idx_living_mirror_events_event_type ON living_mirror_events(event_type);
CREATE INDEX IF NOT EXISTS idx_living_mirror_events_mirror ON living_mirror_events(mirror);
CREATE INDEX IF NOT EXISTS idx_living_mirror_events_created_at ON living_mirror_events(created_at DESC);

CREATE TABLE IF NOT EXISTS mirror_scroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  day_index INTEGER,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary TEXT,
  mirror_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  tree_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type VARCHAR(40),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mirror_scroll_entries_user_id ON mirror_scroll_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mirror_scroll_entries_entry_date ON mirror_scroll_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_mirror_scroll_entries_entry_type ON mirror_scroll_entries(entry_type);

CREATE TABLE IF NOT EXISTS assistant_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mirror_report_id UUID REFERENCES mirror_reports(id),
  trade_review_id UUID REFERENCES trade_reviews(id),
  phone_masked VARCHAR(32),
  mirror_spectrum JSONB NOT NULL DEFAULT '{}'::jsonb,
  main_mirror VARCHAR(40),
  sub_mirror VARCHAR(40),
  risk_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  personal_cycle_summary TEXT,
  recent_review_summary TEXT,
  suggested_action TEXT,
  suggested_script TEXT,
  compliance_reminder TEXT NOT NULL DEFAULT '仅做交易心理觉察、训练与复盘承接，不提供投资建议。',
  feishu_synced BOOLEAN NOT NULL DEFAULT false,
  feishu_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_handoffs_user_id ON assistant_handoffs(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_handoffs_feishu_synced ON assistant_handoffs(feishu_synced);
CREATE INDEX IF NOT EXISTS idx_assistant_handoffs_created_at ON assistant_handoffs(created_at DESC);

CREATE TABLE IF NOT EXISTS share_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  mirror_report_id UUID REFERENCES mirror_reports(id),
  invite_code_id UUID REFERENCES invite_codes(id),
  card_type VARCHAR(40) NOT NULL DEFAULT 'mirror_report',
  today_proof TEXT,
  mirror_spectrum JSONB NOT NULL DEFAULT '{}'::jsonb,
  main_mirror VARCHAR(40),
  verdict TEXT,
  practice_action TEXT,
  tree_stage VARCHAR(40),
  image_url TEXT,
  public_token VARCHAR(120) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_cards_user_id ON share_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_share_cards_public_token ON share_cards(public_token);
CREATE INDEX IF NOT EXISTS idx_share_cards_created_at ON share_cards(created_at DESC);

CREATE TABLE IF NOT EXISTS global_reflection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  anonymous_key VARCHAR(120),
  thought TEXT NOT NULL,
  mirror_spectrum JSONB NOT NULL DEFAULT '{}'::jsonb,
  main_mirror VARCHAR(40),
  thieves JSONB NOT NULL DEFAULT '[]'::jsonb,
  trading_scene VARCHAR(160),
  country_code VARCHAR(12),
  locale VARCHAR(20),
  market_type VARCHAR(40),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_reflection_events_main_mirror ON global_reflection_events(main_mirror);
CREATE INDEX IF NOT EXISTS idx_global_reflection_events_country_locale ON global_reflection_events(country_code, locale);
CREATE INDEX IF NOT EXISTS idx_global_reflection_events_occurred_at ON global_reflection_events(occurred_at DESC);

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
