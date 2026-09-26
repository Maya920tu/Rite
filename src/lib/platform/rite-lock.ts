import { registerPlugin, WebPlugin } from "@capacitor/core";
import { isNativeShell } from "./runtime";

export type PinResult = {
  pinned: boolean;
  /** web | android | ios-screen-time | denied | error */
  reason: string;
};

export interface RiteLockPlugin {
  pin(): Promise<PinResult>;
  unpin(): Promise<void>;
  silenceNotifications(options: { on: boolean }): Promise<{ ok: boolean }>;
  openSystemFocus(): Promise<{ opened: boolean }>;
  syncWidget(options: { line: string; sub: string }): Promise<{ widgets: number }>;
  bringToFront(): Promise<{ ok: boolean }>;
}

class RiteLockWeb extends WebPlugin implements RiteLockPlugin {
  async pin(): Promise<PinResult> {
    const node = document.documentElement;
    try {
      if (node.requestFullscreen) await node.requestFullscreen();
    } catch {
      /* user gesture / iframe */
    }
    return { pinned: false, reason: "web" };
  }

  async unpin(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }

  async silenceNotifications(): Promise<{ ok: boolean }> {
    return { ok: false };
  }

  async openSystemFocus(): Promise<{ opened: boolean }> {
    return { opened: false };
  }

  async syncWidget(): Promise<{ widgets: number }> {
    return { widgets: 0 };
  }

  async bringToFront(): Promise<{ ok: boolean }> {
    return { ok: false };
  }
}

const RiteLock = registerPlugin<RiteLockPlugin>("RiteLock", {
  web: () => Promise.resolve(new RiteLockWeb()),
});

export async function pinRite(): Promise<PinResult> {
  try {
    return await RiteLock.pin();
  } catch {
    return { pinned: false, reason: "error" };
  }
}

export async function unpinRite() {
  try {
    await RiteLock.unpin();
  } catch {
    /* ignore */
  }
}

export async function silenceOsNotifications(on: boolean) {
  try {
    return await RiteLock.silenceNotifications({ on });
  } catch {
    return { ok: false };
  }
}

export async function openSystemFocus() {
  try {
    return await RiteLock.openSystemFocus();
  } catch {
    return { opened: false };
  }
}

export async function syncHomeWidget(line: string, sub: string) {
  if (!isNativeShell()) return { widgets: 0 };
  try {
    return await RiteLock.syncWidget({ line, sub });
  } catch {
    return { widgets: 0 };
  }
}

export async function bringRiteToFront() {
  if (!isNativeShell()) return { ok: false };
  try {
    return await RiteLock.bringToFront();
  } catch {
    return { ok: false };
  }
}

export function osLockCopy() {
  const native = isNativeShell();
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (android) {
    return native
      ? "Study can pin Rite to the screen so Back and Home will not switch apps until you unpin. It cannot hide Instagram by itself — pair it with Digital Wellbeing Focus, and allow only Rite."
      : "Install the Android app to pin Rite. Until then, Digital Wellbeing → Focus, allow only Rite.";
  }
  if (ios) {
    return native
      ? "Apple will not let Rite block other apps. Two real options: (1) Settings → Focus → Study, allow only Rite. (2) Settings → Accessibility → Guided Access, then triple-click to lock the phone on Rite."
      : "iPhone Focus or Guided Access is the lock. Rite cannot whitelist apps, even as an App Store build, until Apple grants a Screen Time entitlement.";
  }
  return native
    ? "This phone build can pin Rite and ask the system for Do Not Disturb. Other apps still need Screen Time or Digital Wellbeing."
    : "A website cannot lock other apps. The Android app can pin Rite. iPhone needs Focus or Guided Access.";
}

export function pinHint(result: PinResult) {
  if (result.reason === "android" && result.pinned) {
    return "Rite is pinned. Confirm the Android prompt if it appears.";
  }
  if (result.reason === "denied") {
    return "Turn on Screen pinning in Android settings, then start Study again.";
  }
  if (result.reason === "ios-screen-time") {
    return "On iPhone, start a Focus that allows only Rite, or use Guided Access.";
  }
  return "Stay in Rite. This browser cannot pin the phone.";
}
