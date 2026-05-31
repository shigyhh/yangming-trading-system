const baseUrl = process.env.SERVER_URL || "http://localhost:8787";
let accessToken = "";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

const health = await request("/health");
const stats = await request("/api/v1/stats/public");
const login = await request("/api/v1/auth/demo-login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "smoke_demo",
    display_name: `冒烟学员_${Date.now()}`,
    contact: `smoke_${Date.now()}`,
    source_channel: "本地冒烟测试"
  })
});
accessToken = login.access_token;
const studentToken = login.access_token;
const checkin = await request(`/api/v1/users/${login.user.id}/check-in`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    source_channel: "本地冒烟测试",
    note: "今日先正心，再看盘"
  })
});

const start = await request("/api/v1/assessments/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    test_version: "45",
    user_id: login.user.id,
    nickname: login.user.nickname,
    source_channel: "本地冒烟测试"
  })
});

const answers = start.questions.map((question, index) => ({
  question_id: question.question_id,
  score: index % 9 < 2 ? 5 : index % 9 < 5 ? 3 : 2
}));

const submit = await request(`/api/v1/assessments/${start.assessment_id}/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ answers })
});

const feishuDryRun = await request("/api/v1/integrations/feishu/report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dry_run: true,
    assessment_id: start.assessment_id,
    user: { id: login.user.id, displayName: login.user.nickname },
    score_result: submit.score_result,
    server_report: submit.report,
    test_version: "45",
    channel: "本地冒烟测试"
  })
});
const klineBankStats = await request("/api/v1/kline-practice/stats");
const klineLevel = await request(`/api/v1/kline-practice/levels?user_id=${login.user.id}`);
const nextScenario = await request(`/api/v1/kline-practice/next?user_id=${login.user.id}`);
const practice = await request("/api/v1/kline-practice/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: login.user.id,
    nickname: login.user.nickname,
    scenario_id: nextScenario.scenario.id,
    decision: nextScenario.scenario.options[1].label,
    stage_id: klineLevel.level.active_stage.id,
    request_next: true
  })
});
const duplicatePractice = await request("/api/v1/kline-practice/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: login.user.id,
    nickname: login.user.nickname,
    scenario_id: nextScenario.scenario.id,
    decision: nextScenario.scenario.options[1].label,
    stage_id: klineLevel.level.active_stage.id
  })
});
const leaderboard = await request("/api/v1/kline-practice/leaderboard?period=week&limit=3");
const monthlyLeaderboard = await request("/api/v1/kline-practice/leaderboard?period=month&limit=3");
const influence = await request(`/api/v1/users/${login.user.id}/influence`);
const coachLogin = await request("/api/v1/auth/demo-login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "smoke_dojo_coach",
    display_name: `道场教练_${Date.now()}`,
    contact: `dojo_coach_${Date.now()}`,
    source_channel: "本地冒烟测试"
  })
});
accessToken = coachLogin.access_token;
const dojoMentor = await request("/api/v1/dojo/mentors/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    role: "coach",
    display_name: "老何训练营教练",
    bio: "只做修行陪跑，不做交易建议"
  })
});
accessToken = studentToken;
const dojoBinding = await request(`/api/v1/users/${login.user.id}/dojo/bindings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mentor_code: dojoMentor.mentor.mentor_code,
    role: "coach"
  })
});
const dojoTasks = await request("/api/v1/dojo/tasks?limit=3");
const dojoTaskRecord = await request(`/api/v1/users/${login.user.id}/dojo/tasks/${dojoTasks.tasks[0].id}/records`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "complete",
    note: "完成今日共修任务"
  })
});
const dojoMindRecord = await request(`/api/v1/users/${login.user.id}/dojo/mind-records`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "我现在很急，怕错过",
    reply: { title: "观心回应", content: "先慢一拍" },
    context: { personality_type: submit.score_result.main_type }
  })
});
const dojoSummary = await request(`/api/v1/users/${login.user.id}/dojo/summary`);
const dojoLeaderboard = await request("/api/v1/dojo/leaderboard?period=week&limit=5");
accessToken = coachLogin.access_token;
const dojoDashboard = await request("/api/v1/dojo/mentor-dashboard");
accessToken = studentToken;

console.log(JSON.stringify({
  health: health.ok,
  user_id: login.user.id,
  invite_code: login.user.personal_invite_code,
  checked_today: checkin.habit.checked_today,
  question_bank_total: stats.question_bank.total_questions,
  assessment_id: start.assessment_id,
  question_count: start.questions.length,
  main_type: submit.score_result.main_type,
  sub_type: submit.score_result.sub_type,
  risk_level: submit.score_result.risk_level,
  report_no: submit.report.report_no,
  feishu_dry_run: feishuDryRun.dry_run,
  kline_bank_total: klineBankStats.total_questions,
  kline_daily_limit: klineLevel.level.daily_quota.limit,
  kline_unlocked_stages: klineLevel.level.unlocked_stages.length,
  kline_scenario_id: nextScenario.scenario.id,
  practice_points: practice.result.practice_points,
  practice_counts_for_daily: practice.result.counts_for_daily,
  duplicate_practice_blocked: duplicatePractice.result.duplicate === true,
  next_kline_scenario_id: practice.next_scenario?.id,
  leaderboard_count: leaderboard.leaderboard.length,
  monthly_leaderboard_period: monthlyLeaderboard.period,
  influence_score: influence.influence.influence_score,
  dojo_mentor_code: dojoMentor.mentor.mentor_code,
  dojo_bound_role: dojoBinding.binding.role,
  dojo_task_status: dojoTaskRecord.record.status,
  dojo_mind_record_saved: Boolean(dojoMindRecord.record.id),
  dojo_next_task: dojoSummary.summary.next_task?.title,
  dojo_leaderboard_count: dojoLeaderboard.leaderboard.length,
  dojo_dashboard_students: dojoDashboard.dashboard.student_count
}, null, 2));
