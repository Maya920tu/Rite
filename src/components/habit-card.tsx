import { AlarmClock, Bell, Flame, MoreHorizontal, Pause, Pencil, Play, SkipForward, Snowflake, Trash2 } from "lucide-react";
import { CheckButton } from "@/components/check-button";
import { MonthGrid } from "@/components/month-grid";
import { WeekStrip } from "@/components/week-strip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colorClasses } from "@/lib/habits/colors";
import { startOfToday, subDays, todayKey } from "@/lib/habits/dates";
import { formatReminderTime, normalizeReminder } from "@/lib/habits/remind";
import {
  completionRate,
  createdDate,
  currentStreak,
  habitDayState,
  longestStreak,
} from "@/lib/habits/stats";
import type { CalendarView, Completions, Habit, WeekFreeze } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

export type { CalendarView };

type HabitCardProps = {
  habit: Habit;
  completions: Completions;
  skips: Completions;
  view: CalendarView;
  week: Date[];
  month: Date;
  onToggle: (dateKey: string) => void;
  onSkipToday: () => void;
  onFreezeToday: () => void;
  freeze: WeekFreeze | null;
  onPause: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function HabitCard({
  habit,
  completions,
  skips,
  view,
  week,
  month,
  onToggle,
  onSkipToday,
  onFreezeToday,
  freeze,
  onPause,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const classes = colorClasses(habit.color);
  const today = todayKey();
  const todayState = habitDayState(habit, completions, new Date(), new Date(), skips);
  const streak = currentStreak(habit, completions, new Date(), skips);
  const best = longestStreak(habit, completions, new Date(), skips);
  const rate = completionRate(habit, completions, 30, new Date(), skips);
  const reminder = normalizeReminder(habit.reminder);

  return (
    <article className="stagger-in rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        {habit.paused ? (
          <div
            className="grid size-12 shrink-0 place-items-center rounded-full border border-dashed border-border text-2xs font-medium uppercase tracking-wide text-muted-foreground"
            title="Paused"
          >
            Hold
          </div>
        ) : todayState.skipped ? (
          <button
            type="button"
            aria-label={`Unskip ${habit.name} today`}
            onClick={onSkipToday}
            className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-current text-2xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Skip
          </button>
        ) : todayState.scheduled ? (
          <CheckButton
            done={todayState.done}
            color={habit.color}
            label={`${todayState.done ? "Unmark" : "Mark"} ${habit.name} for today`}
            onToggle={() => onToggle(today)}
          />
        ) : (
          <div
            className="grid size-12 shrink-0 place-items-center rounded-full border border-dashed border-border text-2xs font-medium uppercase tracking-wide text-muted-foreground"
            title="Off today"
          >
            Off
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", classes.bg)}
                  aria-hidden
                />
                <h3 className="truncate font-medium leading-snug text-foreground">
                  {habit.name}
                  {habit.paused ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">Paused</span>
                  ) : null}
                </h3>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1">
                  {streak >= 3 ? (
                    <Flame className={cn("size-3.5", classes.text)} />
                  ) : null}
                  <span className="font-medium text-foreground">{streak}d</span>
                  streak
                </span>
                {rate.scheduled >= 7 ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{rate.rate}%</span>
                  </>
                ) : rate.scheduled > 0 ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {rate.done}/{rate.scheduled}
                    </span>
                  </>
                ) : null}
                {best > streak ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>best {best}</span>
                  </>
                ) : null}
                {reminder.enabled ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      {reminder.style === "alarm" ? (
                        <AlarmClock className="size-3.5" />
                      ) : (
                        <Bell className="size-3.5" />
                      )}
                      {formatReminderTime(reminder.time)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More for ${habit.name}`}
                  className="text-muted-foreground"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {todayState.scheduled && !habit.paused ? (
                  <DropdownMenuItem onSelect={onSkipToday}>
                    <SkipForward />
                    {todayState.skipped ? "Unskip today" : "Skip today"}
                  </DropdownMenuItem>
                ) : null}
                {todayState.scheduled && !habit.paused ? (
                  <DropdownMenuItem onSelect={onFreezeToday}>
                    <Snowflake />
                    {freeze?.habitId === habit.id && freeze.dateKey === today ? "Lift freeze" : "Freeze today"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={onPause}>
                  {habit.paused ? <Play /> : <Pause />}
                  {habit.paused ? "Resume" : "Pause"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {view === "week" ? (
          <div className="flex flex-col gap-3">
            <DaySpark habit={habit} completions={completions} skips={skips} />
            <WeekStrip
              habit={habit}
              days={week}
              completions={completions}
              skips={skips}
              onToggle={onToggle}
            />
          </div>
        ) : (
          <MonthGrid
            habit={habit}
            completions={completions}
            skips={skips}
            month={month}
            onToggle={onToggle}
          />
        )}
      </div>
    </article>
  );
}

function DaySpark({
  habit,
  completions,
  skips,
}: {
  habit: Habit;
  completions: Completions;
  skips?: Completions;
}) {
  const created = createdDate(habit);
  const elapsed = Math.floor(
    (startOfToday().getTime() - created.getTime()) / 86_400_000,
  );
  if (elapsed < 5) return null;

  const classes = colorClasses(habit.color);
  const days = Array.from({ length: 28 }, (_, i) =>
    subDays(startOfToday(), 27 - i),
  );

  return (
    <div className="flex h-3.5 gap-px" aria-hidden>
      {days.map((day) => {
        const state = habitDayState(habit, completions, day, new Date(), skips);
        return (
          <span
            key={state.key}
            className={cn(
              "h-full min-w-0 flex-1 rounded-2xs",
              state.done && classes.bg,
              state.scheduled &&
                !state.done &&
                !state.future &&
                !state.beforeCreated &&
                "bg-border",
              (!state.scheduled || state.future || state.beforeCreated) &&
                "bg-muted/60",
            )}
          />
        );
      })}
    </div>
  );
}
