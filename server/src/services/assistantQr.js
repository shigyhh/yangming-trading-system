import path from "node:path";
import { config } from "../config.js";
import { readJsonFile, updateRuntimeRecords } from "../lib/store.js";

const ROTATION_FILE = "assistant-qr-rotation.json";

export async function getNextAssistantQr() {
  const pool = await loadAssistantQrPool();
  if (!pool.length) {
    const error = new Error("助理二维码资源池为空");
    error.statusCode = 404;
    throw error;
  }

  let selectedIndex = 0;
  await updateRuntimeRecords(ROTATION_FILE, (records) => {
    const state = records[0] || { next_index: 0, served_count: 0 };
    selectedIndex = normalizeIndex(state.next_index, pool.length);
    return [{
      next_index: (selectedIndex + 1) % pool.length,
      served_count: Number(state.served_count || 0) + 1,
      updated_at: new Date().toISOString()
    }];
  });

  return {
    item: pool[selectedIndex],
    index: selectedIndex,
    total: pool.length
  };
}

async function loadAssistantQrPool() {
  const filePath = path.resolve(config.webDir, "data", "assistant-qr-pool.json");
  const pool = await readJsonFile(filePath, []);
  return Array.isArray(pool)
    ? pool.filter((item) => item && item.enabled !== false && item.src)
    : [];
}

function normalizeIndex(value, count) {
  if (count <= 1) return 0;
  const index = Number(value);
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.floor(index) % count;
}
