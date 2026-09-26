import type { Completions, Habit, WeekFreeze } from "@/lib/habits/types";
import {
  bestCurrentStreak,
  freezeAvailable,
  todayProgress,
  weekProgress,
  weekScore,
} from "@/lib/habits/stats";
import { cn } from "@/lib/utils";

type StatsStripProps = {
  habits: Habit[];
  completions: Completions;
  skips?: Completions;
  freeze?: WeekFreeze | null;
};

export function StatsStrip({ habits, completions, skips, freeze }: StatsStripProps) {
  const today = todayProgress(habits, completions, new Date(), skips);
  const week = weekProgress(habits, completions, new Date(), skips);
  const streak = bestCurrentStreak(habits, completions, new Date(), skips);
  const score = weekScore(habits, completions, new Date(), skips);
  const weekPct = week.total === 0 ? 0 : Math.round((week.done / week.total) * 100);
  const todayPct = today.total === 0 ? 0 : Math.round((today.done / today.total) * 100);
  const todayDone = today.total > 0 && today.done === today.total;
  const freezeLeft = freezeAvailable(freeze);

  const items = [
    {
      label: "Today",
      value: today.total === 0 ? "—" : `${today.done}/${today.total}`,
      highlight: todayDone,
      pct: todayPct,
      bar: today.total > 0,
    },
    {
      label: freezeLeft ? "Streak" : "Frozen",
      value: streak === 0 ? "—" : `${streak}d`,
      highlight: streak >= 7,
      pct: 0,
      bar: false,
    },
    {
      label: "Score",
      value: week.total === 0 ? "—" : `${score}%`,
      highlight: score >= 80,
      pct: weekPct,
      bar: week.total > 0,
    },
  ];

  return (
    <section
      aria-label="Completion stats"
      className="stagger-in grid grid-cols-3 gap-2"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg bg-card px-3 py-3 shadow-card sm:px-4"
        >
          <p className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 font-display text-2xl font-medium leading-none tracking-tight tabular-nums",
              item.highlight ? "text-primary" : "text-foreground",
            )}
          >
            {item.value}
          </p>
          {item.bar ? (
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  item.highlight ? "bg-primary" : "bg-foreground/35",
                )}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          ) : (
            <div className="mt-2.5 h-1" aria-hidden />
          )}
        </div>
      ))}
    </section>
  );
}
