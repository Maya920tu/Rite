import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export const DATE_KEY = "yyyy-MM-dd";

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY);
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function weekKey(now = new Date()): string {
  return toDateKey(startOfWeek(now, { weekStartsOn: 1 }));
}

export function weekDays(anchor = new Date()): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(anchor = new Date()): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function isFutureDay(date: Date, now = new Date()): boolean {
  return isAfter(date, startOfToday(now));
}

export function sameDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

export {
  isToday,
  isSameMonth,
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
};
