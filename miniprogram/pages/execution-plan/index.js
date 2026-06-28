const {
  getExecutionPlanLibrary,
  saveExecutionPlan,
  updateExecutionPlanRecord,
  deleteExecutionPlanRecord
} = require("../../utils/store");
const { syncLocalState } = require("../../utils/api");
const { DEFAULT_EXECUTION_PLANS } = require("../../modules/execution-plan/index");

function joinList(value) {
  if (Array.isArray(value)) return value.join(" / ");
  return String(value || "");
}

function buildForm(plan = {}) {
  return {
    title: plan.title || "",
    errorType: plan.errorType || plan.error_type || "追高冲动",
    sceneTags: joinList(plan.sceneTags || plan.scene_tags),
    firstThoughts: joinList(plan.firstThoughts || plan.first_thoughts),
    forbiddenActions: joinList(plan.forbiddenActions || plan.forbidden_actions),
    expectedAction: plan.expectedAction || plan.expected_action || "",
    nextAction: plan.nextAction || plan.next_action || plan.expectedAction || plan.expected_action || "",
    trainingPrescription: (plan.trainingPrescription || plan.training_prescription || {}).title ||
      (plan.trainingPrescription || plan.training_prescription || {}).action ||
      String(plan.trainingPrescription || plan.training_prescription || "")
  };
}

function decoratePlan(plan = {}) {
  const enabledText = plan.enabled ? "启用" : "停用";
  return Object.assign({}, plan, {
    enabledText,
    sourceText: plan.source === "default" ? "默认模板" : "自定义",
    sceneTagsText: joinList(plan.sceneTags || plan.scene_tags) || "待补充",
    firstThoughtsText: joinList(plan.firstThoughts || plan.first_thoughts) || "待补充",
    forbiddenActionsText: joinList(plan.forbiddenActions || plan.forbidden_actions) || "待补充",
    expectedActionText: plan.expectedAction || plan.expected_action || "待补充",
    nextActionText: plan.nextAction || plan.next_action || plan.expectedAction || plan.expected_action || "待补充",
    trainingPrescriptionText: (plan.trainingPrescription || plan.training_prescription || {}).title ||
      (plan.trainingPrescription || plan.training_prescription || {}).action ||
      String(plan.trainingPrescription || plan.training_prescription || "待补充")
  });
}

Page({
  data: {
    library: { records: [] },
    plans: [],
    filteredPlans: [],
    errorTypeTabs: [{ key: "all", label: "全部" }].concat(DEFAULT_EXECUTION_PLANS.map((item) => ({
      key: item.errorType,
      label: item.errorType
    }))),
    activeErrorType: "all",
    editingId: "",
    formMode: "create",
    showForm: false,
    form: buildForm()
  },

  onShow() {
    this.load();
  },

  load() {
    const library = getExecutionPlanLibrary();
    const plans = (library.records || []).map(decoratePlan);
    const activeErrorType = this.data.activeErrorType || "all";
    this.setData({
      library,
      plans,
      filteredPlans: this.filterPlans(plans, activeErrorType),
      activeErrorType
    });
  },

  filterPlans(plans, errorType) {
    if (!errorType || errorType === "all") return plans;
    return plans.filter((item) => item.errorType === errorType || item.error_type === errorType);
  },

  selectErrorType(e) {
    const activeErrorType = ((e.currentTarget || {}).dataset || {}).key || "all";
    this.setData({
      activeErrorType,
      filteredPlans: this.filterPlans(this.data.plans || [], activeErrorType)
    });
  },

  startCreate() {
    this.setData({
      editingId: "",
      formMode: "create",
      showForm: true,
      form: buildForm({ errorType: this.data.activeErrorType === "all" ? "追高冲动" : this.data.activeErrorType })
    });
  },

  startEdit(e) {
    const id = ((e.currentTarget || {}).dataset || {}).id || "";
    const plan = (this.data.plans || []).find((item) => item.id === id);
    if (!plan) return;
    this.setData({
      editingId: id,
      formMode: "edit",
      showForm: true,
      form: buildForm(plan)
    });
  },

  cancelEdit() {
    this.setData({
      editingId: "",
      formMode: "create",
      showForm: false,
      form: buildForm()
    });
  },

  inputField(e) {
    const field = ((e.currentTarget || {}).dataset || {}).field || "";
    if (!field) return;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  savePlan() {
    const form = this.data.form || {};
    if (!String(form.title || "").trim() || !String(form.errorType || "").trim()) {
      wx.showToast({ title: "先写标题和错题类型", icon: "none" });
      return;
    }
    const patch = {
      title: form.title,
      errorType: form.errorType,
      error_type: form.errorType,
      sceneTags: form.sceneTags,
      scene_tags: form.sceneTags,
      firstThoughts: form.firstThoughts,
      first_thoughts: form.firstThoughts,
      forbiddenActions: form.forbiddenActions,
      forbidden_actions: form.forbiddenActions,
      expectedAction: form.expectedAction,
      expected_action: form.expectedAction,
      nextAction: form.nextAction || form.expectedAction,
      next_action: form.nextAction || form.expectedAction,
      trainingPrescription: form.trainingPrescription,
      training_prescription: form.trainingPrescription,
      enabled: true
    };
    if (this.data.editingId) {
      updateExecutionPlanRecord(this.data.editingId, patch);
    } else {
      saveExecutionPlan(patch);
    }
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: this.data.editingId ? "执行计划已更新" : "执行计划已新增", icon: "success" });
    this.setData({ showForm: false, editingId: "", formMode: "create", form: buildForm() });
    this.load();
  },

  togglePlan(e) {
    const id = ((e.currentTarget || {}).dataset || {}).id || "";
    const plan = (this.data.plans || []).find((item) => item.id === id);
    if (!plan) return;
    updateExecutionPlanRecord(id, { enabled: !plan.enabled });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: plan.enabled ? "执行计划已停用" : "执行计划已启用", icon: "none" });
    this.load();
  },

  deletePlan(e) {
    const id = ((e.currentTarget || {}).dataset || {}).id || "";
    const plan = (this.data.plans || []).find((item) => item.id === id);
    if (!plan) return;
    const actionText = plan.source === "default" ? "停用" : "删除";
    wx.showModal({
      title: `${actionText}执行计划`,
      content: plan.source === "default" ? "默认模板会被停用，不会从系统中移除。" : "自定义计划删除后可重新新增。",
      confirmText: actionText,
      success: (res) => {
        if (!res.confirm) return;
        deleteExecutionPlanRecord(id);
        syncLocalState({ silent: true }).catch(() => {});
        wx.showToast({ title: `已${actionText}`, icon: "success" });
        this.load();
      }
    });
  }
});
