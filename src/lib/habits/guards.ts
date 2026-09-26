import type { Weekday } from "./types";
import { ALL_DAYS, WEEKDAYS } from "./types";

export const DISTRACTORS = [
  { id: "instagram", name: "Instagram" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "x", name: "X" },
  { id: "reddit", name: "Reddit" },
  { id: "snapchat", name: "Snapchat" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "messages", name: "Messages" },
  { id: "safari", name: "Safari" },
  { id: "chrome", name: "Chrome" },
  { id: "netflix", name: "Netflix" },
  { id: "games", name: "Games" },
] as const;

export type DistractorId = (typeof DISTRACTORS)[number]["id"] | (string & {});

export type AppGroup = {
  id: string;
  name: string;
  appIds: string[];
};

export type SavedPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
};

export const GUARD_KINDS = ["schedule", "limit", "place"] as const;
export type GuardKind = (typeof GUARD_KINDS)[number];

export type Guard = {
  id: string;
  name: string;
  groupId: string;
  kind: GuardKind;
  enabled: boolean;
  days: Weekday[];
  start: string;
  end: string;
  minutesPerDay: number;
  placeId: string | null;
  autoStart: boolean;
  strict: boolean;
};

export type AwayLog = Record<string, Record<string, number>>;

export function defaultGroups(): AppGroup[] {
  return [
    { id: "grp-social", name: "Social", appIds: ["instagram", "tiktok", "x", "snapchat", "reddit"] },
    { id: "grp-video", name: "Video", appIds: ["youtube", "netflix"] },
    { id: "grp-chat", name: "Chat", appIds: ["whatsapp", "messages"] },
  ];
}

export function defaultGuards(): Guard[] {
  return [
    {
      id: "grd-study",
      name: "Deep work",
      groupId: "grp-social",
      kind: "schedule",
      enabled: false,
      days: WEEKDAYS,
      start: "09:00",
      end: "18:00",
      minutesPerDay: 0,
      placeId: null,
      autoStart: false,
      strict: true,
    },
    {
      id: "grd-sleep",
      name: "Wind-down",
      groupId: "grp-video",
      kind: "schedule",
      enabled: false,
      days: ALL_DAYS,
      start: "22:00",
      end: "07:00",
      minutesPerDay: 0,
      placeId: null,
      autoStart: false,
      strict: false,
    },
  ];
}

export function distractorName(id: string) {
  return DISTRACTORS.find((item) => item.id === id)?.name ?? id;
}

function minutesOf(stamp: string, now: Date) {
  const [h, m] = stamp.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inWindow(start: string, end: string, now: Date) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = minutesOf(start, now);
  const b = minutesOf(end, now);
  if (a === b) return true;
  if (a < b) return cur >= a && cur < b;
  return cur >= a || cur < b;
}

export function guardIsDue(guard: Guard, now = new Date()) {
  if (!guard.enabled) return false;
  const day = now.getDay() as Weekday;
  if (!guard.days.includes(day)) return false;
  if (guard.kind === "schedule") return inWindow(guard.start, guard.end, now);
  if (guard.kind === "limit") return true;
  return false;
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function placeMatches(place: SavedPlace, coords: { lat: number; lng: number }) {
  return haversineM(place, coords) <= place.radiusM;
}

export function groupAppNames(group: AppGroup | undefined) {
  if (!group) return [];
  return group.appIds.map(distractorName);
}
