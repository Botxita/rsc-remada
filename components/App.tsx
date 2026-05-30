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
  const [saving, setSaving] = useState(false);

  // Time modal (sesión only)
  const [modal, setModal] = useState<{ surferName: string; sessionName: string } | null>(null);
  const [mMin, setMMin] = useState("");
  const [mSec, setMSec] = useState("");

  // Add session modal
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  // Add surfer modal
  const [showAddSurfer, setShowAddSurfer] = useState(false);
  const [newSurferName, setNewSurferName] = useState("");

  // Delete surfer modal
  const [showDeleteSurfer, setShowDeleteSurfer] = useState(false);
  const [deleteFilter, setDeleteFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Rename surfer modal
  const [renamingSurfer, setRenamingSurfer] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

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
      setMMin("1");
      setMSec("00");
    }
    setModal({ surferName, sessionName });
    setTimeout(() => secRef.current?.select(), 60);
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

  // ── Delete surfer ─────────────────────────────────────
  async function deleteSurfer(name: string) {
    setSaving(true);
    try {
      await fetch("/api/surfers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setSurfers((prev) => prev.filter((s) => s.name !== name));
      setTimesMap((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setConfirmDelete(null);
      setShowDeleteSurfer(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Rename surfer ─────────────────────────────────────
  async function renameSurfer() {
    if (!renamingSurfer || !renameVal.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/surfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: renamingSurfer, newName: renameVal.trim() }),
      });
      const newName = renameVal.trim();
      setSurfers((prev) => prev.map((s) => s.name === renamingSurfer ? { ...s, name: newName } : s));
      setTimesMap((prev) => {
        const next = { ...prev };
        if (next[renamingSurfer]) {
          next[newName] = next[renamingSurfer];
          delete next[renamingSurfer];
        }
        return next;
      });
      setRenamingSurfer(null);
      setRenameVal("");
    } finally {
      setSaving(false);
    }
  }

  // ── Computed ──────────────────────────────────────────
  const sortedSurfers = [...surfers].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const filteredSurfers = sortedSurfers.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const rankingData = surfers
    .map((s) => {
      const best = getBestTime(s.name, timesMap);
      return { ...s, best };
    })
    .filter((s) => s.best !== null)
    .sort((a, b) => (a.best ?? 0) - (b.best ?? 0))
    .map((s, i, arr) => {
      // Tied position: same time = same rank
      const pos = arr.findIndex((x) => x.best === s.best) + 1;
      return { ...s, pos };
    });

  const filteredForDelete = surfers.filter((s) =>
    s.name.toLowerCase().includes(deleteFilter.toLowerCase())
  );

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
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
          🏄 RSC Remada
        </h1>
        <p className="text-xs text-gray-500 tracking-widest uppercase mt-0.5">Evaluación 100m</p>
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

        {/* ── TAB: TABLA (solo lectura) ── */}
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
                        <td className={`px-3 py-2 font-semibold text-sm border-b border-gray-100 whitespace-nowrap sticky left-0 z-10 text-black ${fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                          {surfer.name}
                        </td>
                        {sessionNames.map((sess) => {
                          const t = timesMap[surfer.name]?.[sess];
                          const delta = getDelta(surfer.name, sess, sessionNames, timesMap);
                          const sec = t ? timeToSec(t) : null;
                          const isMT = sec !== null && sec === best;
                          return (
                            <td key={sess} className="px-1 py-2 text-center border-b border-gray-100">
                              {t ? (
                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                                  isMT ? "bg-amber-50 border border-amber-300 text-amber-800" : "bg-gray-100 border border-gray-200 text-gray-800"
                                }`}>
                                  {t}
                                  <DeltaLabel delta={delta} />
                                  {isMT && <span className="ml-1 text-amber-500 text-xs">★</span>}
                                </span>
                              ) : (
                                <span className="text-gray-200 text-xs">·</span>
                              )}
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
            <p className="text-xs text-gray-400 mt-3 px-1">
              <span className="text-amber-500 font-bold">★ MT</span> = Mejor Tiempo Personal · <span className="text-green-600 font-semibold">▼</span> mejoró · <span className="text-red-500 font-semibold">▲</span> empeoró (vs. sesión anterior)
            </p>
          </>
        )}

        {/* ── TAB: SESIÓN ── */}
        {tab === "sesion" && (
          <>
            {/* 3 action buttons */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowAddSession(true)}
                className="flex-1 py-2.5 border-2 border-black rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-black hover:text-white transition-all"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                + Sesión
              </button>
              <button onClick={() => setShowAddSurfer(true)}
                className="flex-1 py-2.5 border-2 border-black rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-black hover:text-white transition-all"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                + Surfer
              </button>
              <button onClick={() => { setDeleteFilter(""); setConfirmDelete(null); setShowDeleteSurfer(true); }}
                className="flex-1 py-2.5 border-2 border-red-300 text-red-500 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                − Surfer
              </button>
            </div>

            {/* Session selector */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Sesión activa</p>
              <div className="flex flex-wrap gap-2">
                {sessionNames.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSession(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                      s === activeSession ? "bg-black text-white border-black" : "border-gray-300 text-gray-600 hover:border-black"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Surfer list — names only, tap to register time */}
            <div className="flex flex-col gap-2">
              {surfers.map((surfer) => {
                const hasTime = !!timesMap[surfer.name]?.[activeSession];
                return (
                  <div key={surfer.id} className="flex items-center gap-2">
                    {/* Name tap → rename */}
                    <button
                      onClick={() => { setRenamingSurfer(surfer.name); setRenameVal(surfer.name); }}
                      className="text-left px-3 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm font-medium hover:border-gray-300 transition-all min-w-0 flex-shrink-0"
                      style={{ maxWidth: 36 }}
                      title="Editar nombre"
                    >
                      ✏️
                    </button>
                    {/* Time tap → register */}
                    <button
                      onClick={() => openModal(surfer.name, activeSession)}
                      className={`flex-1 flex items-center px-4 py-3 rounded-xl border text-left transition-all ${
                        hasTime ? "border-black bg-white" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span className={`flex-1 font-semibold text-base ${hasTime ? "text-black" : "text-gray-400"}`}>
                        {surfer.name}
                      </span>
                      <span className={`text-xs font-medium ${hasTime ? "text-green-600" : "text-gray-300"}`}>
                        {hasTime ? "✓ registrado" : "tap para registrar"}
                      </span>
                    </button>
                  </div>
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
            {rankingData.map((s) => {
              const p = s.pos;
              const medal = p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : null;
              return (
                <div key={s.id} className={`flex items-center px-4 py-3 mb-2 rounded-xl border ${
                  p === 1 ? "border-amber-300 bg-amber-50" :
                  p === 2 ? "border-gray-300 bg-gray-50" :
                  p === 3 ? "border-orange-200 bg-orange-50/50" :
                  "border-gray-100 bg-white"
                }`}>
                  <span className="w-10 text-center font-bold text-sm text-gray-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {medal ?? `#${p}`}
                  </span>
                  <span className="flex-1 font-semibold text-base ml-2 text-black">{s.name}</span>
                  <span className={`font-bold text-lg ${p === 1 ? "text-amber-600" : "text-black"}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {s.best ? secToTime(s.best) : "—"}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 mt-3">★ MT = mejor tiempo de todas las sesiones.</p>
          </>
        )}
      </div>

      {/* ── MODAL: registrar/editar tiempo ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{modal.surferName}</p>
            <p className="text-sm text-gray-400 mb-5">{modal.sessionName} · 100m</p>
            <div className="flex items-center gap-3 mb-5 justify-center">
              <div className="flex flex-col items-center">
                <input ref={minRef} type="number" min={0} max={9} value={mMin}
                  onChange={(e) => { setMMin(e.target.value); if (e.target.value.length >= 1) secRef.current?.focus(); }}
                  placeholder="1"
                  className="w-20 text-center text-4xl font-bold border-2 border-gray-200 rounded-xl py-2 outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
                <span className="text-xs text-gray-400 mt-1">min</span>
              </div>
              <span className="text-3xl font-bold text-gray-300 pb-4">:</span>
              <div className="flex flex-col items-center">
                <input ref={secRef} type="number" min={0} max={59} value={mSec}
                  onChange={(e) => setMSec(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTime()}
                  placeholder="00"
                  className="w-20 text-center text-4xl font-bold border-2 border-gray-200 rounded-xl py-2 outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
                <span className="text-xs text-gray-400 mt-1">seg</span>
              </div>
            </div>
            <button onClick={saveTime} disabled={saving}
              className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2 text-base disabled:opacity-50"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            {timesMap[modal.surferName]?.[modal.sessionName] && (
              <button onClick={clearTime} disabled={saving}
                className="w-full border border-red-200 text-red-500 font-semibold py-2 rounded-xl mb-2 text-sm">
                Borrar tiempo
              </button>
            )}
            <button onClick={() => setModal(null)}
              className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">
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
            <p className="text-sm text-gray-400 mb-4">Ej: Agosto '26, Diciembre '26</p>
            <input autoFocus value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSession()}
              placeholder="Nombre de la sesión"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base mb-4 outline-none focus:border-black transition-colors"
            />
            <button onClick={addSession} className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Crear</button>
            <button onClick={() => setShowAddSession(false)} className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── MODAL: nuevo surfer ── */}
      {showAddSurfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSurfer(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Nuevo surfer</p>
            <input autoFocus value={newSurferName} onChange={(e) => setNewSurferName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSurfer()}
              placeholder="Nombre completo"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base mb-4 outline-none focus:border-black transition-colors"
            />
            <button onClick={addSurfer} className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Agregar</button>
            <button onClick={() => setShowAddSurfer(false)} className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── MODAL: borrar surfer ── */}
      {showDeleteSurfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDeleteSurfer(false); setConfirmDelete(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Eliminar surfer</p>
            <p className="text-sm text-gray-400 mb-3">Se borran también todos sus tiempos.</p>
            <input value={deleteFilter} onChange={(e) => setDeleteFilter(e.target.value)}
              placeholder="Buscar..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-black"
            />
            <div className="max-h-52 overflow-y-auto flex flex-col gap-1 mb-4">
              {filteredForDelete.map((s) => (
                <div key={s.id}>
                  {confirmDelete === s.name ? (
                    <div className="flex gap-2 items-center px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                      <span className="flex-1 text-sm font-semibold text-red-700">{s.name}</span>
                      <button onClick={() => deleteSurfer(s.name)} disabled={saving}
                        className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg font-bold disabled:opacity-50">
                        {saving ? "..." : "Confirmar"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-2 py-1">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(s.name)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all text-sm font-medium text-gray-700">
                      {s.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => { setShowDeleteSurfer(false); setConfirmDelete(null); }}
              className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: renombrar surfer ── */}
      {renamingSurfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRenamingSurfer(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-xl mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Editar nombre</p>
            <p className="text-sm text-gray-400 mb-4">{renamingSurfer}</p>
            <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameSurfer()}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base mb-4 outline-none focus:border-black transition-colors"
            />
            <button onClick={renameSurfer} disabled={saving}
              className="w-full bg-black text-white font-bold py-3 rounded-xl mb-2 disabled:opacity-50"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {saving ? "Guardando..." : "Guardar nombre"}
            </button>
            <button onClick={() => setRenamingSurfer(null)}
              className="w-full border border-gray-200 text-gray-400 font-semibold py-2 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
