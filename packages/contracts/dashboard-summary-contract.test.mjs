import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dataBindingSource = fs.readFileSync(new URL("./data-binding.d.ts", import.meta.url), "utf8");

test("data-binding contract declares dashboard summary metrics and aliases", () => {
  [
    "DashboardSummary",
    "dashboard_summary",
    "DashboardSummaryResponse",
    "overview",
    "execution",
    "mistakes",
    "firstThoughts",
    "first_thoughts",
    "triggerScenes",
    "trigger_scenes",
    "training",
    "bookmarks",
    "interventions",
    "executionPlans",
    "execution_plans",
    "archive",
    "trends",
    "dataGaps",
    "data_gaps",
    "consistencyRate",
    "consistency_rate",
    "trainingPackId",
    "training_pack_id",
    "segmentId",
    "segment_id"
  ].forEach((token) => {
    assert.ok(dataBindingSource.includes(token), `missing ${token}`);
  });
});

test("data-binding contract declares weekly mirror summary", () => {
  [
    "WeeklyMirrorSummary",
    "weekly_mirror_summary",
    "WeeklyMirrorSummaryResponse",
    "weekStart",
    "week_start",
    "weekEnd",
    "week_end",
    "topErrorTypes",
    "top_error_types",
    "topFirstThoughts",
    "top_first_thoughts",
    "topTriggerScenes",
    "top_trigger_scenes",
    "executionConsistency",
    "execution_consistency",
    "repeatCount",
    "repeat_count",
    "nextWeekTrainingPlan",
    "next_week_training_plan"
  ].forEach((token) => {
    assert.ok(dataBindingSource.includes(token), `missing ${token}`);
  });
});
