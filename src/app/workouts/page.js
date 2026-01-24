"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function fmtDate(ymdOrIso) {
  if (!ymdOrIso) return "";
  // workout_date ist bei dir yyyy-mm-dd
  const d = new Date(ymdOrIso.includes("T") ? ymdOrIso : `${ymdOrIso}T00:00:00`);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WorkoutsPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [itemsByWorkout, setItemsByWorkout] = useState({});
  const [exerciseNameById, setExerciseNameById] = useState({});
  const [openIds, setOpenIds] = useState(new Set());

  const canUse = useMemo(() => !!user?.id, [user?.id]);

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadAll() {
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      // 1) Workouts
      const { data: wRows, error: wErr } = await supabase
        .from("workouts")
        .select("id, workout_date, title, notes, created_at")
        .order("workout_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (wErr) throw wErr;

      const ws = wRows || [];
      setWorkouts(ws);

      // Auto-open latest
      if (ws.length > 0) setOpenIds(new Set([ws[0].id]));

      if (ws.length === 0) {
        setItemsByWorkout({});
        return;
      }

      // 2) Alle Items für diese Workouts
      const workoutIds = ws.map((w) => w.id);

      const { data: itemRows, error: iErr } = await supabase
        .from("workout_items")
        .select("id, workout_id, exercise_id, sets, reps, duration_sec, note, order_index")
        .in("workout_id", workoutIds)
        .order("order_index", { ascending: true });

      if (iErr) throw iErr;

      const items = itemRows || [];
      const byW = {};
      for (const it of items) {
        if (!byW[it.workout_id]) byW[it.workout_id] = [];
        byW[it.workout_id].push(it);
      }
      setItemsByWorkout(byW);

      // 3) Exercise-Namen map (einmalig)
      const exIds = [...new Set(items.map((x) => x.exercise_id).filter(Boolean))];
      if (exIds.length > 0) {
        const { data: exRows, error: exErr } = await supabase
          .from("exercises")
          .select("id, name, category")
          .in("id", exIds);

        if (exErr) throw exErr;

        const map = {};
        for (const ex of exRows || []) {
          map[ex.id] = ex.category ? `${ex.name} (${ex.category})` : ex.name;
        }
        setExerciseNameById(map);
      } else {
        setExerciseNameById({});
      }
    } catch (e) {
      setError(e?.message || "Fehler beim Laden der Historie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  if (authLoading) {
    return (
      <main className="min-h-screen" style={{ paddingBottom: 96 }}>
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      </main>
    );
  }

  if (!canUse) {
    return (
      <main className="min-h-screen" style={{ paddingBottom: 96 }}>
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {error ? (
        <div className="ui-empty" style={{ marginTop: 14, borderStyle: "solid" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-gray-600">Lade Historie…</p>
      ) : workouts.length === 0 ? (
        <div className="mt-6 ui-empty">Noch keine Workouts gespeichert.</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {workouts.map((w) => {
            const open = openIds.has(w.id);
            const items = itemsByWorkout[w.id] || [];

            return (
              <div
                key={w.id}
                className="ui-card ui-card-pad-lg"
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(51, 42, 68, 0.10)",
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(w.id)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 16, color: "var(--c-darker)", lineHeight: 1.15 }}>
                        {w.title}
                      </div>
                      <div className="ui-muted" style={{ marginTop: 4, color: "var(--c-darker)" }}>
                        {fmtDate(w.workout_date)} · {items.length} Übung{items.length === 1 ? "" : "en"}
                      </div>
                      {w.notes ? (
                        <div style={{ marginTop: 8, color: "var(--c-darker)", opacity: 0.9 }}>{w.notes}</div>
                      ) : null}
                    </div>

                    <div style={{ color: "var(--c-darker)", opacity: 0.9 }}>
                      <Chevron open={open} />
                    </div>
                  </div>
                </button>

                {open ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {items.length === 0 ? (
                      <div className="ui-empty">Keine Übungen gespeichert.</div>
                    ) : (
                      items.map((it, idx) => {
                        const exName = exerciseNameById[it.exercise_id] || "Übung";
                        const metaParts = [];
                        if (it.sets != null) metaParts.push(`${it.sets} Sätze`);
                        if (it.reps != null) metaParts.push(`${it.reps} Wdh`);
                        if (it.duration_sec != null) metaParts.push(`${it.duration_sec} s`);

                        return (
                          <div
                            key={it.id}
                            style={{
                              border: "1px solid rgba(51, 42, 68, 0.10)",
                              borderRadius: 14,
                              padding: 12,
                              background: "rgba(92, 76, 124, 0.03)",
                            }}
                          >
                            <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                              {idx + 1}. {exName}
                            </div>
                            {metaParts.length > 0 ? (
                              <div className="ui-muted" style={{ marginTop: 4, color: "var(--c-darker)" }}>
                                {metaParts.join(" · ")}
                              </div>
                            ) : null}
                            {it.note ? (
                              <div style={{ marginTop: 6, color: "var(--c-darker)", opacity: 0.9 }}>{it.note}</div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
