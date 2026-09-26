import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RiteRoutine } from "@/lib/habits/types";

export function RiteRunner({
  routine,
  onClose,
}: {
  routine: RiteRoutine | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(routine?.steps[0]?.seconds ?? 0);

  useEffect(() => {
    if (!routine) return;
    setIndex(0);
    setLeft(routine.steps[0]?.seconds ?? 0);
  }, [routine]);

  useEffect(() => {
    if (!routine) return;
    if (left <= 0) return;
    const timer = window.setInterval(() => setLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [routine, left, index]);

  useEffect(() => {
    if (!routine || left > 0) return;
    if (index < routine.steps.length - 1) {
      const next = index + 1;
      setIndex(next);
      setLeft(routine.steps[next]?.seconds ?? 0);
    }
  }, [left, index, routine]);

  if (!routine) return null;
  const step = routine.steps[index];
  const done = index >= routine.steps.length - 1 && left <= 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{routine.name}</p>
        <p className="mt-4 font-display text-3xl font-medium italic">
          {done ? "That’s the start." : step?.title}
        </p>
        <p className="mt-6 font-display text-6xl tabular-nums text-primary">{done ? "✓" : left}</p>
        <div className="mt-8 flex justify-center gap-2">
          {done ? (
            <Button onClick={onClose}>Back to today</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Stop
              </Button>
              <Button
                onClick={() => {
                  if (index >= routine.steps.length - 1) {
                    setLeft(0);
                    return;
                  }
                  const next = index + 1;
                  setIndex(next);
                  setLeft(routine.steps[next]?.seconds ?? 0);
                }}
              >
                Skip step
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
