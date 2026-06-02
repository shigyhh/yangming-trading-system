import { getStorage, setStorage } from "@/features/assessment/storage"

import { mirrorReportStorageKey } from "./mirrorReportEngine"
import type { MirrorReport } from "./mirrorReportTypes"

export function loadMirrorReport() {
  return getStorage<MirrorReport | null>(mirrorReportStorageKey, null)
}

export function saveMirrorReport(report: MirrorReport) {
  setStorage(mirrorReportStorageKey, report)
  return report
}
