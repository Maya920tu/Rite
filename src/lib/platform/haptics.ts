import { isNativeShell } from "./runtime";

export async function tapHaptic() {
  if (typeof window === "undefined") return;
  if (isNativeShell()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch {
      /* plugin missing in web */
    }
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(12);
  }
}
