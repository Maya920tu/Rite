import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayKey } from "@/lib/habits/dates";
import { useHabitStore } from "@/lib/habits/store";
import { cn } from "@/lib/utils";

export function DayTasks({ dateKey }: { dateKey: string }) {
  const tasks = useHabitStore((s) => s.tasks);
  const addTask = useHabitStore((s) => s.addTask);
  const toggleTask = useHabitStore((s) => s.toggleTask);
  const deleteTask = useHabitStore((s) => s.deleteTask);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [date, setDate] = useState(dateKey);
  const today = tasks
    .filter((task) => task.dateKey === dateKey)
    .sort((a, b) => Number(a.done) - Number(b.done));

  function submit() {
    const id = addTask({
      title,
      notes,
      dateKey: date || dateKey,
      remindAt: remindAt || null,
    });
    if (!id) {
      toast("Give the task a name");
      return;
    }
    toast(remindAt ? "Task saved with a reminder" : "Task saved");
    setTitle("");
    setNotes("");
    setRemindAt("");
    setDate(dateKey);
    setOpen(false);
  }

  return (
    <section className="rounded-xl bg-card p-4 shadow-card" aria-label="Today’s tasks">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">Tasks</p>
          <p className="mt-1 text-sm text-muted-foreground">One-off work for a date. Not a streak.</p>
        </div>
        <Button size="icon" variant="outline" aria-label="Add a task" onClick={() => setOpen(true)}>
          <Plus />
        </Button>
      </div>
      {today.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing extra today.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {today.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <button
                type="button"
                aria-label={task.done ? `Undo ${task.title}` : `Finish ${task.title}`}
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border-2",
                  task.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                )}
              >
                <Check className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", task.done && "text-muted-foreground line-through")}>{task.title}</p>
                {task.notes ? <p className="text-xs text-muted-foreground">{task.notes}</p> : null}
                {task.remindAt && !task.done ? (
                  <p className="text-xs text-muted-foreground tabular-nums">Remind {task.remindAt}</p>
                ) : null}
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${task.title}`}
                className="text-muted-foreground"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Dated work with an optional reminder. If you tick it off first, the reminder stays quiet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="task-title">Task</Label>
              <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Call the clinic" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-notes">Notes</Label>
              <Input id="task-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional detail" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="task-date">Date</Label>
                <Input id="task-date" type="date" value={date} onChange={(event) => setDate(event.target.value || todayKey())} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="task-time">Remind</Label>
                <Input id="task-time" type="time" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={submit}>
              Save task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
