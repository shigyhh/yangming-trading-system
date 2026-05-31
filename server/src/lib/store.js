import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const fileQueues = new Map();

async function ensureRuntimeDir() {
  await fs.mkdir(config.runtimeDir, { recursive: true });
}

export async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonFile(filePath, data) {
  await ensureRuntimeDir();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function runtimeFile(name) {
  return path.join(config.runtimeDir, name);
}

export async function appendRuntimeRecord(name, record) {
  await updateRuntimeRecords(name, (records) => records.concat(record));
  return record;
}

export async function appendRuntimeRecords(name, newRecords) {
  await updateRuntimeRecords(name, (records) => records.concat(newRecords));
  return newRecords;
}

export async function replaceRuntimeRecords(name, records) {
  await withFileQueue(name, async () => {
    const filePath = runtimeFile(name);
    await writeJsonFile(filePath, records);
  });
}

export async function readRuntimeRecords(name) {
  return readJsonFile(runtimeFile(name), []);
}

export async function updateRuntimeRecords(name, updater) {
  return withFileQueue(name, async () => {
    const filePath = runtimeFile(name);
    const records = await readJsonFile(filePath, []);
    const nextRecords = await updater(records);
    await writeJsonFile(filePath, nextRecords);
    return nextRecords;
  });
}

async function withFileQueue(name, action) {
  const current = fileQueues.get(name) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  const tail = current.then(() => next);
  fileQueues.set(name, tail);

  try {
    await current;
    return await action();
  } finally {
    release();
    if (fileQueues.get(name) === tail) fileQueues.delete(name);
  }
}
