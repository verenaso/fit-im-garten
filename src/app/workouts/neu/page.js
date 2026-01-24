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

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function WorkoutNeuPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";
  const canCreate = useMemo(() => isAdmin, [isAdmin]);

  const [openCreate, setOpenCreate] = useState(false); // ✅ default eingeklappt

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

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
    setOpenCreate(false);
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : loading ? (
        <p className="mt-6 text-gray-600">Lade Übungen…</p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {!canCreate ? <div className="ui-empty">Nur Admins können Workouts erstellen.</div> : null}

          <CollapsibleSection
            icon={<IconPlus />}
            title="Workout erstellen"
            open={openCreate}
            onToggle={() => setOpenCreate((v) => !v)} // ✅ wichtig
          >
            <form onSubmit={onSave} className="ui-col">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="field">
                  <div className="label">Datum</div>
                  <input
                    className="input"
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    required
                    disabled={!canCreate}
                  />
                </div>

                <div className="field">
                  <div className="label">Titel</div>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Ganzkörper A"
                    required
                    disabled={!canCreate}
                  />
                </div>
              </div>

              <div className="field">
                <div className="label">Notizen (optional)</div>
                <textarea
                  className="textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Warmup, Fokus, Besonderheiten…"
                  disabled={!canCreate}
                />
              </div>

              <div
                style={{
                  border: "1px solid rgba(51, 42, 68, 0.10)",
                  borderRadius: 16,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>Übungen hinzufügen</div>

                <div className="ui-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <select
                    className="input"
                    style={{ flex: "1 1 220px" }}
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    disabled={!canCreate}
                  >
                    <option value="">Übung auswählen…</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {exLabel(ex)}
                      </option>
                    ))}
                  </select>

                  <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} disabled={!selectedExerciseId || !canCreate}>
                    Hinzufügen
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="ui-empty" style={{ marginTop: 10 }}>
                    Noch keine Übungen im Workout.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {items.map((it, idx) => {
                      const ex = exercises.find((e) => e.id === it.exercise_id);
                      return (
                        <div
                          key={`${it.exercise_id}-${idx}`}
                          style={{
                            border: "1px solid rgba(51, 42, 68, 0.10)",
                            borderRadius: 16,
                            padding: 12,
                            background: "rgba(92, 76, 124, 0.03)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                                {idx + 1}. {ex ? exLabel(ex) : "Übung"}
                              </div>

                              <div className="grid gap-2 sm:grid-cols-3" style={{ marginTop: 10 }}>
                                <div className="field">
                                  <div className="label">Sätze</div>
                                  <input
                                    className="input"
                                    inputMode="numeric"
                                    value={it.sets}
                                    onChange={(e) => updateItem(idx, { sets: e.target.value })}
                                    placeholder="z.B. 3"
                                    disabled={!canCreate}
                                  />
                                </div>

                                <div className="field">
                                  <div className="label">Wdh</div>
                                  <input
                                    className="input"
                                    inputMode="numeric"
                                    value={it.reps}
                                    onChange={(e) => updateItem(idx, { reps: e.target.value })}
                                    placeholder="z.B. 10"
                                    disabled={!canCreate}
                                  />
                                </div>

                                <div className="field">
                                  <div className="label">Dauer (Sek.)</div>
                                  <input
                                    className="input"
                                    inputMode="numeric"
                                    value={it.duration_sec}
                                    onChange={(e) => updateItem(idx, { duration_sec: e.target.value })}
                                    placeholder="z.B. 60"
                                    disabled={!canCreate}
                                  />
                                </div>
                              </div>

                              <div className="field" style={{ marginTop: 10 }}>
                                <div className="label">Notiz (optional)</div>
                                <input
                                  className="input"
                                  value={it.note}
                                  onChange={(e) => updateItem(idx, { note: e.target.value })}
                                  placeholder="z.B. Tempo 3-1-1"
                                  disabled={!canCreate}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveItem(idx, -1)} disabled={idx === 0 || !canCreate}>
                                ↑
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1 || !canCreate}>
                                ↓
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(idx)} disabled={!canCreate}>
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

              <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={!canCreate}>
                  Workout speichern
                </button>
              </div>
            </form>
          </CollapsibleSection>
        </div>
      )}
    </main>
  );
}
