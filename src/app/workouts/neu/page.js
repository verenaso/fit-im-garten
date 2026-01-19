"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../_components/AuthProvider";

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function WorkoutNeuPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";
  const canCreate = useMemo(() => isAdmin, [isAdmin]);

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);

  const [workoutDate, setWorkoutDate] = useState(todayYMD());
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  async function loadExercises() {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, category")
      .order("name", { ascending: true });

    if (!error) setExercises(data || []);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setExercises([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadExercises().finally(() => setLoading(false));
  }, [authLoading, user]);

  function exLabel(ex) {
    return ex.category ? `${ex.name} (${ex.category})` : ex.name;
  }

  function addItem() {
    if (!selectedExerciseId) return;
    const exId = Number(selectedExerciseId);
    setItems((prev) => [...prev, { exercise_id: exId, sets: "", reps: "", duration_sec: "", note: "" }]);
    setSelectedExerciseId("");
  }

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index, dir) {
    setItems((prev) => {
      const next = prev.slice();
      const j = index + dir;
      if (j < 0 || j >= next.length) return next;
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  async function onSave(e) {
    e.preventDefault();
    if (!canCreate) {
      alert("Nur Admins können Workouts speichern.");
      return;
    }
    if (!title.trim()) {
      alert("Bitte einen Titel angeben.");
      return;
    }
    if (items.length === 0) {
      alert("Bitte mindestens eine Übung hinzufügen.");
      return;
    }

    const { data: workout, error: wErr } = await supabase
      .from("workouts")
      .insert({
        workout_date: workoutDate,
        title: title.trim(),
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (wErr) {
      alert("Konnte Workout nicht speichern.\n\n" + wErr.message);
      return;
    }

    const payload = items.map((it, idx) => ({
      workout_id: workout.id,
      exercise_id: it.exercise_id,
      sets: it.sets === "" ? null : Number(it.sets),
      reps: it.reps === "" ? null : Number(it.reps),
      duration_sec: it.duration_sec === "" ? null : Number(it.duration_sec),
      order_index: idx,
      note: it.note?.trim() || null,
    }));

    const { error: iErr } = await supabase.from("workout_items").insert(payload);

    if (iErr) {
      alert("Workout wurde angelegt, aber Items konnten nicht gespeichert werden.\n\n" + iErr.message);
      return;
    }

    alert("Workout gespeichert!");
    setTitle("");
    setNotes("");
    setItems([]);
  }

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Workout erstellen</h1>

      {authLoading ? (
        <p className="mt-6 text-slate-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-slate-800">Du bist nicht eingeloggt. Bitte logge dich ein.</p>
      ) : loading ? (
        <p className="mt-6 text-slate-600">Lade Übungen…</p>
      ) : (
        <>
          <p className="mt-2 text-slate-600">
            Eingeloggt {isAdmin ? "(Admin)" : "(Mitglied)"}
          </p>

          {!canCreate ? <p className="mt-6 text-slate-600">Nur Admins können Workouts erstellen.</p> : null}

          <form onSubmit={onSave} className="mt-6 rounded-xl border p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <div className="text-sm text-slate-700">Datum</div>
                <input
                  className="w-full rounded-lg border p-2"
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  required
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm text-slate-700">Titel</div>
                <input
                  className="w-full rounded-lg border p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Ganzkörper A"
                  required
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <div className="text-sm text-slate-700">Notizen (optional)</div>
              <textarea
                className="w-full rounded-lg border p-2"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Warmup, Fokus, Besonderheiten…"
              />
            </label>

            <div className="rounded-xl border p-3">
              <div className="font-semibold">Übungen hinzufügen</div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  className="rounded-lg border p-2 flex-1"
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                >
                  <option value="">Übung auswählen…</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {exLabel(ex)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="rounded-lg border px-4 py-2"
                  onClick={addItem}
                  disabled={!selectedExerciseId}
                >
                  Hinzufügen
                </button>
              </div>

              {items.length === 0 ? (
                <p className="mt-3 text-slate-600 text-sm">Noch keine Übungen im Workout.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((it, idx) => {
                    const ex = exercises.find((e) => e.id === it.exercise_id);
                    return (
                      <div key={`${it.exercise_id}-${idx}`} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold">
                              {idx + 1}. {ex ? exLabel(ex) : "Übung"}
                            </div>

                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <label className="space-y-1">
                                <div className="text-xs text-slate-700">Sätze</div>
                                <input
                                  className="w-full rounded-lg border p-2"
                                  inputMode="numeric"
                                  value={it.sets}
                                  onChange={(e) => updateItem(idx, { sets: e.target.value })}
                                  placeholder="z.B. 3"
                                />
                              </label>

                              <label className="space-y-1">
                                <div className="text-xs text-slate-700">Wdh</div>
                                <input
                                  className="w-full rounded-lg border p-2"
                                  inputMode="numeric"
                                  value={it.reps}
                                  onChange={(e) => updateItem(idx, { reps: e.target.value })}
                                  placeholder="z.B. 10"
                                />
                              </label>

                              <label className="space-y-1">
                                <div className="text-xs text-slate-700">Dauer (Sek.)</div>
                                <input
                                  className="w-full rounded-lg border p-2"
                                  inputMode="numeric"
                                  value={it.duration_sec}
                                  onChange={(e) => updateItem(idx, { duration_sec: e.target.value })}
                                  placeholder="z.B. 60"
                                />
                              </label>
                            </div>

                            <label className="space-y-1 block mt-2">
                              <div className="text-xs text-slate-700">Notiz (optional)</div>
                              <input
                                className="w-full rounded-lg border p-2"
                                value={it.note}
                                onChange={(e) => updateItem(idx, { note: e.target.value })}
                                placeholder="z.B. Tempo 3-1-1"
                              />
                            </label>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button type="button" className="underline text-sm" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                              ↑
                            </button>
                            <button type="button" className="underline text-sm" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                              ↓
                            </button>
                            <button type="button" className="underline text-sm" onClick={() => removeItem(idx)}>
                              Entfernen
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="rounded-lg border px-4 py-2" type="submit" disabled={!canCreate}>
              Workout speichern
            </button>
          </form>
        </>
      )}
    </main>
  );
}
