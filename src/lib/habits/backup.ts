import { normalizeReminder, normalizeSettings } from "./remind";
import { todayKey } from "./dates";
import type {
  CalendarView,
  Completions,
  Habit,
  Pact,
  ReminderSettings,
  RiteRoutine,
  WeekFreeze,
  DayTask,
} from "./types";
import { DEFAULT_REMINDER_SETTINGS, defaultRoutines } from "./types";
import type { AppGroup, AwayLog, Guard, SavedPlace } from "./guards";

function pruneCompletions(completions: Completions): Completions {
  const cutoff = todayKey();
  const next: Completions = {};
  for (const [id, dates] of Object.entries(completions)) {
    next[id] = (dates ?? []).filter((key) => key <= cutoff);
  }
  return next;
}

export type RiteBackup = {
  rite: 1 | 2;
  exportedAt: string;
  habits: Habit[];
  completions: Completions;
  calendarView: CalendarView;
  reminderSettings: ReminderSettings;
  reminderLog: Record<string, string>;
  skips: Completions;
  freeze?: WeekFreeze | null;
  routines?: RiteRoutine[];
  pacts?: Pact[];
  tasks?: DayTask[];
  groups?: AppGroup[];
  guards?: Guard[];
  places?: SavedPlace[];
  awayLog?: AwayLog;
};

export function buildBackup(input: {
  habits: Habit[];
  completions: Completions;
  calendarView: CalendarView;
  reminderSettings: ReminderSettings;
  reminderLog: Record<string, string>;
  skips?: Completions;
  freeze?: WeekFreeze | null;
  routines?: RiteRoutine[];
  pacts?: Pact[];
  tasks?: DayTask[];
  groups?: AppGroup[];
  guards?: Guard[];
  places?: SavedPlace[];
  awayLog?: AwayLog;
}): RiteBackup {
  return {
    rite: 2,
    exportedAt: new Date().toISOString(),
    habits: input.habits,
    completions: input.completions,
    calendarView: input.calendarView,
    reminderSettings: input.reminderSettings,
    reminderLog: input.reminderLog,
    skips: input.skips ?? {},
    freeze: input.freeze ?? null,
    routines: input.routines ?? defaultRoutines(),
    pacts: input.pacts ?? [],
    tasks: input.tasks ?? [],
    groups: input.groups,
    guards: input.guards,
    places: input.places,
    awayLog: input.awayLog,
  };
}

export function parseBackup(value: unknown): RiteBackup | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if ((data.rite !== 1 && data.rite !== 2) || !Array.isArray(data.habits)) return null;
  const habits = (data.habits as Habit[]).map((habit) => ({
    ...habit,
    reminder: normalizeReminder(habit.reminder),
  }));
  if (habits.some((habit) => !habit.id || !habit.name)) return null;
  return {
    rite: data.rite === 2 ? 2 : 1,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
    habits,
    completions: pruneCompletions(
      data.completions && typeof data.completions === "object"
        ? (data.completions as Completions)
        : {},
    ),
    calendarView: data.calendarView === "month" ? "month" : "week",
    reminderSettings: normalizeSettings(
      (data.reminderSettings as ReminderSettings | undefined) ?? DEFAULT_REMINDER_SETTINGS,
    ),
    reminderLog:
      data.reminderLog && typeof data.reminderLog === "object"
        ? (data.reminderLog as Record<string, string>)
        : {},
    skips: pruneCompletions(
      data.skips && typeof data.skips === "object" ? (data.skips as Completions) : {},
    ),
    freeze: (data.freeze as WeekFreeze | null) ?? null,
    routines: Array.isArray(data.routines) ? (data.routines as RiteRoutine[]) : defaultRoutines(),
    pacts: Array.isArray(data.pacts) ? (data.pacts as Pact[]) : [],
    tasks: Array.isArray(data.tasks) ? (data.tasks as DayTask[]) : [],
    groups: Array.isArray(data.groups) ? (data.groups as AppGroup[]) : undefined,
    guards: Array.isArray(data.guards) ? (data.guards as Guard[]) : undefined,
    places: Array.isArray(data.places) ? (data.places as SavedPlace[]) : undefined,
    awayLog: data.awayLog && typeof data.awayLog === "object" ? (data.awayLog as AwayLog) : undefined,
  };
}

export function backupToCsv(backup: RiteBackup): string {
  const lines = ["habit,date,state"];
  for (const habit of backup.habits) {
    const done = new Set(backup.completions[habit.id] ?? []);
    const skipped = new Set(backup.skips[habit.id] ?? []);
    const dates = new Set([...done, ...skipped]);
    for (const date of [...dates].sort()) {
      const state = done.has(date) ? "done" : "skip";
      lines.push(`${csvCell(habit.name)},${date},${state}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function stampName(backup: RiteBackup, ext: string): string {
  return `rite-backup-${backup.exportedAt.slice(0, 10)}.${ext}`;
}

export function downloadText(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBackup(backup: RiteBackup) {
  downloadText(stampName(backup, "json"), JSON.stringify(backup, null, 2), "application/json");
}

export function downloadCsv(backup: RiteBackup) {
  downloadText(stampName(backup, "csv"), backupToCsv(backup), "text/csv");
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function keyFromPass(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 120_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export type EncryptedBackup = {
  rite: "enc1";
  salt: string;
  iv: string;
  data: string;
};

export async function encryptBackup(backup: RiteBackup, passphrase: string): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromPass(passphrase, salt);
  const plain = new TextEncoder().encode(JSON.stringify(backup));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, plain);
  return { rite: "enc1", salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(cipher)) };
}

export async function decryptBackup(file: EncryptedBackup, passphrase: string): Promise<RiteBackup | null> {
  try {
    const salt = b64ToBytes(file.salt);
    const iv = b64ToBytes(file.iv);
    const key = await keyFromPass(passphrase, salt);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      b64ToBytes(file.data).buffer as ArrayBuffer,
    );
    return parseBackup(JSON.parse(new TextDecoder().decode(plain)));
  } catch {
    return null;
  }
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackup {
  if (!value || typeof value !== "object") return false;
  const data = value as EncryptedBackup;
  return data.rite === "enc1" && Boolean(data.salt && data.iv && data.data);
}

export async function parseBackupFile(file: File, passphrase?: string): Promise<RiteBackup | null> {
  const text = await file.text();
  if (file.name.endsWith(".csv") || text.startsWith("habit,date,")) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (isEncryptedBackup(parsed)) {
    if (!passphrase) return null;
    return decryptBackup(parsed, passphrase);
  }
  return parseBackup(parsed);
}

export async function saveBackupFile(file: File): Promise<"share" | "picker" | "download"> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: file.name, text: "Rite encrypted backup" });
    return "share";
  }
  const picker = window as Window & {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<{ createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  };
  if (picker.showSaveFilePicker) {
    const handle = await picker.showSaveFilePicker({
      suggestedName: file.name,
      types: [
        {
          description: "Rite backup",
          accept: { "application/json": [".json", ".rite"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    return "picker";
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return "download";
}

export async function saveEncryptedToDrive(backup: RiteBackup, passphrase: string): Promise<"share" | "picker" | "download"> {
  const enc = await encryptBackup(backup, passphrase);
  const file = new File([JSON.stringify(enc)], stampName(backup, "rite.json"), {
    type: "application/json",
  });
  return saveBackupFile(file);
}
