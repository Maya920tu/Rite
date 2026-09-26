import { useEffect } from "react";
import { toast } from "sonner";
import {
  dueReminders,
  inQuietHours,
  normalizeReminder,
  playRingtone,
  resolveRingtone,
  showReminderNotification,
  startAlarmLoop,
  stopAlarmLoop,
  unlockReminderAudio,
} from "@/lib/habits/remind";
import { todayKey } from "@/lib/habits/dates";
import { useHabitStore } from "@/lib/habits/store";

export function ReminderHost() {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const reminderLog = useHabitStore((s) => s.reminderLog);
  const snoozeUntil = useHabitStore((s) => s.snoozeUntil);
  const settings = useHabitStore((s) => s.reminderSettings);
  const activeAlarmId = useHabitStore((s) => s.activeAlarmId);
  const skips = useHabitStore((s) => s.skips);
  const activeMode = useHabitStore((s) => s.activeMode);

  useEffect(() => {
    function unlock() {
      unlockReminderAudio();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!activeAlarmId) stopAlarmLoop();
  }, [activeAlarmId]);

  useEffect(() => {
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const state = useHabitStore.getState();
      const now = new Date();
      const key = todayKey(now);
      const quiet =
        inQuietHours(state.reminderSettings, now) || state.activeMode?.kind === "sleep";
      const due = dueReminders(
        state.habits,
        state.completions,
        state.reminderLog,
        state.snoozeUntil,
        now,
        state.skips,
      );

      for (const habit of due) {
        const reminder = normalizeReminder(habit.reminder);
        const tone = resolveRingtone(habit, state.reminderSettings);
        const volume = state.reminderSettings.volume;
        const alarm = reminder.style === "alarm" && !quiet;

        if (alarm) {
          if (state.activeAlarmId) continue;
          state.setActiveAlarm(habit.id);
          if (state.reminderSettings.soundEnabled) startAlarmLoop(tone, volume);
          if (state.reminderSettings.notifyEnabled) showReminderNotification(habit, true);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([180, 80, 180]);
          }
          continue;
        }

        state.markReminded(habit.id, key);
        const audible =
          reminder.style !== "quiet" && state.reminderSettings.soundEnabled && !quiet;
        if (audible) playRingtone(tone, volume);
        if (reminder.style !== "quiet" && state.reminderSettings.notifyEnabled && !quiet) {
          showReminderNotification(habit, false);
        }
        toast(`Time for ${habit.name}`, {
          description:
            reminder.style === "quiet"
              ? "Quiet reminder — mark it when you can."
              : "Keep the streak — mark it when you have.",
          duration: 14_000,
          action: {
            label: "Done",
            onClick: () => {
              useHabitStore.getState().toggleCompletion(habit.id, key);
            },
          },
          cancel: {
            label: `Snooze ${state.reminderSettings.snoozeMinutes}m`,
            onClick: () => {
              useHabitStore.getState().snoozeReminder(habit.id);
            },
          },
        });
      }

      for (const task of state.tasks) {
        if (task.done || !task.remindAt || task.dateKey !== key) continue;
        if (state.reminderLog[`task:${task.id}`] === key) continue;
        const [hours, minutes] = task.remindAt.split(":").map(Number);
        if (now.getHours() * 60 + now.getMinutes() < hours * 60 + minutes) continue;
        if (quiet) continue;
        state.markTaskReminded(task.id, key);
        if (state.reminderSettings.soundEnabled) {
          playRingtone(state.reminderSettings.ringtone, state.reminderSettings.volume);
        }
        toast(task.title, {
          description: task.notes || "Task reminder",
          duration: 14_000,
          action: {
            label: "Done",
            onClick: () => useHabitStore.getState().toggleTask(task.id),
          },
        });
      }
    }

    const start = window.setTimeout(tick, 900);
    const interval = window.setInterval(tick, 20_000);
    function onVis() {
      if (!document.hidden) tick();
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [habits, completions, reminderLog, snoozeUntil, settings, activeAlarmId, skips, activeMode]);

  return null;
}
