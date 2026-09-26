import { todayKey } from "./dates";
import { todayProgress, weekScore } from "./stats";
import type { Completions, Habit } from "./types";

export type PactSnapshot = {
  v: 1;
  from: string;
  date: string;
  today: { done: number; total: number };
  score: number;
  rites: { n: string; d: boolean }[];
};

export function buildPactSnapshot(
  from: string,
  habits: Habit[],
  completions: Completions,
  skips: Completions,
  now = new Date(),
): PactSnapshot {
  const key = todayKey(now);
  const today = todayProgress(habits, completions, now, skips);
  return {
    v: 1,
    from: from.trim() || "A friend",
    date: key,
    today,
    score: weekScore(habits, completions, now, skips),
    rites: habits
      .filter((habit) => !habit.paused)
      .slice(0, 8)
      .map((habit) => ({
        n: habit.name,
        d: (completions[habit.id] ?? []).includes(key),
      })),
  };
}

export function encodePact(snapshot: PactSnapshot): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodePact(raw: string): PactSnapshot | null {
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as PactSnapshot;
    if (data.v !== 1 || !data.from || !data.today) return null;
    return data;
  } catch {
    return null;
  }
}

export function pactUrl(snapshot: PactSnapshot): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin + window.location.pathname;
  return `${origin}#pact=${encodePact(snapshot)}`;
}

export function readPactHash(hash = typeof window === "undefined" ? "" : window.location.hash): PactSnapshot | null {
  if (!hash.startsWith("#pact=")) return null;
  return decodePact(hash.slice(6));
}