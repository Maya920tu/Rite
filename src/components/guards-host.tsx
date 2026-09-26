import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { guardIsDue, placeMatches } from "@/lib/habits/guards";
import { todayKey } from "@/lib/habits/dates";
import { useHabitStore } from "@/lib/habits/store";
import { pinHint, pinRite } from "@/lib/platform/rite-lock";

export function GuardsHost() {
  const hiddenAt = useRef<number | null>(null);
  const lastPlace = useRef<string | null>(null);
  const lastDue = useRef<string>("");

  useEffect(() => {
    function onVis() {
      const state = useHabitStore.getState();
      const active = state.guards.filter((guard) => guard.enabled);
      if (document.hidden) {
        hiddenAt.current = Date.now();
        if (state.activeMode?.kind === "study") state.addModeSlip();
        return;
      }
      if (hiddenAt.current) {
        const spent = Date.now() - hiddenAt.current;
        hiddenAt.current = null;
        const key = todayKey();
        for (const guard of active) {
          if (guard.kind === "limit" || guardIsDue(guard)) {
            state.addAwayMs(guard.id, spent, key);
            const used = (state.awayLog[key]?.[guard.id] ?? 0) + spent;
            if (guard.kind === "limit" && guard.minutesPerDay > 0 && used >= guard.minutesPerDay * 60_000) {
              toast(`${guard.name} daily cap is gone`);
            }
          }
        }
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    function tick() {
      const state = useHabitStore.getState();
      if (state.activeMode) return;
      const due = state.guards.filter((guard) => guard.kind !== "place" && guardIsDue(guard));
      const stamp = due.map((guard) => guard.id).join(",");
      if (!stamp || stamp === lastDue.current) return;
      lastDue.current = stamp;
      const first = due[0];
      if (!first) return;
      if (first.autoStart) {
        const minutes =
          first.kind === "limit" && first.minutesPerDay > 0
            ? first.minutesPerDay
            : 50;
        state.startMode("study", minutes, { strict: first.strict, groupId: first.groupId });
        void pinRite().then((result) => toast(pinHint(result)));
        return;
      }
      toast(`${first.name} is in hours`, {
        action: {
          label: "Start",
          onClick: () => {
            state.startMode("study", 50, { strict: first.strict, groupId: first.groupId });
            void pinRite();
          },
        },
      });
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const enabledPlace = useHabitStore.getState().guards.some(
      (guard) => guard.enabled && guard.kind === "place" && guard.placeId,
    );
    if (!enabledPlace || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const state = useHabitStore.getState();
        if (state.activeMode) return;
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        for (const guard of state.guards) {
          if (!guard.enabled || guard.kind !== "place" || !guard.placeId) continue;
          const place = state.places.find((item) => item.id === guard.placeId);
          if (!place || !placeMatches(place, here)) continue;
          if (lastPlace.current === guard.id) return;
          lastPlace.current = guard.id;
          if (guard.autoStart) {
            state.startMode("study", 50, { strict: guard.strict, groupId: guard.groupId });
            void pinRite();
            toast(`Arrived at ${place.name}`);
            return;
          }
          toast(`At ${place.name}`, {
            action: {
              label: "Start",
              onClick: () => {
                state.startMode("study", 50, { strict: guard.strict, groupId: guard.groupId });
                void pinRite();
              },
            },
          });
        }
      },
      () => {
        /* permission denied */
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  return null;
}
