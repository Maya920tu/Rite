import { CheckButton } from "@/components/check-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isToday } from "@/lib/habits/dates";
import { currentStreak, habitDayState } from "@/lib/habits/stats";
import type { Completions, Habit } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

type DayPanelProps = {
  date: Date | null;
  habits: Habit[];
  completions: Completions;
  skips?: Completions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (habit: Habit, dateKey: string) => void;
};

export function DayPanel({
  date,
  habits,
  completions,
  skips,
  open,
  onOpenChange,
  onToggle,
}: DayPanelProps) {
  if (!date) return null;

  const items = habits
    .map((habit) => ({
      habit,
      state: habitDayState(habit, completions, date, new Date(), skips),
      streak: currentStreak(habit, completions, new Date(), skips),
    }))
    .filter((item) => !item.state.beforeCreated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{format(date, "EEEE")}</DialogTitle>
          <DialogDescription>
            {isToday(date) ? "Today · " : null}
            {format(date, "d MMMM yyyy")}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rites on this day.</p>
        ) : (
          <ul className="grid gap-2">
            {items.map(({ habit, state, streak }) => (
              <li
                key={habit.id}
                className="flex items-center gap-3 rounded-lg bg-muted/70 px-2 py-2"
              >
                {state.scheduled && !state.future ? (
                  <CheckButton
                    done={state.done}
                    color={habit.color}
                    label={`${state.done ? "Unmark" : "Mark"} ${habit.name} for ${format(date, "d MMM")}`}
                    onToggle={() => onToggle(habit, state.key)}
                  />
                ) : (
                  <div
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-full border border-dashed border-border text-2xs font-medium uppercase tracking-wide text-muted-foreground",
                    )}
                  >
                    {state.future ? "Soon" : "Off"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium leading-snug">{habit.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                    {state.done
                      ? "Kept"
                      : state.future
                        ? "Upcoming"
                        : state.scheduled
                          ? "Open"
                          : "Not this day"}
                    {streak > 0 ? ` · ${streak}d streak` : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
