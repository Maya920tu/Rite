import type { Completions, Habit, HabitColorId, Weekday } from "./types";
import { ALL_DAYS, DEFAULT_REMINDER, WEEKDAYS } from "./types";
import { startOfToday, subDays, toDateKey } from "./dates";

type SeedDef = {
  id: string;
  name: string;
  color: HabitColorId;
  activeDays: Weekday[];
  streak: number;
  /** Keep this many of every 5 older scheduled days (1–4). */
  keep: number;
};

const DEFS: SeedDef[] = [
  {
    id: "rite-stretch",
    name: "Morning stretch",
    color: "forest",
    activeDays: ALL_DAYS,
    streak: 11,
    keep: 4,
  },
  {
    id: "rite-read",
    name: "Read 20 minutes",
    color: "clay",
    activeDays: ALL_DAYS,
    streak: 6,
    keep: 3,
  },
  {
    id: "rite-water",
    name: "Drink water",
    color: "teal",
    activeDays: ALL_DAYS,
    streak: 16,
    keep: 4,
  },
  {
    id: "rite-walk",
    name: "Evening walk",
    color: "slate",
    activeDays: WEEKDAYS,
    streak: 4,
    keep: 3,
  },
  {
    id: "rite-journal",
    name: "Journal",
    color: "wine",
    activeDays: ALL_DAYS,
    streak: 2,
    keep: 2,
  },
];

function scheduled(habit: { activeDays: Weekday[] }, date: Date): boolean {
  return habit.activeDays.includes(date.getDay() as Weekday);
}

export const SAMPLE_IDS = DEFS.map((def) => def.id);

export function isSampleSeed(habits: { id: string }[]): boolean {
  if (habits.length !== DEFS.length) return false;
  const ids = new Set(habits.map((habit) => habit.id));
  return DEFS.every((def) => ids.has(def.id));
}

export function createSeed(now = new Date()): {
  habits: Habit[];
  completions: Completions;
} {
  const today = startOfToday(now);
  const todayIso = toDateKey(today);
  const createdAt = toDateKey(subDays(today, 56));

  const habits: Habit[] = DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    color: def.color,
    activeDays: def.activeDays,
    createdAt,
    reminder: { ...DEFAULT_REMINDER },
    paused: false,
  }));

  const completions: Completions = {};

  for (const def of DEFS) {
    const habit = habits.find((h) => h.id === def.id)!;
    const dates: string[] = [];
    let forcedLeft = def.streak;
    let olderIndex = 0;
    let missedAfterStreak = false;

    for (let i = 0; i < 56; i += 1) {
      const day = subDays(today, i);
      const key = toDateKey(day);
      // Never pre-check today — a new calendar day always starts open.
      if (key === todayIso) continue;
      if (!scheduled(habit, day)) continue;

      if (forcedLeft > 0) {
        dates.push(key);
        forcedLeft -= 1;
        continue;
      }

      if (!missedAfterStreak) {
        missedAfterStreak = true;
        continue;
      }

      if (olderIndex % 5 < def.keep) {
        dates.push(key);
      }
      olderIndex += 1;
    }

    completions[def.id] = dates.sort();
  }

  return { habits, completions };
}
