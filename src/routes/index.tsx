import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { AlarmOverlay } from "@/components/alarm-overlay";
import { DayPanel } from "@/components/day-panel";
import { DayTasks } from "@/components/day-tasks";
import { EmptyState } from "@/components/empty-state";
import { HabitCard } from "@/components/habit-card";
import { HabitForm } from "@/components/habit-form";
import { InstallBanner } from "@/components/install-banner";
import { KeepPanel } from "@/components/keep-panel";
import { ModePicker, ModeSessionHost } from "@/components/mode-lock";
import { PactView } from "@/components/pact-view";
import { RiteRunner } from "@/components/rite-runner";
import { GuardsHost } from "@/components/guards-host";
import { MonthOverview } from "@/components/month-overview";
import { OfflineMark } from "@/components/offline-mark";
import { PwaHost } from "@/components/pwa-host";
import { ReminderHost } from "@/components/reminder-host";
import { ReminderSettings } from "@/components/reminder-settings";
import { StatsStrip } from "@/components/stats-strip";
import { WeekPager } from "@/components/week-strip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCalendarClock } from "@/lib/habits/clock";
import {
  addWeeks,
  format,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subDays,
  todayKey,
  weekDays,
} from "@/lib/habits/dates";
import { currentStreak, STREAK_MILESTONES, todayProgress } from "@/lib/habits/stats";
import { isSampleSeed } from "@/lib/habits/seed";
import { useHabitStore } from "@/lib/habits/store";
import { tapHaptic } from "@/lib/platform/haptics";
import type { CalendarView, Habit, NewHabitInput, RiteRoutine } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

export function Home() {
  const now = useCalendarClock();
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const skips = useHabitStore((s) => s.skips);
  const view = useHabitStore((s) => s.calendarView);
  const setView = useHabitStore((s) => s.setCalendarView);
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const skipDay = useHabitStore((s) => s.skipDay);
  const useFreeze = useHabitStore((s) => s.useFreeze);
  const freeze = useHabitStore((s) => s.freeze);
  const setPaused = useHabitStore((s) => s.setPaused);
  const dropFutureCompletions = useHabitStore((s) => s.dropFutureCompletions);
  const loadSample = useHabitStore((s) => s.loadSample);
  const resetToEmpty = useHabitStore((s) => s.resetToEmpty);
  const sampleOn = isSampleSeed(habits);

  const today = startOfToday(now);
  const dayKey = todayKey(now);

  const [weekCursor, setWeekCursor] = useState(() => startOfToday());
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [running, setRunning] = useState<RiteRoutine | null>(null);

  useEffect(() => {
    dropFutureCompletions();
    const t = startOfToday();
    setWeekCursor((prev) => {
      const prevWeek = startOfWeek(prev, { weekStartsOn: 1 }).getTime();
      const thisWeek = startOfWeek(t, { weekStartsOn: 1 }).getTime();
      const yestWeek = startOfWeek(subDays(t, 1), { weekStartsOn: 1 }).getTime();
      if (prevWeek === thisWeek || prevWeek === yestWeek) return t;
      return prev;
    });
    setMonthCursor((prev) => {
      const yest = subDays(t, 1);
      const follows =
        (prev.getMonth() === t.getMonth() && prev.getFullYear() === t.getFullYear()) ||
        (prev.getMonth() === yest.getMonth() && prev.getFullYear() === yest.getFullYear());
      return follows ? startOfMonth(t) : prev;
    });
  }, [dayKey, dropFutureCompletions]);

  const week = useMemo(() => weekDays(weekCursor), [weekCursor]);
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const viewedWeekStart = startOfWeek(weekCursor, { weekStartsOn: 1 });
  const canWeekForward = viewedWeekStart < thisWeekStart;
  const isCurrentWeek = viewedWeekStart.getTime() === thisWeekStart.getTime();
  const todayLabel = format(today, "EEEE, d MMMM");

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditing(habit);
    setFormOpen(true);
  }

  function handleSubmit(input: NewHabitInput) {
    if (editing) {
      updateHabit(editing.id, input);
      toast("Habit updated");
      return;
    }
    const id = addHabit(input);
    if (!id) {
      toast("You can keep up to 16 habits");
      return;
    }
    toast("Habit added");
  }

  function handleToggle(habit: Habit, dateKey: string) {
    void tapHaptic();
    const before = currentStreak(habit, useHabitStore.getState().completions, now, skips);
    const nowComplete = toggleCompletion(habit.id, dateKey);
    const after = currentStreak(habit, useHabitStore.getState().completions, now, useHabitStore.getState().skips);
    if (nowComplete && after > before && STREAK_MILESTONES.includes(after)) {
      toast(`${after}-day streak on ${habit.name}`);
    }
    if (nowComplete && dateKey === dayKey) {
      const state = useHabitStore.getState();
      const progress = todayProgress(state.habits, state.completions, now, state.skips);
      if (progress.total > 0 && progress.done === progress.total) {
        toast("Every rite kept today");
      }
    }
  }

  function handleDelete() {
    if (!pendingDelete) return;
    deleteHabit(pendingDelete.id);
    toast(`Removed ${pendingDelete.name}`);
    setPendingDelete(null);
  }

  return (
    <main className="min-h-dvh bg-background pb-16">
      <PwaHost />
      <ReminderHost />
      <GuardsHost />
      <AlarmOverlay />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 sm:px-6 sm:pt-12">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-3xl font-medium tracking-tight italic sm:text-4xl">
              Rite
            </p>
            <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
              {todayLabel}
              <OfflineMark />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModePicker />
            <KeepPanel onRun={setRunning} />
            <ReminderSettings />
            <div className="flex rounded-full bg-muted p-1">
              {(["week", "month"] as const satisfies readonly CalendarView[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={cn(
                    "h-10 rounded-full px-3.5 text-sm font-medium capitalize transition-colors duration-150",
                    view === id
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {id}
                </button>
              ))}
            </div>
            <Button onClick={openCreate} className="hidden sm:inline-flex">
              <Plus />
              New habit
            </Button>
            <Button
              size="icon"
              onClick={openCreate}
              className="sm:hidden"
              aria-label="New habit"
            >
              <Plus />
            </Button>
          </div>
        </header>

        <InstallBanner />
        <ModeSessionHost />

        {sampleOn ? (
          <div className="rounded-xl bg-card px-4 py-3 shadow-card">
            <p className="text-sm font-medium">These are sample rites</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Past ticks were drawn for the demo. They are not your history. Start empty, or keep
              them as a playground.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => resetToEmpty()}>
                Start empty
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast("Keeping the sample week")}>
                Keep sample
              </Button>
            </div>
          </div>
        ) : null}

        {habits.length > 0 ? (
          <StatsStrip habits={habits} completions={completions} skips={skips} freeze={freeze} />
        ) : null}

        <DayTasks dateKey={dayKey} />

        {view === "month" && habits.length > 0 ? (
          <MonthOverview
            habits={habits}
            completions={completions}
            month={monthCursor}
            onMonthChange={setMonthCursor}
            onSelectDay={setSelectedDay}
          />
        ) : null}

        {view === "week" && habits.length > 0 ? (
          <WeekPager
            days={week}
            canForward={canWeekForward}
            isCurrent={isCurrentWeek}
            onPrev={() => setWeekCursor((d) => addWeeks(d, -1))}
            onNext={() => setWeekCursor((d) => addWeeks(d, 1))}
            onToday={() => setWeekCursor(today)}
          />
        ) : null}

        {habits.length === 0 ? (
          <EmptyState onAdd={openCreate} onSample={loadSample} />
        ) : (
          <section className="flex flex-col gap-3" aria-label="Habits">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completions}
                skips={skips}
                view={view}
                week={week}
                month={monthCursor}
                onToggle={(dateKey) => handleToggle(habit, dateKey)}
                onSkipToday={() => skipDay(habit.id, dayKey)}
                onFreezeToday={() => {
                  const ok = useFreeze(habit.id, dayKey);
                  if (!ok) {
                    toast("Freeze already used this week");
                    return;
                  }
                  const next = useHabitStore.getState().freeze;
                  toast(next ? "Frozen — streak holds this week" : "Freeze lifted");
                }}
                freeze={freeze}
                onPause={() => setPaused(habit.id, !habit.paused)}
                onEdit={() => openEdit(habit)}
                onDelete={() => setPendingDelete(habit)}
              />
            ))}
          </section>
        )}
      </div>

      <RiteRunner routine={running} onClose={() => setRunning(null)} />
      <PactView />

      <HabitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        habit={editing}
        onSubmit={handleSubmit}
      />

      <DayPanel
        date={selectedDay}
        habits={habits}
        completions={completions}
        skips={skips}
        open={Boolean(selectedDay)}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
        onToggle={handleToggle}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} and its history will be removed from this device.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
