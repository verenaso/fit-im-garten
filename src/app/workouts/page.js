"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function fmtDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function WorkoutsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);

  async function loadWorkouts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("workouts")
      .select(
        `
        id,
        workout_date,
        title,
        notes,
        workout_items (
          id,
          sets,
          reps,
          duration_sec,
          order_index,
          note,
          exercises ( name )
        )
      `
      )
      .order("workout_date", { ascending: false });

    if (error) {
      alert("Konnte Workouts nicht laden.\n\n" + error.message);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((w) => ({
      ...w,
      workout_items: (w.workout_items || [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    }));

    setWorkouts(normalized);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      return;
    }
    loadWorkouts();
  }, [authLoading, user]);

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Vergangene Workouts</h1>

      {authLoading ? (
        <p className="mt-6 text-slate-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-slate-800">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Workouts zu sehen.
        </p>
      ) : (
        <>
          <p className="mt-2 text-slate-600">
            Eingeloggt {isAdmin ? "(Admin)" : "(Mitglied)"}
          </p>

          <div className="mt-6">
            <a className="underline" href="/workouts/neu">
              Workout erstellen
            </a>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-600">Lade…</p>
          ) : workouts.length === 0 ? (
            <p className="mt-6 text-slate-600">Noch keine Workouts gespeichert.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {workouts.map((w) => (
                <div key={w.id} className="rounded-xl border p-4">
                  <div className="font-semibold">
                    {fmtDate(w.workout_date)} · {w.title}
                  </div>
                  {w.notes ? <div className="mt-2 text-slate-700">{w.notes}</div> : null}

                  <div className="mt-3">
                    <div className="text-sm font-semibold text-slate-700">Übungen</div>
                    {!w.workout_items?.length ? (
                      <div className="mt-1 text-slate-600 text-sm">Keine Übungen eingetragen.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {w.workout_items.map((it) => {
                          const exName = it.exercises?.name || "Unbekannte Übung";
                          const parts = [];
                          if (it.sets) parts.push(`${it.sets} Sätze`);
                          if (it.reps) parts.push(`${it.reps} Wdh`);
                          if (it.duration_sec) parts.push(`${it.duration_sec}s`);
                          return (
                            <li key={it.id} className="rounded-lg border p-3">
                              <div className="font-medium">{exName}</div>
                              {parts.length ? (
                                <div className="text-sm text-slate-600">{parts.join(" · ")}</div>
                              ) : null}
                              {it.note ? <div className="mt-1 text-sm text-slate-600">{it.note}</div> : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
