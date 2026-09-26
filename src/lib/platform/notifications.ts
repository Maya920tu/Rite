import { normalizeReminder, normalizeTime } from "@/lib/habits/remind";
import type { Habit, ReminderSettings } from "@/lib/habits/types";
import { isNativeShell } from "./runtime";

function notifId(habitId: string, weekday: number): number {
  let hash = 17;
  const key = `${habitId}:${weekday}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 2_000_000_000) + 1;
}

/** Schedule OS local notifications when running inside the iOS/Android shell. */
export async function syncDeviceReminders(habits: Habit[], settings: ReminderSettings) {
  if (typeof window === "undefined" || !isNativeShell()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications.map((item) => item.id);
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }

    if (!settings.notifyEnabled && !settings.soundEnabled) return;

    const notifications = [];
    for (const habit of habits) {
      const reminder = normalizeReminder(habit.reminder);
      if (!reminder.enabled) continue;
      const [hour, minute] = normalizeTime(reminder.time).split(":").map(Number);
      for (const weekday of [0, 1, 2, 3, 4, 5, 6] as const) {
        if (!habit.activeDays.includes(weekday)) continue;
        notifications.push({
          id: notifId(habit.id, weekday),
          title: reminder.style === "alarm" ? `Alarm · ${habit.name}` : habit.name,
          body:
            reminder.style === "alarm"
              ? "Open Rite and keep the streak."
              : "Time to keep this rite.",
          schedule: {
            on: { weekday: weekday + 1, hour, minute },
            allowWhileIdle: true,
          },
          extra: { habitId: habit.id },
          sound: reminder.style === "quiet" ? undefined : "default",
        });
      }
    }

    if (notifications.length === 0) return;
    await LocalNotifications.schedule({ notifications });
  } catch {
    /* web preview has no native plugin */
  }
}

export async function bootNativeChrome() {
  if (typeof window === "undefined" || !isNativeShell()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#f3eee4" });
  } catch {
    /* ignore */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
}
