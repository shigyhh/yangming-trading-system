import assert from "node:assert/strict";
import test from "node:test";

import {
  createLivingMirrorGrowthRecord,
  getMirrorSceneReflection,
  getOneThoughtForScene,
  getSceneMirrorCandidates,
  oneThoughtScenes,
} from "./one-thought.js";

const forbidden = /(荐股|喊单|预测行情|买入|卖出|收益|必赚|稳赚|带单|抄底|逃顶)/;

test("one thought library exposes the ten floating scene tags", () => {
  assert.deepEqual(
    oneThoughtScenes.map((scene) => scene.key),
    [
      "surge",
      "plunge",
      "missed",
      "floatingGain",
      "floatingLoss",
      "beforeStop",
      "lossStreak",
      "winStreak",
      "crowdNoise",
      "review",
    ],
  );
  assert.deepEqual(
    oneThoughtScenes.map((scene) => scene.label),
    [
      "急涨时",
      "急跌时",
      "踏空后",
      "浮盈时",
      "浮亏时",
      "止损前",
      "连续亏损后",
      "连续盈利后",
      "别人都在说时",
      "收盘复盘时",
    ],
  );
});

test("one thought library selects the first thought from scene and intensity before any mirror is chosen", () => {
  const urgentSurge = getOneThoughtForScene({ sceneKey: "surge", intensity: 5 });
  const quietSurge = getOneThoughtForScene({ sceneKey: "surge", intensity: 1 });
  const fallback = getOneThoughtForScene({ sceneKey: "unknown", intensity: 9 });

  assert.equal(urgentSurge.text, "我不能又慢一步。");
  assert.equal(urgentSurge.sceneKey, "surge");
  assert.equal(urgentSurge.sceneLabel, "急涨时");
  assert.equal(urgentSurge.intensity, 5);
  assert.notEqual(urgentSurge.text, quietSurge.text);
  assert.equal(fallback.sceneKey, "surge");
  assert.equal(fallback.intensity, 3);

  for (const thought of [urgentSurge, quietSurge, fallback]) {
    assert.equal(forbidden.test(Object.values(thought).join("")), false);
  }
});

test("one thought library recommends related mirrors from scene without selecting one", () => {
  assert.deepEqual(
    getSceneMirrorCandidates({ sceneKey: "surge", intensity: 3 }).mirrorKeys,
    ["chase", "gamble", "herd"],
  );
  assert.deepEqual(
    getSceneMirrorCandidates({ sceneKey: "floatingLoss", intensity: 3 }).mirrorKeys,
    ["hold", "fantasy", "hesitate"],
  );
  assert.deepEqual(
    getSceneMirrorCandidates({ sceneKey: "crowdNoise", intensity: 3 }).mirrorKeys,
    ["herd", "chase", "anxiety"],
  );
  assert.deepEqual(
    getSceneMirrorCandidates({ sceneKey: "review", intensity: 3 }).mirrorKeys,
    ["delay", "liangzhi", "fantasy"],
  );

  const fallback = getSceneMirrorCandidates({ sceneKey: "unknown", intensity: 9 });

  assert.equal(fallback.sceneKey, "surge");
  assert.deepEqual(fallback.mirrorKeys, ["chase", "gamble", "herd"]);
  assert.equal(forbidden.test(JSON.stringify(fallback)), false);
});

test("one thought library selects reflection evidence and practice from mirror scene and intensity", () => {
  const chaseSurge = getMirrorSceneReflection({ mirrorKey: "chase", sceneKey: "surge", intensity: 5 });
  const holdFloatingLoss = getMirrorSceneReflection({ mirrorKey: "hold", sceneKey: "floatingLoss", intensity: 4 });
  const herdNoise = getMirrorSceneReflection({ mirrorKey: "herd", sceneKey: "crowdNoise", intensity: 3 });

  assert.deepEqual(chaseSurge.reflection.lines, [
    "你怕的不是错过行情。",
    "你怕的是再次证明自己，",
    "比别人慢了一步。",
  ]);
  assert.match(chaseSurge.evidence.text, /不是在追行情/);
  assert.match(chaseSurge.practice.text, /停三息/);
  assert.notEqual(chaseSurge.evidence.text, holdFloatingLoss.evidence.text);
  assert.match(herdNoise.reflection.lines.join(""), /(外面的声音|不敢独自负责|是不是我错了)/);

  for (const item of [chaseSurge, holdFloatingLoss, herdNoise]) {
    assert.equal(forbidden.test(JSON.stringify(item)), false);
  }
});

test("one thought library creates a living mirror growth record with scene and selected mirror", () => {
  const thought = getOneThoughtForScene({ sceneKey: "surge", intensity: 5 });
  const content = getMirrorSceneReflection({ mirrorKey: "chase", sceneKey: "surge", intensity: 5 });
  const record = createLivingMirrorGrowthRecord({
    sceneKey: "surge",
    mirrorKey: "chase",
    thought,
    thief: "贪 · 急",
    evidence: content.evidence,
    practice: content.practice,
    createdAt: 1710000000000,
  });

  assert.deepEqual(record, {
    scene: "surge",
    mirrorId: "chase",
    thought: "我不能又慢一步。",
    thief: "贪 · 急",
    evidence: content.evidence.text,
    practice: content.practice.text,
    createdAt: 1710000000000,
  });
});
