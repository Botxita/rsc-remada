export function timeToSec(t: string | null | undefined): number | null {
  if (!t) return null;
  const [m, s] = t.split(":").map(Number);
  if (isNaN(m) || isNaN(s)) return null;
  return m * 60 + s;
}

export function secToTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getBestTime(
  surferName: string,
  timesMap: Record<string, Record<string, string>>
): number | null {
  const surferTimes = timesMap[surferName];
  if (!surferTimes) return null;
  let best: number | null = null;
  for (const t of Object.values(surferTimes)) {
    const sec = timeToSec(t);
    if (sec !== null && (best === null || sec < best)) best = sec;
  }
  return best;
}

export function getDelta(
  surferName: string,
  sessionName: string,
  sessions: string[],
  timesMap: Record<string, Record<string, string>>
): number | null {
  const cur = timesMap[surferName]?.[sessionName];
  if (!cur) return null;
  const curIdx = sessions.indexOf(sessionName);
  for (let i = curIdx - 1; i >= 0; i--) {
    const prev = timesMap[surferName]?.[sessions[i]];
    if (prev) return (timeToSec(cur) ?? 0) - (timeToSec(prev) ?? 0);
  }
  return null;
}
