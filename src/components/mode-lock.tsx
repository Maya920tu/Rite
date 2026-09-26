import { useEffect, useRef, useState } from "react";
import { BookOpen, Moon } from "lucide-react";
import { GuardsPanel } from "@/components/guards-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupAppNames, type Guard } from "@/lib/habits/guards";
import { useHabitStore } from "@/lib/habits/store";
import type { RiteMode } from "@/lib/habits/types";
import {
  bringRiteToFront,
  openSystemFocus,
  osLockCopy,
  pinHint,
  pinRite,
  silenceOsNotifications,
  unpinRite,
} from "@/lib/platform/rite-lock";
import { isNativeShell } from "@/lib/platform/runtime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STUDY_MINUTES = [25, 50, 90] as const;
const SLEEP_UNTIL = [6, 7, 8] as const;
type ModeTab = "session" | "guards" | "phone";

function minutesUntilHour(hour: number, now = new Date()) {
  const end = new Date(now);
  end.setHours(hour, 0, 0, 0);
  if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 1);
  return Math.max(1, Math.round((end.getTime() - now.getTime()) / 60_000));
}

function formatRemain(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ModePicker() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ModeTab>("session");
  const [strict, setStrict] = useState(true);
  const active = useHabitStore((s) => s.activeMode);
  const startMode = useHabitStore((s) => s.startMode);
  const endMode = useHabitStore((s) => s.endMode);
  const groups = useHabitStore((s) => s.groups);

  async function begin(kind: RiteMode, minutes: number, groupId?: string | null, forceStrict?: boolean) {
    startMode(kind, minutes, { strict: forceStrict ?? (kind === "study" && strict), groupId: groupId ?? null });
    if (kind === "study") {
      const result = await pinRite();
      toast(pinHint(result));
    }
    if (kind === "sleep") void silenceOsNotifications(true);
    setOpen(false);
  }

  function startGuard(guard: Guard) {
    const minutes = guard.kind === "limit" && guard.minutesPerDay > 0 ? guard.minutesPerDay : 50;
    void begin(guard.name.toLowerCase().includes("sleep") ? "sleep" : "study", minutes, guard.groupId, guard.strict);
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Focus modes"
        className="relative"
        onClick={() => setOpen(true)}
      >
        {active?.kind === "sleep" ? <Moon /> : <BookOpen />}
        {active ? <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" /> : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Self-control</DialogTitle>
            <DialogDescription>
              Lists and schedules live in Rite. iPhone Screen Time and Android Digital Wellbeing still do the OS lock.
            </DialogDescription>
          </DialogHeader>

          <div className="flex rounded-full bg-muted p-1">
            {([
              ["session", "Session"],
              ["guards", "Guards"],
              ["phone", "Phone"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-10 flex-1 rounded-full text-sm font-medium capitalize",
                  tab === id ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "session" ? (
            active ? (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  {active.kind === "study" ? "Study is running." : "Sleep wind-down is on."}
                  {active.strict ? " Strict — no early leave." : null}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void unpinRite();
                    void silenceOsNotifications(false);
                    endMode();
                    setOpen(false);
                  }}
                >
                  End mode
                </Button>
              </div>
            ) : (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Study</p>
                  <p className="text-xs text-muted-foreground">
                    Timer. Android app can pin Rite. Strict waits out the clock.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="w-fit"
                    variant={strict ? "default" : "outline"}
                    onClick={() => setStrict((value) => !value)}
                  >
                    {strict ? "Strict lock" : "Soft lock"}
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {STUDY_MINUTES.map((mins) => (
                      <Button key={mins} type="button" size="sm" variant="outline" onClick={() => void begin("study", mins)}>
                        {mins}m
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Sleep</p>
                  <p className="text-xs text-muted-foreground">Dims Rite and silences reminders until morning.</p>
                  <div className="flex flex-wrap gap-2">
                    {SLEEP_UNTIL.map((hour) => (
                      <Button
                        key={hour}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void begin("sleep", minutesUntilHour(hour))}
                      >
                        Until {hour}:00
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : null}

          {tab === "guards" ? <GuardsPanel onStart={startGuard} /> : null}

          {tab === "phone" ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">{osLockCopy()}</p>
              <div className="grid gap-1">
                <p className="text-sm font-medium">iPhone</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>Settings → Focus → + → name it Study.</li>
                  <li>Allowed Apps → Rite only (and Phone).</li>
                  <li>Add that Focus to Control Center. Turn it on when a guard starts.</li>
                  <li>Optional lock-to-Rite: Settings → Accessibility → Guided Access, then triple-click.</li>
                  <li>App limits: Settings → Screen Time → App Limits, match your lists.</li>
                </ol>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium">Android</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>Digital Wellbeing → Focus mode → select the same apps as your lists.</li>
                  <li>Settings → Security → Screen pinning. Start Study in Rite to pin.</li>
                  <li>Optional: Bedtime mode for the sleep guard.</li>
                </ol>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => {
                  const names = groups.flatMap((group) => groupAppNames(group));
                  const text = [...new Set(names)].join(", ");
                  if (text && navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(text);
                    toast("App list copied");
                  }
                  void openSystemFocus();
                }}
              >
                Copy lists and open system focus
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ModeSessionHost() {
  const session = useHabitStore((s) => s.activeMode);
  const groups = useHabitStore((s) => s.groups);
  const endMode = useHabitStore((s) => s.endMode);
  const addModeSlip = useHabitStore((s) => s.addModeSlip);
  const [now, setNow] = useState(() => Date.now());
  const hold = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [breakLeft, setBreakLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (Date.now() >= session.endsAt) {
      void unpinRite();
      void silenceOsNotifications(false);
      endMode();
    }
  }, [now, session, endMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("rite-sleep", session?.kind === "sleep");
    return () => document.documentElement.classList.remove("rite-sleep");
  }, [session?.kind]);

  useEffect(() => {
    if (session?.kind !== "study") return;
    let lock: WakeLockSentinel | null = null;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
      await pinRite();
      if (!isNativeShell()) return;
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", (state) => {
          if (state.isActive) return;
          addModeSlip();
          void bringRiteToFront();
          void pinRite();
        });
        remove = () => {
          void handle.remove();
        };
      } catch {
        /* web */
      }
    })();
    function onVis() {
      if (document.hidden) {
        addModeSlip();
        void bringRiteToFront();
        void pinRite();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      remove?.();
      void lock?.release();
    };
  }, [session?.kind, addModeSlip]);

  useEffect(() => {
    if (breakLeft === null) return;
    if (breakLeft <= 0) {
      void unpinRite();
      endMode();
      setBreakLeft(null);
      return;
    }
    const id = window.setTimeout(() => setBreakLeft((n) => (n == null ? null : n - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [breakLeft, endMode]);

  function startHold() {
    if (session?.strict) return;
    setHolding(true);
    hold.current = window.setTimeout(() => {
      void unpinRite();
      endMode();
      setHolding(false);
    }, 1800);
  }

  function stopHold() {
    setHolding(false);
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = null;
  }

  if (!session) return null;
  const remain = session.endsAt - now;
  const blocked = groupAppNames(groups.find((g) => g.id === session.groupId));

  if (session.kind === "sleep") {
    return (
      <div className="rounded-xl bg-card px-4 py-3 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Sleep</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatRemain(remain)} until wind-down ends
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void silenceOsNotifications(false);
              endMode();
            }}
          >
            I'm up
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-overlay grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {session.strict ? "Strict study" : "Study"}
        </p>
        <p className="mt-3 font-display text-6xl font-medium tabular-nums tracking-tight">
          {formatRemain(remain)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Stay in Rite. Recents and Home count as a slip
          {session.slips > 0 ? ` · ${session.slips}` : ""}. The phone can still
          leave unless Screen pinning and Digital Wellbeing Focus are on.
        </p>
        {blocked.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Intended block: {blocked.slice(0, 8).join(", ")}
          </p>
        ) : null}
        {session.strict ? (
          <button
            type="button"
            onClick={() => setBreakLeft((n) => n ?? 30)}
            className="mt-8 h-12 w-full rounded-md border border-border text-sm font-medium text-muted-foreground"
          >
            {breakLeft == null ? "Wait 30s to break lock" : `Breaking in ${breakLeft}s…`}
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
            onPointerLeave={stopHold}
            className={cn(
              "mt-8 h-12 w-full rounded-md border border-border text-sm font-medium text-muted-foreground transition-colors",
              holding && "bg-muted text-foreground",
            )}
          >
            {holding ? "Keep holding…" : "Hold to leave"}
          </button>
        )}
      </div>
    </div>
  );
}