import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contractSource = fs.readFileSync(new URL("./data-binding.d.ts", import.meta.url), "utf8");

test("data-binding contract declares intervention event aliases and responses", () => {
  [
    "DataBindingInterventionEvent",
    "DataBindingInterventionEventPayload",
    "DataBindingInterventionEventResponse",
    "DataBindingInterventionEventListResponse",
    "intervention_events",
    "interventionEvents",
    "triggerType",
    "trigger_type",
    "sourceType",
    "source_type",
    "sessionId",
    "session_id",
    "reviewId",
    "review_id",
    "planId",
    "plan_id",
    "firstThought",
    "first_thought",
    "sceneTags",
    "scene_tags",
    "triggerScene",
    "trigger_scene",
    "suggestedAction",
    "suggested_action",
    "expectedAction",
    "expected_action",
    "userResponse",
    "user_response",
    "executionResult",
    "execution_result"
  ].forEach((token) => {
    assert.ok(contractSource.includes(token), `missing ${token}`);
  });
});

test("data-binding contract declares intervention rule aliases and responses", () => {
  [
    "DataBindingInterventionRule",
    "DataBindingInterventionRulePayload",
    "DataBindingInterventionRuleResponse",
    "DataBindingInterventionRuleListResponse",
    "intervention_rules",
    "interventionRules",
    "messageTemplate",
    "message_template",
    "maxPerSession",
    "max_per_session",
    "cooldownMinutes",
    "cooldown_minutes",
    "priority",
    "enabled"
  ].forEach((token) => {
    assert.ok(contractSource.includes(token), `missing ${token}`);
  });
});
