import { colorClasses } from "@/lib/habits/colors";
import { format, isSameMonth, isToday, monthGrid } from "@/lib/habits/dates";
import { habitDayState } from "@/lib/habits/stats";
import type { Completions, Habit } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

const DAY_HEADS = ["M", "T", "W", "T", "F", "S", "S"];

type MonthGridProps = {
  habit: Habit;
  completions: Completions;
  skips?: Completions;
  month: Date;
  onToggle: (dateKey: string) => void;
};

export function MonthGrid({ habit, completions, skips, month, onToggle }: MonthGridProps) {
  const days = monthGrid(month);
  const classes = colorClasses(habit.color);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {DAY_HEADS.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const state = habitDayState(habit, completions, day, new Date(), skips);
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const label = format(day, "EEE d MMM");

          return (
            <button
              key={state.key}
              type="button"
              aria-pressed={state.done}
              aria-disabled={state.locked}
              aria-current={today ? "date" : undefined}
              aria-label={`${habit.name}, ${label}${state.done ? ", kept" : ""}`}
              onClick={() => {
                if (state.locked) return;
                onToggle(state.key);
              }}
              className={cn(
                "flex h-11 items-center justify-center rounded-sm text-xs font-medium tabular-nums transition-[background-color,color,transform] duration-150 ease-out touch-manipulation",
                today && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                !inMonth && "opacity-30",
                state.beforeCreated && "text-muted-foreground/30",
                !state.scheduled &&
                  !state.beforeCreated &&
                  "bg-transparent text-muted-foreground/40",
                state.scheduled &&
                  state.done &&
                  cn(classes.bg, "text-primary-foreground"),
                state.scheduled &&
                  state.skipped &&
                  !state.done &&
                  "border border-dashed border-current bg-transparent text-muted-foreground",
                state.scheduled &&
                  !state.done &&
                  !state.skipped &&
                  !state.future &&
                  !state.beforeCreated &&
                  "bg-muted text-foreground hover:bg-accent",
                state.scheduled && state.future && "bg-muted/50 text-muted-foreground",
                !state.locked && "active:scale-[0.96]",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
