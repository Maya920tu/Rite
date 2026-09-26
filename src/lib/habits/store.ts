import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "./seed";
import { normalizeReminder, normalizeSettings } from "./remind";
import { defaultGroups, defaultGuards } from "./guards";
import type { AppGroup, AwayLog, Guard, SavedPlace } from "./guards";
import type {
  CalendarView,
  Completions,
  DayTask,
  Habit,
  ModeSession,
  NewHabitInput,
  Pact,
  ReminderSettings,
  RiteMode,
  RiteRoutine,
  WeekFreeze,
} from "./types";
import { DEFAULT_REMINDER_SETTINGS, defaultRoutines } from "./types";
import { isFutureDay, fromDateKey, todayKey, weekKey } from "./dates";

type HabitState = {
  habits: Habit[];
  completions: Completions;
  calendarView: CalendarView;
  reminderSettings: ReminderSettings;
  reminderLog: Record<string, string>;
  snoozeUntil: Record<string, number>;
  activeAlarmId: string | null;
  skips: Completions;
  activeMode: ModeSession | null;
  groups: AppGroup[];
  guards: Guard[];
  places: SavedPlace[];
  awayLog: AwayLog;
  freeze: WeekFreeze | null;
  routines: RiteRoutine[];
  pacts: Pact[];
  tasks: DayTask[];
  setCalendarView: (view: CalendarView) => void;
  patchReminderSettings: (patch: Partial<ReminderSettings>) => void;
  addHabit: (input: NewHabitInput) => string;
  updateHabit: (id: string, patch: NewHabitInput) => void;
  deleteHabit: (id: string) => void;
  toggleCompletion: (habitId: string, dateKey: string) => boolean;
  dropFutureCompletions: (now?: Date) => void;
  markReminded: (habitId: string, dateKey: string) => void;
  snoozeReminder: (habitId: string, minutes?: number) => void;
  setActiveAlarm: (habitId: string | null) => void;
  skipDay: (habitId: string, dateKey: string) => void;
  useFreeze: (habitId: string, dateKey: string) => boolean;
  setPaused: (habitId: string, paused: boolean) => void;
  startMode: (kind: RiteMode, minutes: number, opts?: { strict?: boolean; groupId?: string | null }) => void;
  endMode: () => void;
  addModeSlip: () => void;
  addAwayMs: (guardId: string, ms: number, dateKey?: string) => void;
  toggleGuard: (id: string) => void;
  upsertGuard: (guard: Guard) => void;
  deleteGuard: (id: string) => void;
  toggleGroupApp: (groupId: string, appId: string) => void;
  upsertPlace: (place: SavedPlace) => void;
  deletePlace: (id: string) => void;
  upsertPact: (pact: Pact) => void;
  deletePact: (id: string) => void;
  addTask: (input: { title: string; notes?: string; dateKey: string; remindAt?: string | null }) => string;
  updateTask: (id: string, patch: Partial<Pick<DayTask, "title" | "notes" | "dateKey" | "remindAt" | "done">>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  markTaskReminded: (id: string, dateKey: string) => void;
  restoreBackup: (payload: {
    habits: Habit[];
    completions: Completions;
    calendarView: CalendarView;
    reminderSettings: ReminderSettings;
    reminderLog: Record<string, string>;
    skips?: Completions;
    freeze?: WeekFreeze | null;
    routines?: RiteRoutine[];
    pacts?: Pact[];
    tasks?: DayTask[];
    groups?: AppGroup[];
    guards?: Guard[];
    places?: SavedPlace[];
    awayLog?: AwayLog;
  }) => void;
  loadSample: () => void;
  resetToEmpty: () => void;
};

type PersistedHabitState = {
  habits?: Habit[];
  completions?: Completions;
  calendarView?: CalendarView;
  soundEnabled?: boolean;
  notifyEnabled?: boolean;
  reminderSettings?: Partial<ReminderSettings>;
  reminderLog?: Record<string, string>;
  snoozeUntil?: Record<string, number>;
  skips?: Completions;
  activeMode?: ModeSession | null;
  groups?: AppGroup[];
  guards?: Guard[];
  places?: SavedPlace[];
  awayLog?: AwayLog;
  freeze?: WeekFreeze | null;
  routines?: RiteRoutine[];
  pacts?: Pact[];
  tasks?: DayTask[];
};

const MAX_HABITS = 16;

export function pruneFutureCompletions(
  completions: Completions,
  now = new Date(),
): Completions {
  const cutoff = todayKey(now);
  const next: Completions = {};
  for (const [id, dates] of Object.entries(completions)) {
    next[id] = (dates ?? []).filter((key) => key <= cutoff);
  }
  return next;
}

function withReminders(habits: Habit[]): Habit[] {
  return habits.map((habit) => ({
    ...habit,
    paused: Boolean(habit.paused),
    reminder: normalizeReminder(habit.reminder),
  }));
}

function settingsFromPersisted(state: PersistedHabitState): ReminderSettings {
  return normalizeSettings({
    ...DEFAULT_REMINDER_SETTINGS,
    ...state.reminderSettings,
    soundEnabled: state.reminderSettings?.soundEnabled ?? state.soundEnabled,
    notifyEnabled: state.reminderSettings?.notifyEnabled ?? state.notifyEnabled,
  });
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: {},
      calendarView: "week",
      reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
      reminderLog: {},
      snoozeUntil: {},
      activeAlarmId: null,
      skips: {},
      activeMode: null,
      groups: defaultGroups(),
      guards: defaultGuards(),
      places: [],
      awayLog: {},
      freeze: null,
      routines: defaultRoutines(),
      pacts: [],
      tasks: [],

      setCalendarView: (view) => set({ calendarView: view }),
      patchReminderSettings: (patch) =>
        set({
          reminderSettings: normalizeSettings({ ...get().reminderSettings, ...patch }),
        }),

      loadSample: () => {
        const next = createSeed();
        set({
          habits: next.habits,
          completions: next.completions,
          reminderLog: {},
          snoozeUntil: {},
          activeAlarmId: null,
          skips: {},
          freeze: null,
        });
      },

      resetToEmpty: () => {
        set({
          habits: [],
          completions: {},
          skips: {},
          freeze: null,
          reminderLog: {},
          snoozeUntil: {},
        });
      },

      addHabit: (input) => {
        const name = input.name.trim();
        if (!name) return "";
        const { habits } = get();
        if (habits.length >= MAX_HABITS) return "";
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `habit-${Date.now()}`;
        const habit: Habit = {
          id,
          name,
          color: input.color,
          activeDays:
            input.activeDays.length > 0 ? input.activeDays : [0, 1, 2, 3, 4, 5, 6],
          createdAt: todayKey(),
          reminder: normalizeReminder(input.reminder),
          paused: false,
        };
        set({ habits: [habit, ...habits] });
        return id;
      },

      updateHabit: (id, patch) => {
        const name = patch.name.trim();
        if (!name) return;
        set({
          habits: get().habits.map((habit) =>
            habit.id === id
              ? {
                  ...habit,
                  name,
                  color: patch.color,
                  activeDays:
                    patch.activeDays.length > 0 ? patch.activeDays : habit.activeDays,
                  reminder: normalizeReminder(patch.reminder),
                }
              : habit,
          ),
        });
      },

      deleteHabit: (id) => {
        const { habits, completions, reminderLog, snoozeUntil, activeAlarmId, skips } = get();
        const nextCompletions = { ...completions };
        const nextLog = { ...reminderLog };
        const nextSnooze = { ...snoozeUntil };
        const nextSkips = { ...skips };
        delete nextCompletions[id];
        delete nextLog[id];
        delete nextSnooze[id];
        delete nextSkips[id];
        set({
          habits: habits.filter((habit) => habit.id !== id),
          completions: nextCompletions,
          reminderLog: nextLog,
          snoozeUntil: nextSnooze,
          skips: nextSkips,
          activeAlarmId: activeAlarmId === id ? null : activeAlarmId,
        });
      },

      toggleCompletion: (habitId, dateKey) => {
        if (isFutureDay(fromDateKey(dateKey))) return false;
        const { completions, activeAlarmId, skips } = get();
        const current = new Set(completions[habitId] ?? []);
        const nowComplete = !current.has(dateKey);
        if (nowComplete) current.add(dateKey);
        else current.delete(dateKey);
        const nextSkips = { ...skips };
        if (nowComplete) {
          nextSkips[habitId] = (nextSkips[habitId] ?? []).filter((key) => key !== dateKey);
        }
        set({
          completions: {
            ...completions,
            [habitId]: [...current].sort(),
          },
          skips: nextSkips,
          activeAlarmId: nowComplete && activeAlarmId === habitId ? null : activeAlarmId,
        });
        return nowComplete;
      },

      dropFutureCompletions: (now) => {
        set({ completions: pruneFutureCompletions(get().completions, now) });
      },

      markReminded: (habitId, dateKey) => {
        const { reminderLog, activeAlarmId } = get();
        set({
          reminderLog: { ...reminderLog, [habitId]: dateKey },
          activeAlarmId: activeAlarmId === habitId ? null : activeAlarmId,
        });
      },

      snoozeReminder: (habitId, minutes) => {
        const { reminderLog, snoozeUntil, reminderSettings, activeAlarmId } = get();
        const wait = minutes ?? reminderSettings.snoozeMinutes;
        const nextLog = { ...reminderLog };
        delete nextLog[habitId];
        set({
          reminderLog: nextLog,
          snoozeUntil: {
            ...snoozeUntil,
            [habitId]: Date.now() + wait * 60 * 1000,
          },
          activeAlarmId: activeAlarmId === habitId ? null : activeAlarmId,
        });
      },

      setActiveAlarm: (habitId) => set({ activeAlarmId: habitId }),

      skipDay: (habitId, dateKey) => {
        if (isFutureDay(fromDateKey(dateKey))) return;
        const { skips, completions } = get();
        const current = new Set(skips[habitId] ?? []);
        const skipping = !current.has(dateKey);
        if (skipping) current.add(dateKey);
        else current.delete(dateKey);
        const nextCompletions = { ...completions };
        if (skipping) {
          nextCompletions[habitId] = (completions[habitId] ?? []).filter((key) => key !== dateKey);
        }
        set({
          skips: { ...skips, [habitId]: [...current].sort() },
          completions: nextCompletions,
        });
      },

      useFreeze: (habitId, dateKey) => {
        if (isFutureDay(fromDateKey(dateKey))) return false;
        const { freeze, skips, completions } = get();
        const week = weekKey();
        if (freeze && freeze.weekKey === week && freeze.habitId === habitId && freeze.dateKey === dateKey) {
          set({
            freeze: null,
            skips: {
              ...skips,
              [habitId]: (skips[habitId] ?? []).filter((key) => key !== dateKey),
            },
          });
          return true;
        }
        if (freeze && freeze.weekKey === week) return false;
        const nextSkips = new Set(skips[habitId] ?? []);
        nextSkips.add(dateKey);
        set({
          freeze: { weekKey: week, habitId, dateKey },
          skips: { ...skips, [habitId]: [...nextSkips].sort() },
          completions: {
            ...completions,
            [habitId]: (completions[habitId] ?? []).filter((key) => key !== dateKey),
          },
        });
        return true;
      },

      setPaused: (habitId, paused) => {
        set({
          habits: get().habits.map((habit) =>
            habit.id === habitId ? { ...habit, paused } : habit,
          ),
        });
      },

      startMode: (kind, minutes, opts) => {
        const now = Date.now();
        const duration = Math.max(1, Math.min(24 * 60, minutes));
        set({
          activeMode: {
            kind,
            startedAt: now,
            endsAt: now + duration * 60 * 1000,
            slips: 0,
            strict: Boolean(opts?.strict),
            groupId: opts?.groupId ?? null,
          },
        });
      },

      endMode: () => set({ activeMode: null }),

      addModeSlip: () => {
        const { activeMode } = get();
        if (!activeMode || activeMode.kind !== "study") return;
        set({ activeMode: { ...activeMode, slips: activeMode.slips + 1 } });
      },

      addAwayMs: (guardId, ms, dateKey) => {
        const key = dateKey ?? todayKey();
        const { awayLog } = get();
        const day = { ...(awayLog[key] ?? {}) };
        day[guardId] = (day[guardId] ?? 0) + Math.max(0, ms);
        set({ awayLog: { ...awayLog, [key]: day } });
      },

      toggleGuard: (id) => {
        set({
          guards: get().guards.map((guard) =>
            guard.id === id ? { ...guard, enabled: !guard.enabled } : guard,
          ),
        });
      },

      upsertGuard: (guard) => {
        const { guards } = get();
        const exists = guards.some((item) => item.id === guard.id);
        set({
          guards: exists
            ? guards.map((item) => (item.id === guard.id ? guard : item))
            : [...guards, guard],
        });
      },

      deleteGuard: (id) => {
        set({ guards: get().guards.filter((guard) => guard.id !== id) });
      },

      toggleGroupApp: (groupId, appId) => {
        set({
          groups: get().groups.map((group) => {
            if (group.id !== groupId) return group;
            const has = group.appIds.includes(appId);
            return {
              ...group,
              appIds: has ? group.appIds.filter((id) => id !== appId) : [...group.appIds, appId],
            };
          }),
        });
      },

      upsertPlace: (place) => {
        const { places } = get();
        const exists = places.some((item) => item.id === place.id);
        set({
          places: exists
            ? places.map((item) => (item.id === place.id ? place : item))
            : [...places, place],
        });
      },

      deletePlace: (id) => {
        set({
          places: get().places.filter((place) => place.id !== id),
          guards: get().guards.map((guard) =>
            guard.placeId === id ? { ...guard, placeId: null, enabled: guard.kind === "place" ? false : guard.enabled } : guard,
          ),
        });
      },

      upsertPact: (pact) => {
        const { pacts } = get();
        const exists = pacts.some((item) => item.id === pact.id);
        set({
          pacts: exists ? pacts.map((item) => (item.id === pact.id ? pact : item)) : [...pacts, pact],
        });
      },

      deletePact: (id) => set({ pacts: get().pacts.filter((pact) => pact.id !== id) }),

      addTask: (input) => {
        const title = input.title.trim();
        if (!title) return "";
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `task-${Date.now()}`;
        const task: DayTask = {
          id,
          title,
          notes: (input.notes ?? "").trim(),
          dateKey: input.dateKey,
          done: false,
          remindAt: input.remindAt ?? null,
        };
        set({ tasks: [task, ...get().tasks].slice(0, 200) });
        return id;
      },

      updateTask: (id, patch) => {
        set({
          tasks: get().tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...patch,
                  title: patch.title !== undefined ? patch.title.trim() || task.title : task.title,
                }
              : task,
          ),
        });
      },

      toggleTask: (id) => {
        set({
          tasks: get().tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
        });
      },

      deleteTask: (id) => set({ tasks: get().tasks.filter((task) => task.id !== id) }),

      markTaskReminded: (id, dateKey) => {
        set({ reminderLog: { ...get().reminderLog, [`task:${id}`]: dateKey } });
      },

      restoreBackup: (payload) => {
        set({
          habits: withReminders(payload.habits),
          completions: pruneFutureCompletions(payload.completions),
          calendarView: payload.calendarView === "month" ? "month" : "week",
          reminderSettings: normalizeSettings(payload.reminderSettings),
          reminderLog: payload.reminderLog ?? {},
          snoozeUntil: {},
          activeAlarmId: null,
          skips: pruneFutureCompletions(payload.skips ?? {}),
          groups: payload.groups?.length ? payload.groups : get().groups,
          guards: payload.guards?.length ? payload.guards : get().guards,
          places: payload.places ?? get().places,
          awayLog: payload.awayLog ?? get().awayLog,
          freeze: payload.freeze ?? get().freeze,
          routines: payload.routines?.length ? payload.routines : get().routines,
          pacts: payload.pacts ?? get().pacts,
          tasks: payload.tasks ?? get().tasks,
          activeMode: get().activeMode,
        });
      },
    }),
    {
      name: "rite-habits-v2",
      version: 10,
      migrate: (persisted) => {
        const state = persisted as PersistedHabitState;
        return {
          habits: withReminders(state.habits ?? []),
          completions: pruneFutureCompletions(state.completions ?? {}),
          calendarView: state.calendarView === "month" ? "month" : "week",
          reminderSettings: settingsFromPersisted(state),
          reminderLog: state.reminderLog ?? {},
          snoozeUntil: state.snoozeUntil ?? {},
          skips: pruneFutureCompletions(state.skips ?? {}),
          activeMode: state.activeMode
            ? {
                ...state.activeMode,
                strict: Boolean(state.activeMode.strict),
                groupId: state.activeMode.groupId ?? null,
              }
            : null,
          groups: state.groups?.length ? state.groups : defaultGroups(),
          guards: state.guards?.length ? state.guards : defaultGuards(),
          places: state.places ?? [],
          awayLog: state.awayLog ?? {},
          freeze: state.freeze ?? null,
          routines: state.routines?.length ? state.routines : defaultRoutines(),
          pacts: state.pacts ?? [],
          tasks: state.tasks ?? [],
        };
      },
      partialize: (state) => ({
        habits: state.habits,
        completions: state.completions,
        calendarView: state.calendarView,
        reminderSettings: state.reminderSettings,
        reminderLog: state.reminderLog,
        snoozeUntil: state.snoozeUntil,
        skips: state.skips,
        activeMode: state.activeMode,
        groups: state.groups,
        guards: state.guards,
        places: state.places,
        awayLog: state.awayLog,
        freeze: state.freeze,
        routines: state.routines,
        pacts: state.pacts,
        tasks: state.tasks,
      }),
    },
  ),
);
