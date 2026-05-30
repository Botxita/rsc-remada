import { NextResponse } from "next/server";
import { ensureSeeded, getSurfers, getSessions, getAllTimes } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const [surfers, sessions, times] = await Promise.all([
    getSurfers(),
    getSessions(),
    getAllTimes(),
  ]);

  // Build timesMap: { surferName: { sessionName: time } }
  const timesMap: Record<string, Record<string, string>> = {};
  for (const entry of times) {
    if (!timesMap[entry.surferName]) timesMap[entry.surferName] = {};
    timesMap[entry.surferName][entry.sessionName] = entry.time;
  }

  return NextResponse.json({ surfers, sessions, timesMap });
}
