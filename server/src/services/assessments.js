import crypto from "node:crypto";
import { readRuntimeRecords, replaceRuntimeRecords, appendRuntimeRecord, appendRuntimeRecords } from "../lib/store.js";
import { loadQuestionBank, selectQuestions } from "./questionBank.js";
import { buildLocalReport, calculateScore } from "./scoring.js";

const SESSION_FILE = "assessment-sessions.json";
const ANSWER_FILE = "assessment-answers.json";
const SCORE_FILE = "score-results.json";
const REPORT_FILE = "reports.json";

export async function startAssessment({
  userId = "anonymous",
  nickname = "",
  testVersion = "45",
  sourceChannel = "未知渠道",
  excludeQuestionIds = [],
  ipAddress,
  userAgent
}) {
  const selection = await selectQuestions({ testVersion, excludeQuestionIds });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 2);
  const assessment = {
    id: crypto.randomUUID(),
    user_id: String(userId || "anonymous"),
    nickname: String(nickname || userId || "测试用户"),
    test_version: selection.test_version,
    question_count: selection.total_questions,
    source_channel: sourceChannel,
    status: "started",
    selected_question_ids: selection.questions.map((item) => item.question_id),
    started_at: now.toISOString(),
    submitted_at: null,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress,
    user_agent: userAgent
  };

  await appendRuntimeRecord(SESSION_FILE, assessment);

  return {
    assessment_id: assessment.id,
    test_version: assessment.test_version,
    question_count: assessment.question_count,
    expires_at: assessment.expires_at,
    questions: selection.questions
  };
}

export async function submitAssessment({ assessmentId, answers }) {
  const sessions = await readRuntimeRecords(SESSION_FILE);
  const sessionIndex = sessions.findIndex((item) => item.id === assessmentId);
  const session = sessions[sessionIndex];

  if (!session) {
    const error = new Error("测评会话不存在");
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== "started") {
    const error = new Error(`测评已处理，当前状态：${session.status}`);
    error.statusCode = 409;
    throw error;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    session.status = "expired";
    await replaceRuntimeRecords(SESSION_FILE, sessions);
    const error = new Error("测评会话已过期，请重新开始测评");
    error.statusCode = 410;
    throw error;
  }

  validateAnswers(session, answers);

  const bank = await loadQuestionBank();
  const selectedQuestionSet = new Set(session.selected_question_ids);
  const selectedQuestions = bank.filter((question) => selectedQuestionSet.has(question.question_id));
  const orderedQuestions = session.selected_question_ids.map((id) => selectedQuestions.find((item) => item.question_id === id));

  const scoreResult = calculateScore({
    questions: orderedQuestions,
    answers,
    nickname: session.nickname || session.user_id,
    channel: session.source_channel,
    testVersion: session.test_version
  });

  const reportContent = buildLocalReport(scoreResult);
  const now = new Date().toISOString();
  const answerRows = answers.map((answer) => {
    const question = selectedQuestions.find((item) => item.question_id === answer.question_id);
    return {
      id: crypto.randomUUID(),
      assessment_id: session.id,
      user_id: session.user_id,
      question_id: question.question_id,
      personality_type: question.personality_type,
      sub_dimension: question.sub_dimension,
      score: Number(answer.score),
      weight: Number(question.weight || 1),
      answered_at: now
    };
  });

  const scoreRecord = {
    id: crypto.randomUUID(),
    assessment_id: session.id,
    user_id: session.user_id,
    ...scoreResult,
    created_at: now
  };

  const reportRecord = {
    id: crypto.randomUUID(),
    report_no: createReportNo(),
    assessment_id: session.id,
    user_id: session.user_id,
    title: `${scoreResult.main_type} 交易画像`,
    content_md: reportContent,
    score_result: scoreResult,
    created_at: now
  };

  await appendRuntimeRecords(ANSWER_FILE, answerRows);
  await appendRuntimeRecord(SCORE_FILE, scoreRecord);
  await appendRuntimeRecord(REPORT_FILE, reportRecord);

  session.status = "reported";
  session.submitted_at = now;
  sessions[sessionIndex] = session;
  await replaceRuntimeRecords(SESSION_FILE, sessions);

  return {
    assessment_id: session.id,
    score_result: scoreResult,
    report: reportRecord
  };
}

export async function getAssessment(assessmentId) {
  const sessions = await readRuntimeRecords(SESSION_FILE);
  return sessions.find((item) => item.id === assessmentId) || null;
}

export async function getUserAssessmentHistory(userId, { limit = 8 } = {}) {
  const normalizedUserId = String(userId || "");
  const max = Math.max(1, Math.min(Number(limit) || 8, 30));
  const [sessions, scores, reports] = await Promise.all([
    readRuntimeRecords(SESSION_FILE),
    readRuntimeRecords(SCORE_FILE),
    readRuntimeRecords(REPORT_FILE)
  ]);

  const scoreByAssessment = new Map(scores.map((item) => [item.assessment_id, item]));
  const reportByAssessment = new Map(reports.map((item) => [item.assessment_id, item]));
  const history = sessions
    .filter((item) => item.user_id === normalizedUserId)
    .sort((a, b) => new Date(b.submitted_at || b.started_at || 0).getTime() - new Date(a.submitted_at || a.started_at || 0).getTime())
    .slice(0, max)
    .map((session) => ({
      assessment_id: session.id,
      status: session.status,
      test_version: session.test_version,
      question_count: session.question_count,
      source_channel: session.source_channel,
      started_at: session.started_at,
      submitted_at: session.submitted_at,
      score_result: compactScoreResult(scoreByAssessment.get(session.id)),
      report: compactReport(reportByAssessment.get(session.id))
    }));

  return {
    history,
    latest: history.find((item) => item.status === "reported" && item.score_result && item.report) || null
  };
}

function compactScoreResult(score) {
  if (!score) return null;
  return {
    main_type: score.main_type,
    sub_type: score.sub_type,
    risk_level: score.risk_level,
    camp: score.camp || score.recommended_camp || "",
    recommended_camp: score.recommended_camp || score.camp || "",
    training_ability: score.training_ability,
    score_percentages: score.score_percentages,
    top_sub_dimensions: score.top_sub_dimensions,
    actions_7_days: score.actions_7_days,
    created_at: score.created_at
  };
}

function compactReport(report) {
  if (!report) return null;
  return {
    id: report.id,
    report_no: report.report_no,
    title: report.title,
    content_md: report.content_md,
    created_at: report.created_at
  };
}

function validateAnswers(session, answers) {
  if (!Array.isArray(answers)) {
    const error = new Error("answers 必须是数组");
    error.statusCode = 400;
    throw error;
  }

  const requiredIds = new Set(session.selected_question_ids);
  const answerIds = new Set();

  for (const answer of answers) {
    if (!requiredIds.has(answer.question_id)) {
      const error = new Error(`题目 ${answer.question_id} 不属于本次测评`);
      error.statusCode = 400;
      throw error;
    }

    if (answerIds.has(answer.question_id)) {
      const error = new Error(`题目 ${answer.question_id} 重复提交`);
      error.statusCode = 400;
      throw error;
    }

    const score = Number(answer.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      const error = new Error(`题目 ${answer.question_id} 的分数必须是 1-5`);
      error.statusCode = 400;
      throw error;
    }

    answerIds.add(answer.question_id);
  }

  const missing = session.selected_question_ids.filter((id) => !answerIds.has(id));
  if (missing.length) {
    const error = new Error(`还有 ${missing.length} 道题没有提交答案`);
    error.statusCode = 400;
    error.missing = missing;
    throw error;
  }
}

function createReportNo() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YM${stamp}${suffix}`;
}
