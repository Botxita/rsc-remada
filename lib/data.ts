import { kv } from "@vercel/kv";

export interface Surfer {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
}

export interface TimeEntry {
  surferName: string;
  sessionName: string;
  time: string; // "M:SS"
}

// ─── Keys ────────────────────────────────────────────────
const SURFERS_KEY = "rsc:surfers";
const SESSIONS_KEY = "rsc:sessions";
const TIME_KEY = (surfer: string, session: string) =>
  `rsc:time:${surfer}:${session}`;
const ALL_TIMES_KEY = "rsc:alltimes"; // set of "surfer|session" for listing

// ─── Seed data ───────────────────────────────────────────
const SEED_SURFERS = [
  "Agus Stelzer","Alejo Layus","Alfon","Anto Camponovo","Augusto Mazzuca",
  "Dawi","Ema","Flor Álvarez","Flor Caballero","Franca De Rosa","Gino",
  "Guille Lanfran","Iván Tack","Jerko Valen","Jero Berta","Joaco Salvador",
  "Juan Franco","Juanito Podestá","Lalo","Lionela","Lucas Muñoz","Magui Gaitán",
  "Maxi Carloni","Meli Balon","Meli González","Meli Gump","Nacho Saba",
  "Nestum","Pato","Pauli Galván","Pitu Rapelli","Rama Díaz","Sol Cormons",
  "Sole Acosta","Valen Perazzo","Viki Díaz","Vir Campodónico","Vitel",
];

const SEED_SESSIONS = [
  "Junio '25","Agosto '25","Mayo '26",
];

const SEED_TIMES: Record<string, Record<string, string>> = {
  "Agus Stelzer":    { "Junio '25": "1:07", "Mayo '26": "1:08" },
  "Alejo Layus":     { "Agosto '25": "1:13", "Mayo '26": "1:14" },
  "Alfon":           { "Mayo '26": "1:30" },
  "Anto Camponovo":  { "Mayo '26": "1:54" },
  "Augusto Mazzuca": { "Agosto '25": "1:28", "Mayo '26": "1:15" },
  "Dawi":            { "Junio '25": "1:28" },
  "Ema":             { "Junio '25": "1:11", "Agosto '25": "1:07", "Mayo '26": "1:06" },
  "Flor Álvarez":    { "Junio '25": "1:30", "Agosto '25": "1:30" },
  "Flor Caballero":  { "Junio '25": "1:12", "Agosto '25": "1:16" },
  "Franca De Rosa":  { "Junio '25": "1:37", "Agosto '25": "1:30", "Mayo '26": "1:21" },
  "Gino":            { "Junio '25": "1:22", "Agosto '25": "1:25" },
  "Guille Lanfran":  { "Junio '25": "1:14", "Agosto '25": "1:11", "Mayo '26": "1:14" },
  "Iván Tack":       { "Junio '25": "1:29", "Mayo '26": "1:37" },
  "Jerko Valen":     { "Agosto '25": "1:48" },
  "Jero Berta":      { "Junio '25": "1:09" },
  "Joaco Salvador":  { "Agosto '25": "1:06", "Mayo '26": "1:06" },
  "Juan Franco":     { "Agosto '25": "1:39" },
  "Juanito Podestá": { "Agosto '25": "1:20", "Mayo '26": "1:15" },
  "Lalo":            { "Junio '25": "1:35", "Agosto '25": "1:30", "Mayo '26": "1:30" },
  "Lionela":         { "Junio '25": "1:22", "Agosto '25": "1:19", "Mayo '26": "1:14" },
  "Lucas Muñoz":     { "Junio '25": "1:54", "Agosto '25": "1:31", "Mayo '26": "1:33" },
  "Magui Gaitán":    { "Junio '25": "1:34", "Agosto '25": "1:30", "Mayo '26": "1:22" },
  "Maxi Carloni":    { "Agosto '25": "1:17" },
  "Meli Balon":      { "Agosto '25": "1:48" },
  "Meli González":   { "Junio '25": "1:57", "Agosto '25": "1:45", "Mayo '26": "1:30" },
  "Meli Gump":       { "Junio '25": "1:49", "Agosto '25": "1:40" },
  "Nacho Saba":      { "Agosto '25": "1:33" },
  "Nestum":          { "Junio '25": "1:40" },
  "Pato":            { "Junio '25": "1:13", "Agosto '25": "1:10", "Mayo '26": "1:10" },
  "Pauli Galván":    { "Junio '25": "1:30", "Agosto '25": "1:34" },
  "Pitu Rapelli":    { "Junio '25": "1:47", "Agosto '25": "1:30" },
  "Rama Díaz":       { "Junio '25": "1:13", "Agosto '25": "1:14" },
  "Sol Cormons":     { "Junio '25": "1:47" },
  "Sole Acosta":     { "Junio '25": "1:39" },
  "Valen Perazzo":   { "Mayo '26": "1:44" },
  "Viki Díaz":       { "Junio '25": "1:57", "Mayo '26": "1:35" },
  "Vir Campodónico": { "Agosto '25": "1:55", "Mayo '26": "1:39" },
  "Vitel":           { "Junio '25": "1:12", "Agosto '25": "1:15", "Mayo '26": "1:16" },
};

// ─── Init / seed ─────────────────────────────────────────
export async function ensureSeeded() {
  const seeded = await kv.get<boolean>("rsc:seeded");
  if (seeded) return;

  // Surfers
  const surfers: Surfer[] = SEED_SURFERS.map((name) => ({
    id: slugify(name),
    name,
  }));
  await kv.set(SURFERS_KEY, surfers);

  // Sessions
  const sessions: Session[] = SEED_SESSIONS.map((name, i) => ({
    id: slugify(name),
    name,
    createdAt: Date.now() + i,
  }));
  await kv.set(SESSIONS_KEY, sessions);

  // Times
  const pairs: string[] = [];
  for (const [surfer, times] of Object.entries(SEED_TIMES)) {
    for (const [session, time] of Object.entries(times)) {
      await kv.set(TIME_KEY(surfer, session), time);
      pairs.push(`${surfer}|${session}`);
    }
  }
  if (pairs.length) await kv.sadd(ALL_TIMES_KEY, ...pairs);

  await kv.set("rsc:seeded", true);
}

// ─── Surfers ─────────────────────────────────────────────
export async function getSurfers(): Promise<Surfer[]> {
  return (await kv.get<Surfer[]>(SURFERS_KEY)) ?? [];
}

export async function addSurfer(name: string): Promise<Surfer> {
  const surfers = await getSurfers();
  const surfer: Surfer = { id: slugify(name), name };
  surfers.push(surfer);
  await kv.set(SURFERS_KEY, surfers);
  return surfer;
}

// ─── Sessions ────────────────────────────────────────────
export async function getSessions(): Promise<Session[]> {
  const sessions = (await kv.get<Session[]>(SESSIONS_KEY)) ?? [];
  return sessions.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addSession(name: string): Promise<Session> {
  const sessions = await getSessions();
  const session: Session = { id: slugify(name), name, createdAt: Date.now() };
  sessions.push(session);
  await kv.set(SESSIONS_KEY, sessions);
  return session;
}

// ─── Times ───────────────────────────────────────────────
export async function getAllTimes(): Promise<TimeEntry[]> {
  const pairs = await kv.smembers<string[]>(ALL_TIMES_KEY);
  if (!pairs || pairs.length === 0) return [];
  const entries: TimeEntry[] = [];
  for (const pair of pairs) {
    const [surferName, sessionName] = pair.split("|");
    const time = await kv.get<string>(TIME_KEY(surferName, sessionName));
    if (time) entries.push({ surferName, sessionName, time });
  }
  return entries;
}

export async function setTime(
  surferName: string,
  sessionName: string,
  time: string | null
): Promise<void> {
  const key = TIME_KEY(surferName, sessionName);
  const pair = `${surferName}|${sessionName}`;
  if (time === null) {
    await kv.del(key);
    await kv.srem(ALL_TIMES_KEY, pair);
  } else {
    await kv.set(key, time);
    await kv.sadd(ALL_TIMES_KEY, pair);
  }
}

// ─── Helpers ─────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_");
}
