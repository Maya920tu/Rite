import { format } from "date-fns";
import { isComplete, isScheduled } from "./stats";
import { todayKey } from "./dates";
import {
  DEFAULT_REMINDER,
  DEFAULT_REMINDER_SETTINGS,
  RINGTONE_IDS,
  type Completions,
  type Habit,
  type HabitReminder,
  type ReminderSettings,
  type ReminderStyle,
  type RingtoneId,
  type SnoozeMinutes,
  type VolumeLevel,
} from "./types";

const TIME = /^(\d{1,2}):(\d{2})$/;

export const RINGTONE_META: Record<RingtoneId, { label: string }> = {
  bell: { label: "Bell" },
  chime: { label: "Chime" },
  wood: { label: "Wood" },
  pulse: { label: "Pulse" },
  bowl: { label: "Bowl" },
};

export const STYLE_META: Record<ReminderStyle, { label: string; hint: string }> = {
  notify: { label: "Notice", hint: "One chime and a browser alert" },
  alarm: { label: "Alarm", hint: "Keeps ringing until you mark, snooze, or stop" },
  quiet: { label: "Quiet", hint: "In-app toast only, no sound" },
};

export function normalizeTime(value: string): string {
  const match = TIME.exec(value.trim());
  if (!match) return DEFAULT_REMINDER.time;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeReminder(value?: Partial<HabitReminder> | null): HabitReminder {
  const style = value?.style;
  const ringtone = value?.ringtone;
  return {
    enabled: Boolean(value?.enabled),
    time: normalizeTime(value?.time ?? DEFAULT_REMINDER.time),
    style: style === "alarm" || style === "quiet" || style === "notify" ? style : "notify",
    ringtone:
      ringtone === "default" || (ringtone && RINGTONE_IDS.includes(ringtone as RingtoneId))
        ? ringtone
        : "default",
  };
}

export function normalizeSettings(value?: Partial<ReminderSettings> | null): ReminderSettings {
  const ringtone = value?.ringtone;
  const volume = value?.volume;
  const snooze = value?.snoozeMinutes;
  return {
    soundEnabled: value?.soundEnabled !== false,
    notifyEnabled: Boolean(value?.notifyEnabled),
    ringtone: ringtone && RINGTONE_IDS.includes(ringtone) ? ringtone : DEFAULT_REMINDER_SETTINGS.ringtone,
    volume: volume === "low" || volume === "high" || volume === "med" ? volume : "med",
    snoozeMinutes: ([5, 10, 15, 30] as SnoozeMinutes[]).includes(snooze as SnoozeMinutes)
      ? (snooze as SnoozeMinutes)
      : 15,
    quietEnabled: Boolean(value?.quietEnabled),
    quietStart: normalizeTime(value?.quietStart ?? DEFAULT_REMINDER_SETTINGS.quietStart),
    quietEnd: normalizeTime(value?.quietEnd ?? DEFAULT_REMINDER_SETTINGS.quietEnd),
  };
}

export function formatReminderTime(time: string): string {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}

export function reminderDate(time: string, now = new Date()): Date {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function minutesOf(time: string): number {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  return hours * 60 + minutes;
}

export function inQuietHours(settings: ReminderSettings, now = new Date()): boolean {
  if (!settings.quietEnabled) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  const start = minutesOf(settings.quietStart);
  const end = minutesOf(settings.quietEnd);
  if (start === end) return false;
  if (start < end) return t >= start && t < end;
  return t >= start || t < end;
}

export function resolveRingtone(habit: Habit, settings: ReminderSettings): RingtoneId {
  const reminder = normalizeReminder(habit.reminder);
  return reminder.ringtone === "default" ? settings.ringtone : reminder.ringtone;
}

const VOLUME: Record<VolumeLevel, number> = { low: 0.35, med: 0.7, high: 1 };

export function dueReminders(
  habits: Habit[],
  completions: Completions,
  reminderLog: Record<string, string>,
  snoozeUntil: Record<string, number>,
  now = new Date(),
  skips: Completions = {},
): Habit[] {
  const key = todayKey(now);
  const stamp = now.getTime();
  const due: Habit[] = [];
  for (const habit of habits) {
    if (habit.paused) continue;
    const reminder = normalizeReminder(habit.reminder);
    if (!reminder.enabled) continue;
    if (!isScheduled(habit, now)) continue;
    if (isComplete(completions, habit.id, key)) continue;
    if (skips[habit.id]?.includes(key)) continue;
    if (reminderLog[habit.id] === key) continue;
    if ((snoozeUntil[habit.id] ?? 0) > stamp) continue;
    if (now < reminderDate(reminder.time, now)) continue;
    due.push(habit);
  }
  return due;
}

let audioCtx: AudioContext | null = null;
let alarmTimer: number | null = null;
let activeNodes: Array<{ stop: (when?: number) => void }> = [];

export function unlockReminderAudio() {
  if (typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
}

function playTone(
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
  activeNodes.push(osc);
}

export function playRingtone(id: RingtoneId, volume: VolumeLevel = "med") {
  if (typeof window === "undefined") return;
  unlockReminderAudio();
  if (!audioCtx) return;
  const ctx = audioCtx;
  const t0 = ctx.currentTime;
  const v = VOLUME[volume];

  if (id === "bell") {
    [523.25, 659.25, 783.99].forEach((freq, i) => playTone(freq, t0 + i * 0.11, 0.42, 0.1 * v, "sine"));
    return;
  }
  if (id === "chime") {
    [392, 523.25, 659.25, 784].forEach((freq, i) =>
      playTone(freq, t0 + i * 0.16, 0.55, 0.08 * v, "triangle"),
    );
    return;
  }
  if (id === "wood") {
    playTone(180, t0, 0.08, 0.16 * v, "square");
    playTone(90, t0 + 0.09, 0.12, 0.1 * v, "square");
    return;
  }
  if (id === "pulse") {
    playTone(880, t0, 0.18, 0.12 * v, "square");
    playTone(698, t0 + 0.22, 0.18, 0.12 * v, "square");
    playTone(880, t0 + 0.44, 0.18, 0.12 * v, "square");
    return;
  }
  playTone(220, t0, 1.1, 0.11 * v, "sine");
  playTone(330, t0 + 0.08, 0.9, 0.06 * v, "sine");
}

export function playReminderChime(ringtone: RingtoneId = "bell", volume: VolumeLevel = "med") {
  playRingtone(ringtone, volume);
}

export function startAlarmLoop(ringtone: RingtoneId, volume: VolumeLevel) {
  stopAlarmLoop();
  playRingtone(ringtone, volume);
  if (typeof window === "undefined") return;
  alarmTimer = window.setInterval(() => playRingtone(ringtone, volume), 2200);
}

export function stopAlarmLoop() {
  if (alarmTimer != null && typeof window !== "undefined") {
    window.clearInterval(alarmTimer);
    alarmTimer = null;
  }
  const ctx = audioCtx;
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const node of activeNodes) {
    try {
      node.stop(now);
    } catch {
      /* already stopped */
    }
  }
  activeNodes = [];
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showReminderNotification(habit: Habit, alarm = false) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const note = new Notification(alarm ? `Alarm · ${habit.name}` : `Time for ${habit.name}`, {
      body: alarm
        ? "This keeps going until you mark it, snooze, or stop."
        : "Keep the streak — check it off in Rite.",
      icon: "/apple-touch-icon.png",
      tag: `rite-${habit.id}`,
      silent: true,
      requireInteraction: alarm,
    });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  } catch {
    // Private mode / missing icons should not break the in-app toast.
  }
}
