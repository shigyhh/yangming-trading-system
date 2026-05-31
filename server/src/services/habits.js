import crypto from "node:crypto";
import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const CHECKIN_FILE = "daily-checkins.json";
const POINTS_PER_CHECKIN = 10;

export async function checkInUser({ userId, sourceChannel = "网页MVP", note = "" }) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const today = getLocalDateKey();
  let summary;

  await updateRuntimeRecords(CHECKIN_FILE, (records) => {
    const existing = records.find((item) => item.user_id === userId && item.date_key === today);

    if (existing) {
      summary = buildHabitSummary(records, userId, {
        checked_today: true,
        repeated: true,
        checkin: existing
      });
      return records;
    }

    const checkin = {
      id: crypto.randomUUID(),
      user_id: userId,
      date_key: today,
      source_channel: sourceChannel,
      note,
      points: POINTS_PER_CHECKIN,
      created_at: new Date().toISOString()
    };

    const nextRecords = records.concat(checkin);
    summary = buildHabitSummary(nextRecords, userId, {
      checked_today: true,
      repeated: false,
      checkin
    });
    return nextRecords;
  });

  return summary;
}

export async function getUserHabit(userId) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const records = await readRuntimeRecords(CHECKIN_FILE);
  return buildHabitSummary(records, userId, {
    checked_today: records.some((item) => item.user_id === userId && item.date_key === getLocalDateKey())
  });
}

function buildHabitSummary(records, userId, patch = {}) {
  const userRecords = records
    .filter((item) => item.user_id === userId)
    .sort((a, b) => a.date_key.localeCompare(b.date_key));
  const dateKeys = [...new Set(userRecords.map((item) => item.date_key))];
  const totalPoints = userRecords.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const weeklyDates = getRecentDateKeys(7);

  return {
    user_id: userId,
    checked_today: Boolean(patch.checked_today),
    repeated: Boolean(patch.repeated),
    checkin: patch.checkin || null,
    total_days: dateKeys.length,
    streak_days: countStreak(dateKeys),
    practice_points: totalPoints,
    weekly_checkins: weeklyDates.map((dateKey) => ({
      date_key: dateKey,
      checked: dateKeys.includes(dateKey)
    })),
    last_checkin_at: userRecords.at(-1)?.created_at || null
  };
}

function countStreak(dateKeys) {
  const checked = new Set(dateKeys);
  let streak = 0;
  let cursor = new Date(`${getLocalDateKey()}T00:00:00`);

  while (checked.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRecentDateKeys(days) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return formatDateKey(date);
  });
}

function getLocalDateKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
