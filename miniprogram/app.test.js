const assert = require("node:assert");

function loadAppWithWx(wxMock) {
  const appPath = require.resolve("./app");
  delete require.cache[appPath];

  let appConfig = null;
  global.wx = wxMock;
  global.App = (config) => {
    appConfig = config;
  };

  require("./app");
  return appConfig;
}

function createWxMock(envVersion = "release") {
  const storage = {};
  const updateManager = {
    checkHandler: null,
    readyHandler: null,
    failedHandler: null,
    applied: false,
    onCheckForUpdate(handler) {
      this.checkHandler = handler;
    },
    onUpdateReady(handler) {
      this.readyHandler = handler;
    },
    onUpdateFailed(handler) {
      this.failedHandler = handler;
    },
    applyUpdate() {
      this.applied = true;
    }
  };

  return {
    updateManager,
    modalOptions: null,
    toastOptions: null,
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    getAccountInfoSync() {
      return { miniProgram: { envVersion } };
    },
    loadFontFace(options) {
      if (options && typeof options.fail === "function") options.fail();
    },
    getUpdateManager() {
      return updateManager;
    },
    showModal(options) {
      this.modalOptions = options;
      options.success({ confirm: true });
    },
    showToast(options) {
      this.toastOptions = options;
    }
  };
}

const developWxMock = createWxMock("develop");
const developAppConfig = loadAppWithWx(developWxMock);

assert.ok(developAppConfig, "app.js should register App config");
developAppConfig.onLaunch();
assert.equal(developWxMock.updateManager.checkHandler, null);
assert.equal(developWxMock.updateManager.readyHandler, null);
assert.equal(developWxMock.updateManager.failedHandler, null);

const wxMock = createWxMock("trial");
const appConfig = loadAppWithWx(wxMock);

assert.ok(appConfig, "app.js should register App config");
appConfig.onLaunch();

assert.equal(typeof wxMock.updateManager.checkHandler, "function");
assert.equal(typeof wxMock.updateManager.readyHandler, "function");
assert.equal(typeof wxMock.updateManager.failedHandler, "function");

wxMock.updateManager.readyHandler();
assert.equal(wxMock.modalOptions.title, "新版本已就绪");
assert.equal(wxMock.updateManager.applied, true);

wxMock.updateManager.failedHandler();
assert.equal(wxMock.toastOptions.title, "新版本下载失败，请稍后重试");

console.log("Mini program app launch guard passed.");
