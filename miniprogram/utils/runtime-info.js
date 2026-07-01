function callWxMethod(name) {
  try {
    if (typeof wx === "undefined" || typeof wx[name] !== "function") return {};
    return wx[name]() || {};
  } catch (error) {
    return {};
  }
}

function readLegacySystemInfo() {
  return callWxMethod("getSystemInfoSync");
}

function readWindowInfo() {
  const windowInfo = callWxMethod("getWindowInfo");
  if (Object.keys(windowInfo).length) return windowInfo;
  return readLegacySystemInfo();
}

function readDeviceInfo() {
  const deviceInfo = callWxMethod("getDeviceInfo");
  if (Object.keys(deviceInfo).length) return deviceInfo;
  return readLegacySystemInfo();
}

function getRuntimeWindowWidth(defaultWidth = 375) {
  const width = Number(readWindowInfo().windowWidth || 0);
  return Number.isFinite(width) && width > 0 ? width : defaultWidth;
}

function getRuntimePixelRatio(defaultRatio = 2) {
  const windowInfo = readWindowInfo();
  const deviceInfo = readDeviceInfo();
  const ratio = Number(windowInfo.pixelRatio || deviceInfo.pixelRatio || 0);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : defaultRatio;
}

function getRuntimeRpxScale() {
  return Math.max(0.2, getRuntimeWindowWidth() / 750);
}

function getRuntimePlatform() {
  const platform = readDeviceInfo().platform || "";
  return String(platform || "");
}

module.exports = {
  readWindowInfo,
  readDeviceInfo,
  getRuntimeWindowWidth,
  getRuntimePixelRatio,
  getRuntimeRpxScale,
  getRuntimePlatform
};
