import { ensureSeeded, getSurfers, getSessions, getAllTimes } from "@/lib/data";
import App from "@/components/App";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const [surfers, sessions, times] = await Promise.all([
    getSurfers(),
    getSessions(),
    getAllTimes(),
  ]);

  const timesMap: Record<string, Record<string, string>> = {};
  for (const entry of times) {
    if (!timesMap[entry.surferName]) timesMap[entry.surferName] = {};
    timesMap[entry.surferName][entry.sessionName] = entry.time;
  }

  return <App initialSurfers={surfers} initialSessions={sessions} initialTimesMap={timesMap} />;
}
