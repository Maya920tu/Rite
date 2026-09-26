import { useEffect, useState } from "react";
import { startOfToday, toDateKey } from "./dates";

/** Re-render at local midnight (and when the tab is focused after a date change). */
export function useCalendarClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function arm() {
      const tomorrow = startOfToday();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const wait = Math.max(250, tomorrow.getTime() - Date.now() + 50);
      timer = setTimeout(() => {
        setNow(new Date());
        arm();
      }, wait);
    }

    function sync() {
      const next = new Date();
      setNow((prev) => (toDateKey(prev) === toDateKey(next) ? prev : next));
    }

    arm();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return now;
}
