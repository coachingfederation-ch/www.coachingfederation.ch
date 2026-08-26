/**
 * Re-renders once a minute so time-derived UI (like the "live now" badge on a
 * running event) flips on and off without a reload. Returns `null` until the
 * first client tick, so SSR and hydration render identical markup.
 */
import { useEffect, useState } from "react";

export function useNowMinute(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}
