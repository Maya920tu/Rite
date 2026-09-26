export const HABIT_COLOR_IDS = [
  "clay",
  "forest",
  "teal",
  "slate",
  "wine",
  "dusk",
  "olive",
  "cinder",
] as const;

export type HabitColorId = (typeof HABIT_COLOR_IDS)[number];

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CalendarView = "week" | "month";

export const REMINDER_STYLES = ["notify", "alarm", "quiet"] as const;
export type ReminderStyle = (typeof REMINDER_STYLES)[number];

export const RINGTONE_IDS = ["bell", "chime", "wood", "pulse", "bowl"] as const;
export type RingtoneId = (typeof RINGTONE_IDS)[number];

export const SNOOZE_MINUTES = [5, 10, 15, 30] as const;
export type SnoozeMinutes = (typeof SNOOZE_MINUTES)[number];

export const VOLUME_LEVELS = ["low", "med", "high"] as const;
export type VolumeLevel = (typeof VOLUME_LEVELS)[number];

export type HabitReminder = {
  enabled: boolean;
  /** 24h `HH:mm` in the local timezone */
  time: string;
  style: ReminderStyle;
  ringtone: RingtoneId | "default";
};

export const DEFAULT_REMINDER: HabitReminder = {
  enabled: false,
  time: "08:00",
  style: "notify",
  ringtone: "default",
};

export type ReminderSettings = {
  soundEnabled: boolean;
  notifyEnabled: boolean;
  ringtone: RingtoneId;
  volume: VolumeLevel;
  snoozeMinutes: SnoozeMinutes;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  soundEnabled: true,
  notifyEnabled: false,
  ringtone: "bell",
  volume: "med",
  snoozeMinutes: 15,
  quietEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

export type Habit = {
  id: string;
  name: string;
  color: HabitColorId;
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay() */
  activeDays: Weekday[];
  createdAt: string;
  reminder: HabitReminder;
  paused: boolean;
};

export type Completions = Record<string, string[]>;

export type NewHabitInput = {
  name: string;
  color: HabitColorId;
  activeDays: Weekday[];
  reminder: HabitReminder;
  paused?: boolean;
};

export const RITE_MODES = ["study", "sleep"] as const;
export type RiteMode = (typeof RITE_MODES)[number];

export type ModeSession = {
  kind: RiteMode;
  startedAt: number;
  endsAt: number;
  slips: number;
  strict: boolean;
  groupId: string | null;
};

export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];

export type WeekFreeze = {
  weekKey: string;
  habitId: string;
  dateKey: string;
};

export type RiteStep = {
  id: string;
  title: string;
  seconds: number;
};

export type RiteRoutine = {
  id: string;
  name: string;
  kind: "morning" | "evening";
  steps: RiteStep[];
};

export type Pact = {
  id: string;
  name: string;
  code: string;
};

export type DayTask = {
  id: string;
  title: string;
  notes: string;
  dateKey: string;
  done: boolean;
  /** `HH:mm` or null — skipped when `done` is true */
  remindAt: string | null;
};

export function defaultRoutines(): RiteRoutine[] {
  return [
    {
      id: "morning",
      name: "Morning",
      kind: "morning",
      steps: [
        { id: "m1", title: "Sit still", seconds: 20 },
        { id: "m2", title: "Water", seconds: 20 },
        { id: "m3", title: "First rite", seconds: 40 },
      ],
    },
    {
      id: "evening",
      name: "Evening",
      kind: "evening",
      steps: [
        { id: "e1", title: "Put the phone face down", seconds: 20 },
        { id: "e2", title: "Name tomorrow’s first rite", seconds: 30 },
      ],
    },
  ];
}
