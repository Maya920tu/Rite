import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { colorClasses } from "@/lib/habits/colors";
import { format, isToday } from "@/lib/habits/dates";
import { habitDayState } from "@/lib/habits/stats";
import type { Completions, Habit } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

type WeekStripProps = {
  habit: Habit;
  days: Date[];
  completions: Completions;
  skips?: Completions;
  onToggle: (dateKey: string) => void;
};

export function WeekStrip({ habit, days, completions, skips, onToggle }: WeekStripProps) {
  const classes = colorClasses(habit.color);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const state = habitDayState(habit, completions, day, new Date(), skips);
        const today = isToday(day);
        const label = format(day, "EEE d MMM");

        return (
          <Tooltip key={state.key}>
            <TooltipTrigger asChild>
              <button
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
                  "flex h-11 flex-col items-center justify-center rounded-sm text-xs font-medium tabular-nums transition-[background-color,color,transform] duration-150 ease-out touch-manipulation",
                  today && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                  !state.scheduled && "bg-transparent text-muted-foreground/40",
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
                <span className="text-2xs font-medium uppercase tracking-wide opacity-70">
                  {format(day, "EEEEE")}
                </span>
                <span>{format(day, "d")}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {state.future
                ? `${label} — upcoming`
                : state.beforeCreated
                  ? `${label} — before this rite began`
                  : !state.scheduled
                    ? `${label} — off day`
                    : state.done
                      ? `${label} — kept`
                      : `${label} — tap to mark`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

type WeekPagerProps = {
  days: Date[];
  canForward: boolean;
  isCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function WeekPager({
  days,
  canForward,
  isCurrent,
  onPrev,
  onNext,
  onToday,
}: WeekPagerProps) {
  const start = days[0];
  const end = days[days.length - 1];
  if (!start || !end) return null;

  const sameMonth = start.getMonth() === end.getMonth();
  const label = sameMonth
    ? `${format(start, "d")}–${format(end, "d MMM")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {!isCurrent ? (
          <Button variant="ghost" size="sm" onClick={onToday}>
            Today
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous week"
          onClick={onPrev}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next week"
          disabled={!canForward}
          onClick={onNext}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
