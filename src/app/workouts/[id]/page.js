"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../_components/AuthProvider";

function fmtDate(ymdOrIso) {
  if (!ymdOrIso) return "";
  const d = new Date(ymdOrIso.includes("T") ? ymdOrIso : `${ymdOrIso}T00:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 11v7M14 11v7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.5 7l1-2h9l1 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7l.8 14h8.4L17 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WorkoutDetailPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const params = useParams();
  const router = useRouter();

  const workoutId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [busyDelete, setBusyDelete] = useState(false);
  const [error, setError] = useState("");

  const [workout, setWorkout] = useState(null);
  const [items, setItems] = useState([]);
  const [exerciseNameById, setExerciseNameById] = useState({});

  async function loadDetail() {
    if (!user?.id || !workoutId) return;

    setLoading(true);
    setError("");

    try {
      const { data: w, error: wErr } = await supabase
        .from("workouts")
        .select("id, workout_date, title, notes, created_at")
        .eq("id", workoutId)
        .maybeSingle();

      if (wErr) throw wErr;

      if (!w) {
        setWorkout(null);
        setItems([]);
        setExerciseNameById({});
        return;
      }

      setWorkout(w);

      const { data: its, error: iErr } = await supabase
        .from("workout_items")
        .select("id, workout_id, exercise_id, sets, reps, duration_sec, note, order_index")
        .eq("workout_id", workoutId)
        .order("order_index", { ascending: true });

      if (iErr) throw iErr;

      const list = its || [];
      setItems(list);

      const exIds = [...new Set(list.map((x) => x.exercise_id).filter(Boolean))];
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
      setError(e?.message || "Fehler beim Laden des Workouts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isAdmin) return;
    if (!workoutId) return;

    const ok = confirm("Workout wirklich löschen? (Diese Aktion kann nicht rückgängig gemacht werden.)");
    if (!ok) return;

    setBusyDelete(true);
    setError("");

    try {
      // 1) Items löschen (falls kein FK-CASCADE)
      const { error: delItemsErr } = await supabase
        .from("workout_items")
        .delete()
        .eq("workout_id", workoutId);

      if (delItemsErr) throw delItemsErr;

      // 2) Workout löschen
      const { error: delWorkoutErr } = await supabase
        .from("workouts")
        .delete()
        .eq("id", workoutId);

      if (delWorkoutErr) throw delWorkoutErr;

      router.push("/workouts");
    } catch (e) {
      setError(e?.message || "Konnte Workout nicht löschen.");
    } finally {
      setBusyDelete(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, workoutId]);

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : (
        <>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => router.push("/workouts")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <IconBack /> Zurück
            </button>

            {isAdmin ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={busyDelete || loading}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                title="Workout löschen"
              >
                <IconTrash /> {busyDelete ? "Lösche…" : "Löschen"}
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="ui-empty" style={{ marginTop: 12, borderStyle: "solid" }}>
              {error}
            </div>
          ) : loading ? (
            <p className="mt-6 text-gray-600">Lade Workout…</p>
          ) : !workout ? (
            <div className="mt-6 ui-empty">Workout nicht gefunden.</div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div
                className="ui-card ui-card-pad-lg"
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(51, 42, 68, 0.10)",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18, color: "var(--c-darker)" }}>
                  {workout.title || "Workout"}
                </div>
                <div className="ui-muted" style={{ marginTop: 6, color: "var(--c-darker)" }}>
                  {fmtDate(workout.workout_date)}
                </div>
                {workout.notes ? (
                  <div style={{ marginTop: 10, color: "var(--c-darker)", opacity: 0.9 }}>
                    {workout.notes}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {items.length === 0 ? (
                  <div className="ui-empty">Keine Übungen gespeichert.</div>
                ) : (
                  items.map((it, idx) => {
                    const exName = exerciseNameById[it.exercise_id] || "Übung";

                    const meta = [];
                    if (it.sets != null) meta.push(`${it.sets} Sätze`);
                    if (it.reps != null) meta.push(`${it.reps} Wdh`);
                    if (it.duration_sec != null) meta.push(`${it.duration_sec} s`);

                    return (
                      <div
                        key={it.id}
                        className="ui-card ui-card-pad"
                        style={{
                          borderRadius: 18,
                          border: "1px solid rgba(51, 42, 68, 0.10)",
                          background: "rgba(92, 76, 124, 0.03)",
                        }}
                      >
                        <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                          {idx + 1}. {exName}
                        </div>

                        {meta.length > 0 ? (
                          <div className="ui-muted" style={{ marginTop: 4, color: "var(--c-darker)" }}>
                            {meta.join(" · ")}
                          </div>
                        ) : null}

                        {it.note ? (
                          <div style={{ marginTop: 8, color: "var(--c-darker)", opacity: 0.9 }}>
                            {it.note}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
