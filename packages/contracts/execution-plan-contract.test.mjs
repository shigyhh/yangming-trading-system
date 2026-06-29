import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contractSource = fs.readFileSync(new URL("./data-binding.d.ts", import.meta.url), "utf8");

test("data-binding contract declares execution plan aliases and responses", () => {
  [
    "DataBindingExecutionPlan",
    "DataBindingExecutionPlanPayload",
    "DataBindingExecutionPlanResponse",
    "DataBindingExecutionPlanListResponse",
    "execution_plans",
    "executionPlans",
    "firstThoughts",
    "first_thoughts",
    "forbiddenActions",
    "forbidden_actions",
    "expectedAction",
    "expected_action",
    "nextAction",
    "next_action",
    "trainingPrescription",
    "training_prescription",
    "sceneTags",
    "scene_tags",
    "enabled"
  ].forEach((token) => {
    assert.ok(contractSource.includes(token), `missing ${token}`);
  });
});
