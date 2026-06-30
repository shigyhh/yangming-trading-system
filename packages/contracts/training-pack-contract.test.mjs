import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("./training-pack.d.ts", import.meta.url);
const packageUrl = new URL("./package.json", import.meta.url);

const requiredTypes = [
  "TrainingPack",
  "CreateTrainingPackInput",
  "UpdateTrainingPackInput",
  "TrainingPackResponse",
  "TrainingPackListResponse",
];

const requiredFields = [
  "errorType",
  "error_type",
  "sceneTags",
  "scene_tags",
  "trainingGoal",
  "training_goal",
  "expectedAction",
  "expected_action",
  "defaultPrompt",
  "default_prompt",
  "trainingPrescription",
  "training_prescription",
  "sortOrder",
  "sort_order",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
];

test("training pack contract exposes public CRUD payloads with camel and snake aliases", async () => {
  const contract = await readFile(contractUrl, "utf8");
  const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));

  requiredTypes.forEach((typeName) => {
    assert.match(contract, new RegExp(`export type ${typeName}\\b`), `missing exported type: ${typeName}`);
  });

  requiredFields.forEach((fieldName) => {
    assert.ok(contract.includes(fieldName), `missing field: ${fieldName}`);
  });

  assert.ok(packageJson.exports["./training-pack"], "training-pack contract export is missing");
});
