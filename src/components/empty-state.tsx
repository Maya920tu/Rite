import { useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseBackupFile } from "@/lib/habits/backup";
import { useHabitStore } from "@/lib/habits/store";

type EmptyStateProps = {
  onAdd: () => void;
  onSample: () => void;
};

export function EmptyState({ onAdd, onSample }: EmptyStateProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreBackup = useHabitStore((s) => s.restoreBackup);

  async function importFile(file: File) {
    const parsed = await parseBackupFile(file);
    if (!parsed) {
      toast("That file is not a Rite backup. Encrypted files restore from Keep with a passphrase.");
      return;
    }
    restoreBackup(parsed);
    toast("Backup restored");
  }

  return (
    <div className="stagger-in rounded-xl bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-2xl font-medium tracking-tight">No rites yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        A new install starts empty — past days are not ticked. If you uninstalled an older APK,
        restore a Keep backup. Updates that keep the same signature keep this device’s data.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button onClick={onAdd}>
          <Plus />
          New habit
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          Restore backup
        </Button>
        <Button variant="outline" onClick={onSample}>
          Load sample rites
        </Button>
      </div>
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
  );
}
