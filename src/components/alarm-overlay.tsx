import { AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatReminderTime, normalizeReminder } from "@/lib/habits/remind";
import { todayKey } from "@/lib/habits/dates";
import { useHabitStore } from "@/lib/habits/store";

export function AlarmOverlay() {
  const habitId = useHabitStore((s) => s.activeAlarmId);
  const habit = useHabitStore((s) => s.habits.find((item) => item.id === habitId) ?? null);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const snoozeReminder = useHabitStore((s) => s.snoozeReminder);
  const markReminded = useHabitStore((s) => s.markReminded);
  const snoozeMinutes = useHabitStore((s) => s.reminderSettings.snoozeMinutes);

  if (!habit) return null;
  const reminder = normalizeReminder(habit.reminder);

  return (
    <div className="fixed inset-0 z-overlay grid place-items-end p-4 sm:place-items-center">
      <div className="absolute inset-0 bg-foreground/40" />
      <div
        role="alertdialog"
        aria-labelledby="rite-alarm-title"
        className="relative w-full max-w-md rounded-xl bg-card p-6 text-card-foreground shadow-card"
      >
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <AlarmClock className="size-3.5" />
          Alarm · {formatReminderTime(reminder.time)}
        </p>
        <h2 id="rite-alarm-title" className="mt-2 font-display text-2xl font-medium tracking-tight">
          {habit.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          It will keep sounding until you mark it, snooze, or stop for today.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => toggleCompletion(habit.id, todayKey())}
          >
            Mark kept
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => snoozeReminder(habit.id)}
          >
            Snooze {snoozeMinutes}m
          </Button>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full text-muted-foreground"
          onClick={() => markReminded(habit.id, todayKey())}
        >
          Stop for today
        </Button>
      </div>
    </div>
  );
}
