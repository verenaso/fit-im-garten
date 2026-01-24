"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../_components/AuthProvider";
import CollapsibleSection from "../../_components/CollapsibleSection";

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function IconWorkout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10v4M17 10v4M5 9v6M19 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
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
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-slate-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-slate-800">Du bist nicht eingeloggt. Bitte logge dich ein.</p>
      ) : loading ? (
        <p className="mt-6 text-slate-600">Lade Übungen…</p>
      ) : (
        <>
          {!canCreate ? <p className="mt-6 text-slate-600">Nur Admins können Workouts erstellen.</p> : null}

          <div style={{ marginTop: 14 }}>
            <CollapsibleSection title="Workout erstellen" icon={<IconWorkout />} defaultOpen={false}>
              <form onSubmit={onSave} className="ui-col" style={{ gap: 14 }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field">
                    <div className="label">Datum</div>
                    <input
                      className="input"
                      type="date"
                      value={workoutDate}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                      required
                    />
                  </label>

                  <label className="field">
                    <div className="label">Titel</div>
                    <input
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="z.B. Ganzkörper A"
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <div className="label">Notizen (optional)</div>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Warmup, Fokus, Besonderheiten…"
                  />
                </label>

                <div className="ui-card ui-card-pad" style={{ background: "rgba(92, 76, 124, 0.05)" }}>
                  <div className="label" style={{ marginBottom: 8 }}>
                    Übungen hinzufügen
                  </div>

                  <div className="ui-col" style={{ gap: 10 }}>
                    <div className="ui-row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <select
                        className="input"
                        style={{ flex: 1, minWidth: 220 }}
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
                        className="btn btn-secondary btn-sm"
                        onClick={addItem}
                        disabled={!selectedExerciseId}
                      >
                        Hinzufügen
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div className="ui-empty">Noch keine Übungen im Workout.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {items.map((it, idx) => {
                          const ex = exercises.find((e) => e.id === it.exercise_id);
                          return (
                            <div key={`${it.exercise_id}-${idx}`} className="ui-card ui-card-pad">
                              <div className="ui-row" style={{ alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                                    {idx + 1}. {ex ? exLabel(ex) : "Übung"}
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-3" style={{ marginTop: 10 }}>
                                    <label className="field">
                                      <div className="label">Sätze</div>
                                      <input
                                        className="input"
                                        inputMode="numeric"
                                        value={it.sets}
                                        onChange={(e) => updateItem(idx, { sets: e.target.value })}
                                        placeholder="z.B. 3"
                                      />
                                    </label>

                                    <label className="field">
                                      <div className="label">Wdh</div>
                                      <input
                                        className="input"
                                        inputMode="numeric"
                                        value={it.reps}
                                        onChange={(e) => updateItem(idx, { reps: e.target.value })}
                                        placeholder="z.B. 10"
                                      />
                                    </label>

                                    <label className="field">
                                      <div className="label">Dauer (Sek.)</div>
                                      <input
                                        className="input"
                                        inputMode="numeric"
                                        value={it.duration_sec}
                                        onChange={(e) => updateItem(idx, { duration_sec: e.target.value })}
                                        placeholder="z.B. 60"
                                      />
                                    </label>
                                  </div>

                                  <label className="field" style={{ marginTop: 10 }}>
                                    <div className="label">Notiz (optional)</div>
                                    <input
                                      className="input"
                                      value={it.note}
                                      onChange={(e) => updateItem(idx, { note: e.target.value })}
                                      placeholder="z.B. Tempo 3-1-1"
                                    />
                                  </label>
                                </div>

                                <div className="ui-col" style={{ gap: 6, alignItems: "flex-end" }}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                                    ↑
                                  </button>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                                    ↓
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(idx)}>
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
                </div>

                <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!canCreate}>
                    Workout speichern
                  </button>
                </div>
              </form>
            </CollapsibleSection>
          </div>
        </>
      )}
    </main>
  );
}
