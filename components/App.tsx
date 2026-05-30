"use client";

import { useState, useRef } from "react";
import { Surfer, Session } from "@/lib/data";
import { timeToSec, secToTime, getBestTime, getDelta } from "@/lib/utils";

interface Props {
  initialSurfers: Surfer[];
  initialSessions: Session[];
  initialTimesMap: Record<string, Record<string, string>>;
}

type Tab = "tabla" | "sesion" | "ranking";

export default function App({ initialSurfers, initialSessions, initialTimesMap }: Props) {
  const [surfers, setSurfers] = useState(initialSurfers);
  const [sessions, setSessions] = useState(initialSessions);
  const [timesMap, setTimesMap] = useState(initialTimesMap);
  const [tab, setTab] = useState<Tab>("tabla");
  const [activeSession, setActiveSession] = useState<string>(
    initialSessions[initialSessions.length - 1]?.name ?? ""
  );
  const [filter, setFilter] = useState("");

  // Modal state
  const [modal, setModal] = useState<{ surferName: string; sessionName: string } | null>(null);
  const [mMin, setMMin] = useState("");
  const [mSec, setMSec] = useState("");
  const [saving, setSaving] = useState(false);

  // Add session modal
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  // Add surfer modal
  const [showAddSurfer, setShowAddSurfer] = useState(false);
  const [newSurferName, setNewSurferName] = useState("");

  const secRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);

  const sessionNames = sessions.map((s) => s.name);

  // ── Open time modal ───────────────────────────────────
  function openModal(surferName: string, sessionName: string) {
    const existing = timesMap[surferName]?.[sessionName];
    if (existing) {
      const [m, s] = existing.split(":");
      setMMin(m);
      setMSec(s);
    } else {
      setMMin("");
      setMSec("");
    }
    setModal({ surferName, sessionName });
    setTimeout(() => minRef.current?.focus(), 60);
  }

  // ── Save time ─────────────────────────────────────────
  async function saveTime() {
    if (!modal) return;
    if (!mMin && !mSec) return;
    const timeStr = `${mMin || "0"}:${String(mSec || "0").padStart(2, "0")}`;
    setSaving(true);
    try {
      await fetch("/api/times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surferName: modal.surferName, sessionName: modal.sessionName, time: timeStr }),
      });
      setTimesMap((prev) => ({
        ...prev,
        [modal.surferName]: { ...(prev[modal.surferName] ?? {}), [modal.sessionName]: timeStr },
      }));
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Clear time ────────────────────────────────────────
  async function clearTime() {
    if (!modal) return;
    setSaving(true);
    try {
      await fetch("/api/times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surferName: modal.surferName, sessionName: modal.sessionName, time: null }),
      });
      setTimesMap((prev) => {
        const next = { ...prev };
        if (next[modal.surferName]) {
          next[modal.surferName] = { ...next[modal.surferName] };
          delete next[modal.surferName][modal.sessionName];
        }
        return next;
      });
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Add session ───────────────────────────────────────
  async function addSession() {
    const name = newSessionName.trim();
    if (!name || sessionNames.includes(name)) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const session = await res.json();
    setSessions((prev) => [...prev, session]);
    setActiveSession(name);
    setNewSessionName("");
    setShowAddSession(false);
  }

  // ── Add surfer ────────────────────────────────────────
  async function addSurfer() {
    const name = newSurferName.trim();
    if (!name) return;
    const res = await fetch("/api/surfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const surfer = await res.json();
    setSurfers((prev) => [...prev, surfer]);
    setNewSurferName("");
    setShowAddSurfer(false);
  }

  // ── Computed ──────────────────────────────────────────
  const filteredSurfers = surfers.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const rankingData = surfers
    .map((s) => {
      const best = getBestTime(s.name, timesMap);
      return { ...s, best };
    })
    .filter((s) => s.best !== null)
    .sort((a, b) => (a.best ?? 0) - (b.best ?? 0));

  // ── Delta label ───────────────────────────────────────
  function DeltaLabel({ delta }: { delta: number | null }) {
    if (delta === null) return null;
    if (delta < 0)
      return <span className="text-green-600 text-xs font-semibold ml-1">▼{secToTime(Math.abs(delta))}</span>;
    if (delta > 0)
      return <span className="text-red-500 text-xs font-semibold ml-1">▲{secToTime(delta)}</span>;
    return <span className="text-gray-400 text-xs ml-1">—</span>;
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* HEADER */}
      <div className="border-b-2 border-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
              🏄 RSC Remada
            </h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase mt-0.5">Evaluación 100m</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddSurfer(true)} className="text-xs border border-gray-300 rounded-full px-3 py-1.5 font-semibold hover:border-black transition-colors">+ Surfer</button>
            <button onClick={() => setShowAddSession(true)} className="text-xs border border-gray-300 rounded-full px-3 py-1.5 font-semibold hover:border-black transition-colors">+ Sesión</button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">
        {(["tabla", "sesion", "ranking"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              tab === t ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-black"
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {t === "tabla" ? "📋 Tabla" : t === "sesion" ? "⚡ Sesión" : "🏆 Ranking"}
          </button>
        ))}
      </div>

      <div className="p-3">

        {/* ── TAB: TABLA ── */}
        {tab === "tabla" && (
          <>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar surfer..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-black transition-colors"
            />
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 sticky left-0 bg-gray-50 z-10">
                      Surfer
                    </th>
                    {sessionNames.map((s) => (
                      <th key={s} className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap text-center">
                        {s}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-gray-200 text-center whitespace-nowrap">
                      MT ★
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurfers.map((surfer, fi) => {
                    const best = getBestTime(surfer.name, timesMap);
                    return (
                      <tr key={surfer.id} className={fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className={`px-3 py-2 font-semibold text-sm border-b border-gray-100 whitespace-nowrap sticky left-0 z-10 ${fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                          {surfer.name}
                        </td>
                        {sessionNames.map((sess) => {
                          const t = timesMap[surfer.name]?.[sess];
                          const delta = getDelta(surfer.name, sess, sessionNames, timesMap);
                          const sec = t ? timeToSec(t) : null;
                          const isMT = sec !== null && sec === best;
                          return (
                            <td key={sess} className="px-1 py-2 text-center border-b border-gray-100">
                              <button
                                onClick={() => openModal(surfer.name, sess)}
                                className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold transition-all hover:scale-105 ${
                                  t
                                    ? isMT
                                      ? "bg-amber-50 border border-amber-300 text-amber-800"
                                      : "bg-gray-100 border border-gray-200 text-gray-800"
                                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-50 border border-transparent"
                                }`}
                              >
                                {t ?? "·"}
                                {t && <DeltaLabel delta={delta} />}
                                {isMT && <span className="ml-1 text-amber-500 text-xs">★</span>}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center border-b border-gray-100 font-bold text-amber-600 text-sm">
                          {best ? secToTime(best) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* MT legend */}
            <p className="text-xs text-gray-400 mt-3 px-1">
              <span className="text-amber-500 font-bold">★ MT</span> = Mejor Tiempo Personal · <span className="text-green-600 font-semibold">▼</span> mejoró · <span className="text-red-500 font-semibold">▲</span> empeoró (vs. sesión anterior)
            </p>
          </>
        )}

        {/* ── TAB: SESIÓN ── */}
        {tab === "sesion" && (
          <>
            {/* Session selector */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Sesión activa</p>
              <div className="flex flex-wrap gap-2">
                {sessionNames.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSession(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                      s === activeSession
                        ? "bg-black text-white border-black"
                        : "border-gray-300 text-gray-600 hover:border-black"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Tocá un nombre para registrar su tiempo en <strong>{activeSession}</strong>
            </p>

            <div className="flex flex-col gap-2">
              {surfers.map((surfer) => {
                const t = timesMap[surfer.name]?.[activeSession];
                const delta = getDelta(surfer.name, activeSession, sessionNames, timesMap);
                const best = getBestTime(surfer.name, timesMap);
                const sec = t ? timeToSec(t) : null;
                const isMT = sec !== null && sec === best;
                return (
                  <button
                    key={surfer.id}
                    onClick={() => openModal(surfer.name, activeSession)}
                    className={`flex items-center px-4 py-3 rounded-xl border text-left transition-all active:scale-98 ${
                      t ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <span className={`flex-1 font-semibold text-base ${t ? "text-black" : "text-gray-500"}`}>
                      {surfer.name}
                    </span>
                    {t ? (
                      <span className="flex items-center gap-1 font-bold text-base">
                        {isMT && <span className="text-amber-500 text-sm">★</span>}
                        {t}
                        <DeltaLabel delta={delta} />
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">sin tiempo</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── TAB: RANKING ── */}
        {tab === "ranking" && (
          <>
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">
              Ranking general · mejor tiempo histórico · {rankingData.length} surfers
            </p>

            {rankingData.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No hay tiempos registrados aún.</p>
            )}

            {rankingData.map((s, rank) => {
              const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;
              return (
                <div
                  key={s.id}
                  className={`flex items-center px-4 py-3 mb-2 rounded-xl border ${
                    rank === 0 ? "border-amber-300 bg-amber-50" :
                    rank === 1 ? "border-gray-300 bg-gray-50" :
                    rank === 2 ? "border-orange-200 bg-orange-50/50" :
                    "border-gray-100 bg-white"
                  }`}
                >
                  <span className="w-8 text-center font-bold text-sm text-gray-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {medal ?? `#${rank + 1}`}
                  </span>
                  <span className="flex-1 font-semibold text-base ml-2 text-black">{s.name}</span>
                  <span className={`font-bold text-lg ${rank === 0 ? "text-amber-600" : "text-black"}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {s.best ? secToTime(s.best) : "—"}
                  </span>
                </div>
              );
            })}

            <p className="text-xs text-gray-400 mt-3">
              ★ Se usa el mejor tiempo de todas las sesiones para el ranking.
            </p>
          </>
        )}
      </div>

      {/* ── MODAL: tiempo ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{modal.surferName}</p>
            <p className="text-sm text-gray-400 mb-5">{modal.sessionName} · 100m</p>

            <div className="flex items-center gap-3 mb-5 justify-center">
              <div className="flex flex-col items-center">
                <input
                  ref={minRef}
                  type="number" min={0} max={9}
                  value={mMin}
                  onChange={(e) => { setMMin(e.target.value); if (e.target.value.length >= 1) secRef.current?.focus(); }}
                  placeholder="1"
                  className="w-20 text-center text-4xl font-bold border-2 border-gray-200 rounded-xl py-2 outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
                <span className="text-xs text-gray-400 mt-1">min</span>
              </div>
              <span className="text-3xl font-bold text-gray-300 pb-4">:</span>
              <div className="flex flex-col items-center">
                <input
                  ref={secRef}
                  type="number" min={0} max={59}
                  value={mSec}
                  onChange={(e) => setMSec(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTime()}
                  placeholder="00"
                  className="w-20 text-center text-4xl font-bold border-2 border-gray-200 rounded-xl py-2 outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
                <span className="text-xs text-gray-400 mt-1">seg</span>
              </div>
            </div>

            <button
              onClick={saveTime}
              disabled={saving}
              className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2 text-base disabled:opacity-50 transition-opacity"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {timesMap[modal.surferName]?.[modal.sessionName] && (
              <button
                onClick={clearTime}
                disabled={saving}
                className="w-full border border-red-200 text-red-500 font-semibold py-2 rounded-xl mb-2 text-sm"
              >
                Borrar tiempo
              </button>
            )}

            <button
              onClick={() => setModal(null)}
              className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: nueva sesión ── */}
      {showAddSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSession(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Nueva sesión</p>
            <p className="text-sm text-gray-400 mb-4">Ej: Junio '26, Diciembre '26</p>
            <input
              autoFocus
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSession()}
              placeholder="Nombre de la sesión"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base mb-4 outline-none focus:border-black transition-colors"
            />
            <button onClick={addSession} className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Crear
            </button>
            <button onClick={() => setShowAddSession(false)} className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: nuevo surfer ── */}
      {showAddSurfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSurfer(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Nuevo surfer</p>
            <input
              autoFocus
              value={newSurferName}
              onChange={(e) => setNewSurferName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSurfer()}
              placeholder="Nombre completo"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base mb-4 outline-none focus:border-black transition-colors"
            />
            <button onClick={addSurfer} className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Agregar
            </button>
            <button onClick={() => setShowAddSurfer(false)} className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
