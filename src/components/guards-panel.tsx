import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DISTRACTORS,
  distractorName,
  groupAppNames,
  type Guard,
  type GuardKind,
} from "@/lib/habits/guards";
import { ALL_DAYS, WEEKDAYS, type Weekday } from "@/lib/habits/types";
import { useHabitStore } from "@/lib/habits/store";
import { todayKey } from "@/lib/habits/dates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY_CHIPS: { day: Weekday; label: string }[] = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

function newId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}-${Date.now()}`;
}

export function GuardsPanel({
  onStart,
}: {
  onStart: (guard: Guard) => void;
}) {
  const groups = useHabitStore((s) => s.groups);
  const guards = useHabitStore((s) => s.guards);
  const places = useHabitStore((s) => s.places);
  const awayLog = useHabitStore((s) => s.awayLog);
  const toggleGuard = useHabitStore((s) => s.toggleGuard);
  const upsertGuard = useHabitStore((s) => s.upsertGuard);
  const deleteGuard = useHabitStore((s) => s.deleteGuard);
  const toggleGroupApp = useHabitStore((s) => s.toggleGroupApp);
  const upsertPlace = useHabitStore((s) => s.upsertPlace);
  const deletePlace = useHabitStore((s) => s.deletePlace);
  const [draftKind, setDraftKind] = useState<GuardKind>("schedule");
  const [draftName, setDraftName] = useState("Focus block");
  const [draftGroup, setDraftGroup] = useState(groups[0]?.id ?? "");
  const [customApp, setCustomApp] = useState("");
  const todayAway = awayLog[todayKey()] ?? {};

  function addCustomApp(groupId: string) {
    const name = customApp.trim();
    if (!name) return;
    toggleGroupApp(groupId, name);
    setCustomApp("");
  }

  async function saveHere() {
    if (!navigator.geolocation) {
      toast("This device has no location");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const name = "Here";
        const place = {
          id: newId("plc"),
          name,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusM: 120,
        };
        upsertPlace(place);
        toast(`${name} saved · 120 m`);
      },
      () => toast("Location was blocked"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function addGuard() {
    const name = draftName.trim();
    if (!name || !draftGroup) return;
    const guard: Guard = {
      id: newId("grd"),
      name,
      groupId: draftGroup,
      kind: draftKind,
      enabled: true,
      days: draftKind === "schedule" ? WEEKDAYS : ALL_DAYS,
      start: draftKind === "schedule" ? "09:00" : "08:00",
      end: draftKind === "schedule" ? "18:00" : "22:00",
      minutesPerDay: draftKind === "limit" ? 30 : 0,
      placeId: draftKind === "place" ? (places[0]?.id ?? null) : null,
      autoStart: false,
      strict: draftKind !== "limit",
    };
    upsertGuard(guard);
    toast("Guard added");
  }

  return (
    <div className="grid gap-5">
      <p className="text-xs text-muted-foreground">
        Rite remembers which apps you mean to block, and when. The phone OS still has to enforce Instagram — Screen Time on iPhone, Digital Wellbeing on Android. Rite starts the session, counts slips, and can pin itself.
      </p>

      {groups.map((group) => (
        <div key={group.id} className="grid gap-2">
          <Label>{group.name}</Label>
          <div className="flex flex-wrap gap-1.5">
            {DISTRACTORS.map((app) => {
              const on = group.appIds.includes(app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => toggleGroupApp(group.id, app.id)}
                  className={cn(
                    "h-10 rounded-full px-3 text-sm font-medium transition-colors",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {app.name}
                </button>
              );
            })}
            {group.appIds
              .filter((id) => !DISTRACTORS.some((app) => app.id === id))
              .map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleGroupApp(group.id, id)}
                  className="h-10 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  {distractorName(id)}
                </button>
              ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={customApp}
          onChange={(event) => setCustomApp(event.target.value)}
          placeholder="Add an app name"
          aria-label="Custom app"
        />
        <Button type="button" variant="outline" onClick={() => addCustomApp(groups[0]?.id ?? "")}>
          Add to Social
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Guards</Label>
        {guards.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          guards.map((guard) => {
            const group = groups.find((item) => item.id === guard.groupId);
            const awayMin = Math.round((todayAway[guard.id] ?? 0) / 60000);
            return (
              <div key={guard.id} className="rounded-lg bg-muted/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{guard.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group?.name ?? "List"} · {guard.kind}
                      {guard.kind === "schedule" ? ` · ${guard.start}–${guard.end}` : null}
                      {guard.kind === "limit" ? ` · ${guard.minutesPerDay}m/day` : null}
                      {guard.kind === "place"
                        ? ` · ${places.find((p) => p.id === guard.placeId)?.name ?? "no place"}`
                        : null}
                      {awayMin > 0 ? ` · away ${awayMin}m today` : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {groupAppNames(group).slice(0, 6).join(", ") || "Empty list"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={guard.enabled ? "default" : "outline"}
                    onClick={() => toggleGuard(guard.id)}
                  >
                    {guard.enabled ? "On" : "Off"}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DAY_CHIPS.map((chip) => (
                    <button
                      key={`${guard.id}-${chip.day}-${chip.label}`}
                      type="button"
                      className={cn(
                        "size-8 rounded-full text-2xs font-medium",
                        guard.days.includes(chip.day)
                          ? "bg-card text-foreground shadow-card"
                          : "text-muted-foreground",
                      )}
                      onClick={() => {
                        const days = guard.days.includes(chip.day)
                          ? guard.days.filter((d) => d !== chip.day)
                          : [...guard.days, chip.day].sort((a, b) => a - b);
                        if (days.length === 0) return;
                        upsertGuard({ ...guard, days: days as Weekday[] });
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                {guard.kind === "schedule" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={guard.start}
                      aria-label={`${guard.name} start`}
                      onChange={(event) => upsertGuard({ ...guard, start: event.target.value })}
                    />
                    <Input
                      type="time"
                      value={guard.end}
                      aria-label={`${guard.name} end`}
                      onChange={(event) => upsertGuard({ ...guard, end: event.target.value })}
                    />
                  </div>
                ) : null}
                {guard.kind === "limit" ? (
                  <Input
                    className="mt-2"
                    type="number"
                    min={5}
                    max={240}
                    value={guard.minutesPerDay}
                    aria-label={`${guard.name} daily minutes`}
                    onChange={(event) =>
                      upsertGuard({ ...guard, minutesPerDay: Number(event.target.value) || 0 })
                    }
                  />
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => onStart(guard)}>
                    Start now
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => upsertGuard({ ...guard, strict: !guard.strict })}
                  >
                    {guard.strict ? "Strict" : "Soft"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => upsertGuard({ ...guard, autoStart: !guard.autoStart })}
                  >
                    {guard.autoStart ? "Auto on" : "Ask"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => deleteGuard(guard.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid gap-2">
        <Label>New guard</Label>
        <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} aria-label="Guard name" />
        <div className="flex flex-wrap gap-2">
          {(["schedule", "limit", "place"] as const).map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={draftKind === kind ? "default" : "outline"}
              onClick={() => setDraftKind(kind)}
            >
              {kind === "schedule" ? "Hours" : kind === "limit" ? "Daily cap" : "Place"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Button
              key={group.id}
              type="button"
              size="sm"
              variant={draftGroup === group.id ? "default" : "outline"}
              onClick={() => setDraftGroup(group.id)}
            >
              {group.name}
            </Button>
          ))}
        </div>
        <Button type="button" className="w-fit" onClick={addGuard}>
          Add guard
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Places</Label>
        <p className="text-xs text-muted-foreground">
          While Rite is open, a place guard can start when you are nearby. Background tracking is not available on the web.
        </p>
        {places.map((place) => (
          <div key={place.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{place.name}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => deletePlace(place.id)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => void saveHere()}>
          <MapPin className="size-3.5" />
          Save this place
        </Button>
      </div>
    </div>
  );
}
