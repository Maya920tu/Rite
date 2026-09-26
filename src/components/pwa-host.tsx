import { useEffect } from "react";
import { bootNativeChrome, syncDeviceReminders } from "@/lib/platform/notifications";
import { captureInstallPrompt } from "@/lib/platform/install";
import { isNativeShell } from "@/lib/platform/runtime";
import { todayProgress } from "@/lib/habits/stats";
import { writeAutosave } from "@/lib/habits/autosave";
import { useHabitStore } from "@/lib/habits/store";
import { syncHomeWidget } from "@/lib/platform/rite-lock";

function shellUrls(): string[] {
  const urls = new Set<string>([window.location.origin + "/", window.location.href.split("#")[0]]);
  document.querySelectorAll("script[src], link[href]").forEach((node) => {
    const href = (node as HTMLScriptElement).src || (node as HTMLLinkElement).href;
    if (!href) return;
    if (href.startsWith("blob:") || href.startsWith("data:")) return;
    urls.add(href);
  });
  [
    "/favicon.svg",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/manifest.webmanifest",
  ].forEach((path) => urls.add(window.location.origin + path));
  return [...urls];
}

async function registerShell() {
  if (typeof window === "undefined" || isNativeShell()) return;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const send = () => {
      const worker = registration.active ?? navigator.serviceWorker.controller;
      worker?.postMessage({ type: "CACHE_URLS", urls: shellUrls() });
    };
    send();
    navigator.serviceWorker.addEventListener("controllerchange", send);
  } catch {
    /* preview iframes may block workers */
  }
}

export function PwaHost() {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const skips = useHabitStore((s) => s.skips);
  const settings = useHabitStore((s) => s.reminderSettings);

  useEffect(() => {
    captureInstallPrompt();
    void bootNativeChrome();
    if (import.meta.env.DEV) return;
    void registerShell();
  }, []);

  useEffect(() => {
    void syncDeviceReminders(habits, settings);
  }, [habits, settings]);

  useEffect(() => {
    const progress = todayProgress(habits, completions, new Date(), skips);
    const line = progress.total === 0 ? "No rites today" : `${progress.done}/${progress.total}`;
    void syncHomeWidget(line, "Today’s rites");
    const timer = window.setTimeout(() => {
      void writeAutosave();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [habits, completions, skips]);

  return null;
}
