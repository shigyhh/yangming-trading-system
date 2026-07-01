const assert = require("assert");
const { readFileSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..");
const productionFiles = [
  "miniprogram/pages/home/index.js",
  "miniprogram/pages/kline-mind/index.js",
  "miniprogram/utils/api.js"
];

let runtimeInfo = null;
try {
  runtimeInfo = require("./utils/runtime-info");
} catch (error) {
  runtimeInfo = null;
}

assert.ok(runtimeInfo, "runtime-info helper should exist before runtime APIs are used");

function withWx(mockWx, fn) {
  const previousWx = global.wx;
  global.wx = mockWx;
  try {
    return fn();
  } finally {
    if (previousWx === undefined) {
      delete global.wx;
    } else {
      global.wx = previousWx;
    }
  }
}

withWx({
  getWindowInfo() {
    return { windowWidth: 390, pixelRatio: 3 };
  },
  getDeviceInfo() {
    return { platform: "ios" };
  },
  getSystemInfoSync() {
    throw new Error("deprecated getSystemInfoSync should not be called when modern APIs exist");
  }
}, () => {
  assert.strictEqual(runtimeInfo.getRuntimeWindowWidth(), 390);
  assert.strictEqual(runtimeInfo.getRuntimePixelRatio(), 3);
  assert.strictEqual(runtimeInfo.getRuntimePlatform(), "ios");
  assert.strictEqual(runtimeInfo.getRuntimeRpxScale(), 0.52);
});

withWx({}, () => {
  assert.strictEqual(runtimeInfo.getRuntimeWindowWidth(), 375);
  assert.strictEqual(runtimeInfo.getRuntimePixelRatio(), 2);
  assert.strictEqual(runtimeInfo.getRuntimePlatform(), "");
  assert.strictEqual(runtimeInfo.getRuntimeRpxScale(), 0.5);
});

const directDeprecatedCalls = productionFiles.flatMap((file) => {
  const source = readFileSync(join(root, file), "utf8");
  return source.split("\n").flatMap((line, index) => {
    return line.includes("getSystemInfoSync") ? [`${file}:${index + 1}`] : [];
  });
});

assert.deepStrictEqual(
  directDeprecatedCalls,
  [],
  "production pages/api should use runtime-info helpers instead of direct wx.getSystemInfoSync"
);

console.log("runtime-info compatibility guard passed");
