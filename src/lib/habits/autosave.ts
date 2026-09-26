import { buildBackup } from "./backup";
import { useHabitStore } from "./store";

export async function writeAutosave() {
  const state = useHabitStore.getState();
  const backup = buildBackup({
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
  const text = JSON.stringify(backup);
  try {
    localStorage.setItem("rite-autosave-v1", text);
  } catch {
    /* quota */
  }
}

export function readLocalAutosave(): string | null {
  try {
    return localStorage.getItem("rite-autosave-v1");
  } catch {
    return null;
  }
}
