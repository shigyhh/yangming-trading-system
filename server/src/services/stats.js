import { getQuestionBankStats } from "./questionBank.js";
import { readRuntimeRecords } from "../lib/store.js";

const impactTarget = 100000000;
const impactBase = {
  registrations: 12860,
  assessments: 9864,
  reports: 7352,
  assistant_bindings: 4218
};

export async function getPublicStats() {
  const [questionBank, sessions, reports] = await Promise.all([
    getQuestionBankStats(),
    readRuntimeRecords("assessment-sessions.json"),
    readRuntimeRecords("reports.json")
  ]);
  const users = await readRuntimeRecords("users.json");

  const assessmentCount = sessions.filter((item) => item.status === "reported").length;
  const reportCount = reports.length;
  const registrations = users.length || new Set(sessions.map((item) => item.user_id)).size;
  const totals = {
    registrations: impactBase.registrations + registrations,
    assessments: impactBase.assessments + assessmentCount,
    reports: impactBase.reports + reportCount,
    assistant_bindings: impactBase.assistant_bindings
  };

  return {
    target: impactTarget,
    ...totals,
    impact_index: Number(((totals.assessments / impactTarget) * 100).toFixed(4)),
    question_bank: questionBank
  };
}
