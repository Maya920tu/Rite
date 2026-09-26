import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HABIT_COLOR_META } from "@/lib/habits/colors";
import { normalizeReminder, requestNotifyPermission, RINGTONE_META, STYLE_META, unlockReminderAudio } from "@/lib/habits/remind";
import {
  ALL_DAYS,
  DEFAULT_REMINDER,
  HABIT_COLOR_IDS,
  REMINDER_STYLES,
  RINGTONE_IDS,
  WEEKDAYS,
  type Habit,
  type HabitColorId,
  type NewHabitInput,
  type ReminderStyle,
  type RingtoneId,
  type Weekday,
} from "@/lib/habits/types";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_LABELS: { day: Weekday; label: string }[] = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

type HabitFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
  onSubmit: (input: NewHabitInput) => void;
};

function sameDays(a: Weekday[], b: Weekday[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((d) => set.has(d));
}

export function HabitForm({ open, onOpenChange, habit, onSubmit }: HabitFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<HabitColorId>("forest");
  const [activeDays, setActiveDays] = useState<Weekday[]>(ALL_DAYS);
  const [remindOn, setRemindOn] = useState(false);
  const [remindTime, setRemindTime] = useState(DEFAULT_REMINDER.time);
  const [remindStyle, setRemindStyle] = useState<ReminderStyle>(DEFAULT_REMINDER.style);
  const [remindTone, setRemindTone] = useState<RingtoneId | "default">("default");

  useEffect(() => {
    if (!open) return;
    const reminder = normalizeReminder(habit?.reminder);
    setName(habit?.name ?? "");
    setColor(habit?.color ?? "forest");
    setActiveDays(habit?.activeDays ?? ALL_DAYS);
    setRemindOn(reminder.enabled);
    setRemindTime(reminder.time);
    setRemindStyle(reminder.style);
    setRemindTone(reminder.ringtone);
  }, [open, habit]);

  const canSave = name.trim().length > 0 && activeDays.length > 0;
  const everyDay = useMemo(() => sameDays(activeDays, ALL_DAYS), [activeDays]);
  const weekdays = useMemo(() => sameDays(activeDays, WEEKDAYS), [activeDays]);

  function toggleDay(day: Weekday) {
    setActiveDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((d) => d !== day);
      }
      return [...current, day].sort((a, b) => a - b) as Weekday[];
    });
  }

  async function handleRemindOn() {
    const next = !remindOn;
    setRemindOn(next);
    if (next) {
      unlockReminderAudio();
      await requestNotifyPermission();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      color,
      activeDays,
      reminder: {
        enabled: remindOn,
        time: remindTime,
        style: remindStyle,
        ringtone: remindTone,
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
            <DialogDescription>
              {habit
                ? "Rename it, recast its color, or change the days it counts."
                : "Give it a name you will recognize at a glance."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning stretch"
              maxLength={48}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLOR_IDS.map((id) => {
                const meta = HABIT_COLOR_META[id];
                const selected = color === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={meta.label}
                    aria-pressed={selected}
                    onClick={() => setColor(id)}
                    className={cn(
                      "size-11 rounded-full transition-transform duration-150 ease-out active:scale-[0.96]",
                      meta.classes.bg,
                      selected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                        : "opacity-80 hover:opacity-100",
                    )}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Repeats</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={everyDay ? "default" : "outline"}
                onClick={() => setActiveDays(ALL_DAYS)}
              >
                Every day
              </Button>
              <Button
                type="button"
                size="sm"
                variant={weekdays ? "default" : "outline"}
                onClick={() => setActiveDays(WEEKDAYS)}
              >
                Weekdays
              </Button>
            </div>
            <div className="mt-1 flex gap-1.5">
              {DAY_LABELS.map(({ day, label }, index) => {
                const on = activeDays.includes(day);
                return (
                  <button
                    key={`${day}-${index}`}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_NAMES[day]}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "flex h-11 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors duration-150",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Reminder</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={remindOn ? "default" : "outline"}
                onClick={() => void handleRemindOn()}
              >
                {remindOn ? "On" : "Off"}
              </Button>
            </div>
            <Input
              type="time"
              value={remindTime}
              disabled={!remindOn}
              onChange={(event) => setRemindTime(event.target.value)}
              aria-label="Reminder time"
            />
            <div className="flex flex-wrap gap-2">
              {REMINDER_STYLES.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  disabled={!remindOn}
                  variant={remindStyle === id ? "default" : "outline"}
                  onClick={() => setRemindStyle(id)}
                >
                  {STYLE_META[id].label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{STYLE_META[remindStyle].hint}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!remindOn || remindStyle === "quiet"}
                variant={remindTone === "default" ? "default" : "outline"}
                onClick={() => setRemindTone("default")}
              >
                Default tone
              </Button>
              {RINGTONE_IDS.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  disabled={!remindOn || remindStyle === "quiet"}
                  variant={remindTone === id ? "default" : "outline"}
                  onClick={() => {
                    setRemindTone(id);
                    unlockReminderAudio();
                  }}
                >
                  {RINGTONE_META[id].label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Fires on scheduled days while Rite is open. Skips if already kept.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {habit ? "Save changes" : "Add habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
