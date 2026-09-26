import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatReminderTime,
  inQuietHours,
  playRingtone,
  requestNotifyPermission,
  RINGTONE_META,
  unlockReminderAudio,
} from "@/lib/habits/remind";
import { isScheduled } from "@/lib/habits/stats";
import { useHabitStore } from "@/lib/habits/store";
import { buildBackup, downloadBackup, parseBackup } from "@/lib/habits/backup";
import { hasInstallPrompt, promptInstall } from "@/lib/platform/install";
import { canUseWebInstall, isIosSafari, isNativeShell } from "@/lib/platform/runtime";
import {
  RINGTONE_IDS,
  SNOOZE_MINUTES,
  VOLUME_LEVELS,
  type RingtoneId,
  type SnoozeMinutes,
  type VolumeLevel,
} from "@/lib/habits/types";
import { toast } from "sonner";

export function ReminderSettings() {
  const [open, setOpen] = useState(false);
  const habits = useHabitStore((s) => s.habits);
  const settings = useHabitStore((s) => s.reminderSettings);
  const patch = useHabitStore((s) => s.patchReminderSettings);
  const restoreBackup = useHabitStore((s) => s.restoreBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("denied");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, [open]);

  const upcoming = habits.filter((habit) => habit.reminder?.enabled && isScheduled(habit, new Date()));
  const quietNow = inQuietHours(settings);

  async function toggleAlerts() {
    if (settings.notifyEnabled) {
      patch({ notifyEnabled: false });
      return;
    }
    const next = await requestNotifyPermission();
    setPermission(next);
    if (next === "granted") {
      patch({ notifyEnabled: true });
      toast("Browser alerts on");
      return;
    }
    if (next === "denied") {
      toast("Alerts are blocked in the browser settings");
      return;
    }
    toast("Keep Rite open — toasts and tones still work");
  }

  function exportRites() {
    const state = useHabitStore.getState();
    downloadBackup(
      buildBackup({
        habits: state.habits,
        completions: state.completions,
        calendarView: state.calendarView,
        reminderSettings: state.reminderSettings,
        reminderLog: state.reminderLog,
        skips: state.skips,
      }),
    );
    toast("Backup saved");
  }

  async function importRites(file: File) {
    try {
      const parsed = parseBackup(JSON.parse(await file.text()));
      if (!parsed) {
        toast("That file is not a Rite backup");
        return;
      }
      restoreBackup(parsed);
      toast("Backup restored");
    } catch {
      toast("Could not read that backup");
    }
  }

  function preview(id: RingtoneId) {
    unlockReminderAudio();
    playRingtone(id, settings.volume);
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Reminder settings"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell />
        {upcoming.length > 0 ? (
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reminders</DialogTitle>
            <DialogDescription>
              Global tone and quiet hours. Each habit still picks its own time and style.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={settings.soundEnabled ? "default" : "outline"}
                onClick={() => {
                  const next = !settings.soundEnabled;
                  patch({ soundEnabled: next });
                  if (next) {
                    unlockReminderAudio();
                    playRingtone(settings.ringtone, settings.volume);
                  }
                }}
              >
                Sound {settings.soundEnabled ? "on" : "off"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={settings.notifyEnabled && permission === "granted" ? "default" : "outline"}
                onClick={() => void toggleAlerts()}
              >
                Browser alerts {settings.notifyEnabled && permission === "granted" ? "on" : "off"}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Ringtone</Label>
              <div className="flex flex-wrap gap-2">
                {RINGTONE_IDS.map((id) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={settings.ringtone === id ? "default" : "outline"}
                    onClick={() => {
                      patch({ ringtone: id });
                      preview(id);
                    }}
                  >
                    {RINGTONE_META[id].label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Volume</Label>
              <div className="flex flex-wrap gap-2">
                {VOLUME_LEVELS.map((level) => (
                  <Button
                    key={level}
                    type="button"
                    size="sm"
                    variant={settings.volume === level ? "default" : "outline"}
                    onClick={() => {
                      patch({ volume: level as VolumeLevel });
                      playRingtone(settings.ringtone, level);
                    }}
                  >
                    {level === "low" ? "Low" : level === "med" ? "Medium" : "High"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Snooze</Label>
              <div className="flex flex-wrap gap-2">
                {SNOOZE_MINUTES.map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    size="sm"
                    variant={settings.snoozeMinutes === mins ? "default" : "outline"}
                    onClick={() => patch({ snoozeMinutes: mins as SnoozeMinutes })}
                  >
                    {mins}m
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Quiet hours</Label>
              <Button
                type="button"
                size="sm"
                className="w-fit"
                variant={settings.quietEnabled ? "default" : "outline"}
                onClick={() => patch({ quietEnabled: !settings.quietEnabled })}
              >
                {settings.quietEnabled ? (quietNow ? "On · muted now" : "On") : "Off"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  value={settings.quietStart}
                  disabled={!settings.quietEnabled}
                  aria-label="Quiet hours start"
                  onChange={(event) => patch({ quietStart: event.target.value })}
                />
                <Input
                  type="time"
                  value={settings.quietEnd}
                  disabled={!settings.quietEnabled}
                  aria-label="Quiet hours end"
                  onChange={(event) => patch({ quietEnd: event.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                During quiet hours, alarms stay silent and only a toast appears.
                On a phone app build, alerts still fire after you leave the page.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>This device</Label>
              <p className="text-xs text-muted-foreground">
                Rites stay here and work offline. Export a backup before you switch phones.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={exportRites}>
                  Export backup
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  Import backup
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importRites(file);
                }}
              />
            </div>

            {canUseWebInstall() && !isNativeShell() ? (
              <div className="grid gap-2">
                <Label>Home screen</Label>
                {hasInstallPrompt() ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-fit"
                    onClick={() => void promptInstall()}
                  >
                    Install Rite
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isIosSafari()
                      ? "Share, then Add to Home Screen."
                      : "Use the browser menu to install Rite, or the banner on the home page."}
                  </p>
                )}
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <div className="grid gap-1.5">
                <Label>Today</Label>
                {upcoming.map((habit) => (
                  <p key={habit.id} className="text-sm text-muted-foreground">
                    <span className="text-foreground">{habit.name}</span>
                    <span className="ml-2 tabular-nums">{formatReminderTime(habit.reminder.time)}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
