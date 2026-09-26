import type { Completions, Habit, HabitColorId, Weekday, WeekFreeze } from "./types";
import {
  fromDateKey,
  isFutureDay,
  startOfToday,
  subDays,
  toDateKey,
  weekDays,
} from "./dates";

export function isSkipped(
  skips: Completions | undefined,
  habitId: string,
  dateKey: string,
): boolean {
  return skips?.[habitId]?.includes(dateKey) ?? false;
}

export function isScheduled(habit: Habit, date: Date): boolean {
  return habit.activeDays.includes(date.getDay() as Weekday);
}

export function isComplete(
  completions: Completions,
  habitId: string,
  dateKey: string,
): boolean {
  return completions[habitId]?.includes(dateKey) ?? false;
}

export function createdDate(habit: Habit): Date {
  return fromDateKey(habit.createdAt.slice(0, 10));
}

export function isOnOrAfterCreated(habit: Habit, date: Date): boolean {
  return date >= createdDate(habit);
}

export type HabitDayState = {
  key: string;
  scheduled: boolean;
  done: boolean;
  skipped: boolean;
  future: boolean;
  beforeCreated: boolean;
  locked: boolean;
};

export function habitDayState(
  habit: Habit,
  completions: Completions,
  date: Date,
  now = new Date(),
  skips: Completions = {},
): HabitDayState {
  const key = toDateKey(date);
  const scheduled = isScheduled(habit, date);
  const done = isComplete(completions, habit.id, key);
  const skipped = isSkipped(skips, habit.id, key);
  const future = isFutureDay(date, now);
  const beforeCreated = !isOnOrAfterCreated(habit, date);
  const locked = future || !scheduled || beforeCreated;
  return { key, scheduled, done, skipped, future, beforeCreated, locked };
}

export type DayMark = {
  id: string;
  color: HabitColorId;
  done: boolean;
};

export function dayMarks(
  habits: Habit[],
  completions: Completions,
  date: Date,
  now = new Date(),
): DayMark[] {
  const marks: DayMark[] = [];
  for (const habit of habits) {
    const state = habitDayState(habit, completions, date, now);
    if (state.beforeCreated || !state.scheduled) continue;
    marks.push({ id: habit.id, color: habit.color, done: state.done });
  }
  return marks;
}

export function currentStreak(
  habit: Habit,
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): number {
  let cursor = startOfToday(now);
  const todayIso = toDateKey(cursor);

  if (
    isScheduled(habit, cursor) &&
    !isComplete(completions, habit.id, todayIso) &&
    !isSkipped(skips, habit.id, todayIso)
  ) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  for (let i = 0; i < 800; i += 1) {
    if (!isOnOrAfterCreated(habit, cursor)) break;
    const key = toDateKey(cursor);
    if (!isScheduled(habit, cursor) || isSkipped(skips, habit.id, key)) {
      cursor = subDays(cursor, 1);
      continue;
    }
    if (isComplete(completions, habit.id, key)) {
      streak += 1;
      cursor = subDays(cursor, 1);
      continue;
    }
    break;
  }
  return streak;
}

export function longestStreak(
  habit: Habit,
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): number {
  const done = new Set(completions[habit.id] ?? []);
  let cursor = startOfToday(now);
  let best = 0;
  let run = 0;

  for (let i = 0; i < 800; i += 1) {
    if (!isOnOrAfterCreated(habit, cursor)) break;
    const key = toDateKey(cursor);
    if (!isScheduled(habit, cursor) || isSkipped(skips, habit.id, key)) {
      cursor = subDays(cursor, 1);
      continue;
    }
    if (done.has(key)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    cursor = subDays(cursor, 1);
  }
  return best;
}

export function completionRate(
  habit: Habit,
  completions: Completions,
  days = 30,
  now = new Date(),
  skips: Completions = {},
): { rate: number; done: number; scheduled: number } {
  const doneSet = new Set(completions[habit.id] ?? []);
  let cursor = startOfToday(now);
  let scheduled = 0;
  let done = 0;

  for (let i = 0; i < 400 && scheduled < days; i += 1) {
    if (!isOnOrAfterCreated(habit, cursor)) break;
    const key = toDateKey(cursor);
    if (isScheduled(habit, cursor) && !isSkipped(skips, habit.id, key)) {
      scheduled += 1;
      if (doneSet.has(key)) done += 1;
    }
    cursor = subDays(cursor, 1);
  }

  return {
    done,
    scheduled,
    rate: scheduled === 0 ? 0 : Math.round((done / scheduled) * 100),
  };
}

export function weekProgress(
  habits: Habit[],
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): { done: number; total: number } {
  const days = weekDays(now);
  let total = 0;
  let done = 0;
  for (const habit of habits) {
    if (habit.paused) continue;
    for (const day of days) {
      if (isFutureDay(day, now)) continue;
      if (!isOnOrAfterCreated(habit, day)) continue;
      if (!isScheduled(habit, day)) continue;
      const key = toDateKey(day);
      if (isSkipped(skips, habit.id, key)) continue;
      total += 1;
      if (isComplete(completions, habit.id, key)) done += 1;
    }
  }
  return { done, total };
}

export function todayProgress(
  habits: Habit[],
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): { done: number; total: number } {
  const key = toDateKey(now);
  const scheduled = habits.filter(
    (h) => !h.paused && isScheduled(h, now) && !isSkipped(skips, h.id, key),
  );
  const done = scheduled.filter((h) => isComplete(completions, h.id, key)).length;
  return { done, total: scheduled.length };
}

export function bestCurrentStreak(
  habits: Habit[],
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): number {
  return habits.reduce(
    (best, habit) => Math.max(best, currentStreak(habit, completions, now, skips)),
    0,
  );
}

export function dayCompletionCount(
  habits: Habit[],
  completions: Completions,
  date: Date,
  skips: Completions = {},
): { done: number; total: number } {
  let total = 0;
  let done = 0;
  const key = toDateKey(date);
  for (const habit of habits) {
    if (!isOnOrAfterCreated(habit, date)) continue;
    if (!isScheduled(habit, date)) continue;
    if (isSkipped(skips, habit.id, key)) continue;
    total += 1;
    if (isComplete(completions, habit.id, key)) done += 1;
  }
  return { done, total };
}

export function isFrozen(freeze: WeekFreeze | null | undefined, habitId: string, dateKey: string): boolean {
  return Boolean(freeze && freeze.habitId === habitId && freeze.dateKey === dateKey);
}

export function freezeAvailable(freeze: WeekFreeze | null | undefined, now = new Date()): boolean {
  if (!freeze) return true;
  return freeze.weekKey !== weekKeyFromNow(now);
}

function weekKeyFromNow(now: Date): string {
  const day = now.getDay();
  const offset = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  return toDateKey(start);
}

export function weekScore(
  habits: Habit[],
  completions: Completions,
  now = new Date(),
  skips: Completions = {},
): number {
  let points = 0;
  let total = 0;
  for (const habit of habits) {
    if (habit.paused) continue;
    let cursor = startOfToday(now);
    let counted = 0;
    for (let i = 0; i < 21 && counted < 7; i += 1) {
      if (!isOnOrAfterCreated(habit, cursor)) break;
      if (isFutureDay(cursor, now)) {
        cursor = subDays(cursor, 1);
        continue;
      }
      if (!isScheduled(habit, cursor)) {
        cursor = subDays(cursor, 1);
        continue;
      }
      const key = toDateKey(cursor);
      counted += 1;
      total += 1;
      if (isComplete(completions, habit.id, key)) points += 1;
      else if (isSkipped(skips, habit.id, key)) points += 0.7;
      cursor = subDays(cursor, 1);
    }
  }
  return total === 0 ? 0 : Math.round((points / total) * 100);
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];
