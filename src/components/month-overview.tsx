import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { colorClasses } from "@/lib/habits/colors";
import {
  addMonths,
  format,
  isFutureDay,
  isSameMonth,
  isToday,
  monthGrid,
  startOfMonth,
  toDateKey,
} from "@/lib/habits/dates";
import { dayMarks } from "@/lib/habits/stats";
import type { Completions, Habit } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

const DAY_HEADS = ["M", "T", "W", "T", "F", "S", "S"];

type MonthOverviewProps = {
  habits: Habit[];
  completions: Completions;
  month: Date;
  onMonthChange: (next: Date) => void;
  onSelectDay: (day: Date) => void;
};

export function MonthOverview({
  habits,
  completions,
  month,
  onMonthChange,
  onSelectDay,
}: MonthOverviewProps) {
  const days = monthGrid(month);
  const monthLabel = format(month, "MMMM yyyy");
  const thisMonth = startOfMonth(new Date());
  const canGoForward = month < thisMonth;

  return (
    <section className="stagger-in rounded-xl bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-medium tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => onMonthChange(startOfMonth(addMonths(month, -1)))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => onMonthChange(startOfMonth(addMonths(month, 1)))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {DAY_HEADS.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const key = toDateKey(day);
          const marks = dayMarks(habits, completions, day);
          const future = isFutureDay(day);
          const today = isToday(day);
          const doneCount = marks.filter((m) => m.done).length;
          const total = marks.length;
          const complete = total > 0 && doneCount === total && !future;
          const clickable = inMonth && !future && total > 0;

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              aria-current={today ? "date" : undefined}
              aria-label={
                total === 0
                  ? `${format(day, "d MMMM")}`
                  : `${format(day, "d MMMM")}, ${doneCount} of ${total} kept`
              }
              onClick={() => {
                if (clickable) onSelectDay(day);
              }}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center rounded-sm text-xs tabular-nums transition-colors duration-150 touch-manipulation",
                !inMonth && "opacity-30",
                today && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                clickable && "hover:bg-muted/80",
                complete && "bg-primary hover:bg-primary",
              )}
            >
              <span
                className={cn(
                  "relative z-10 leading-none",
                  complete ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <span className="relative z-10 mt-1 flex h-2 items-center justify-center gap-0.5">
                {inMonth && total > 0
                  ? marks.slice(0, 8).map((mark) => (
                      <span
                        key={mark.id}
                        className={cn(
                          "size-1.5 rounded-full",
                          mark.done
                            ? complete
                              ? "bg-primary-foreground"
                              : colorClasses(mark.color).bg
                            : complete
                              ? "bg-primary-foreground/30"
                              : "bg-border",
                        )}
                      />
                    ))
                  : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
