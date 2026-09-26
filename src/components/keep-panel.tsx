import { useRef, useState } from "react";
import { Archive, Copy, Play, Share2 } from "lucide-react";
import { toast } from "sonner";
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
  buildBackup,
  downloadBackup,
  downloadCsv,
  parseBackupFile,
  saveEncryptedToDrive,
} from "@/lib/habits/backup";
import { buildPactSnapshot, pactUrl } from "@/lib/habits/pact";
import { freezeAvailable } from "@/lib/habits/stats";
import { useHabitStore } from "@/lib/habits/store";
import type { RiteRoutine } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

type Tab = "backup" | "runner" | "pact";

export function KeepPanel({
  onRun,
}: {
  onRun: (routine: RiteRoutine) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("backup");
  const [pass, setPass] = useState("");
  const [importPass, setImportPass] = useState("");
  const [partner, setPartner] = useState("A friend");
  const fileRef = useRef<HTMLInputElement>(null);
  const freeze = useHabitStore((s) => s.freeze);
  const routines = useHabitStore((s) => s.routines);
  const pacts = useHabitStore((s) => s.pacts);
  const upsertPact = useHabitStore((s) => s.upsertPact);
  const restoreBackup = useHabitStore((s) => s.restoreBackup);
  const canFreeze = freezeAvailable(freeze);

  function snapshot() {
    const state = useHabitStore.getState();
    return buildBackup({
      habits: state.habits,
      completions: state.completions,
      calendarView: state.calendarView,
      reminderSettings: state.reminderSettings,
      reminderLog: state.reminderLog,
      skips: state.skips,
      freeze: state.freeze,
      routines: state.routines,
      pacts: state.pacts,
      tasks: state.tasks,
      groups: state.groups,
      guards: state.guards,
      places: state.places,
      awayLog: state.awayLog,
    });
  }

  async function saveEncrypted() {
    if (pass.trim().length < 4) {
      toast("Pick a passphrase of at least 4 characters");
      return;
    }
    try {
      const where = await saveEncryptedToDrive(snapshot(), pass.trim());
      toast(
        where === "share"
          ? "Pick Drive, Dropbox, or Files in the share sheet"
          : where === "picker"
            ? "Saved to the folder you chose"
            : "Encrypted backup downloaded",
      );
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      toast("Could not save that backup");
    }
  }

  async function importFile(file: File) {
    const parsed = await parseBackupFile(file, importPass.trim() || undefined);
    if (!parsed) {
      toast(file.name.endsWith(".rite.json") || importPass ? "Wrong passphrase or file" : "That file is not a Rite backup");
      return;
    }
    restoreBackup(parsed);
    toast("Backup restored");
  }

  function sharePact() {
    const state = useHabitStore.getState();
    const name = partner.trim() || "A friend";
    const snap = buildPactSnapshot(name, state.habits, state.completions, state.skips);
    const url = pactUrl(snap);
    const id = crypto.randomUUID?.() ?? `pact-${Date.now()}`;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    upsertPact({ id, name, code });
    void navigator.clipboard?.writeText(url);
    if (navigator.share) {
      void navigator.share({ title: "Today’s rites", text: `${name} can see today’s list`, url }).catch(() => {});
    }
    toast("Pact link copied");
  }

  return (
    <>
      <Button variant="outline" size="icon" aria-label="Backup, runner, pact" onClick={() => setOpen(true)}>
        <Archive />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keep</DialogTitle>
            <DialogDescription>
              Encrypted backup, a timed morning/evening runner, and one person who can see today.
            </DialogDescription>
          </DialogHeader>
          <div className="flex rounded-full bg-muted p-1">
            {(["backup", "runner", "pact"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-10 flex-1 rounded-full text-sm font-medium capitalize",
                  tab === id ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {id}
              </button>
            ))}
          </div>

          {tab === "backup" ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                JSON and CSV stay on this device. Encrypted <span className="text-foreground">.rite.json</span> can go to
                Drive, Dropbox, or Files — Rite never sees your passphrase.
              </p>
              <p className="text-xs text-muted-foreground">
                Freeze this week: {canFreeze ? "still available" : "already used"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => downloadBackup(snapshot())}>
                  JSON
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => downloadCsv(snapshot())}>
                  CSV
                </Button>
              </div>
              <Label htmlFor="rite-pass">Passphrase for Drive / share</Label>
              <Input
                id="rite-pass"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(event) => setPass(event.target.value)}
                placeholder="Only you know this"
              />
              <Button type="button" onClick={() => void saveEncrypted()}>
                <Share2 />
                Encrypt and save to Drive…
              </Button>
              <Label htmlFor="rite-import-pass">Passphrase to restore</Label>
              <Input
                id="rite-import-pass"
                type="password"
                value={importPass}
                onChange={(event) => setImportPass(event.target.value)}
                placeholder="Needed for encrypted files"
              />
              <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => fileRef.current?.click()}>
                Restore backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json,.rite.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importFile(file);
                }}
              />
            </div>
          ) : null}

          {tab === "runner" ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                A short timed sequence so you start, instead of staring at the list.
              </p>
              {routines.map((routine) => (
                <div key={routine.id} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                  <div>
                    <p className="font-medium">{routine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {routine.steps.length} steps · {routine.steps.reduce((sum, step) => sum + step.seconds, 0)}s
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onRun(routine);
                    }}
                  >
                    <Play />
                    Start
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "pact" ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                One person. They get a snapshot of today — not a live feed, not a social network.
              </p>
              <Label htmlFor="pact-name">Their name</Label>
              <Input id="pact-name" value={partner} onChange={(event) => setPartner(event.target.value)} />
              <Button type="button" onClick={sharePact}>
                <Copy />
                Copy today’s pact link
              </Button>
              {pacts.length > 0 ? (
                <ul className="grid gap-1 text-sm text-muted-foreground">
                  {pacts.map((pact) => (
                    <li key={pact.id}>
                      {pact.name} · {pact.code}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
