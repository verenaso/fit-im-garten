"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../_components/AuthProvider";

const REST_BETWEEN_SETS_SEC = 20;
const REST_BETWEEN_EXERCISES_SEC = 30;

// Audio-Dateien (MVP). Lege sie später in /public/audio/ ab.
const AUDIO_START = "/audio/start.mp3"; // z.B. "Los geht's"
const AUDIO_REST = "/audio/rest.mp3";   // z.B. "Pause"
const AUDIO_DONE = "/audio/done.mp3";   // z.B. "Fertig"

function safePlay(src) {
  try {
    const a = new Audio(src);
    a.volume = 1;
    a.play().catch(() => {});
  } catch {
    // ignore
  }
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function WorkoutStartPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const workoutId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workout, setWorkout] = useState(null);
  const [steps, setSteps] = useState([]); // normalized steps
  const [stepIndex, setStepIndex] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const intervalRef = useRef(null);

  const current = steps[stepIndex] || null;
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    if (!workoutId) return;
    loadWorkoutForPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, workoutId]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // If current step changes, initialize timer value for time steps
  useEffect(() => {
    if (!current) return;

    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (current.mode === "time") {
      setRemaining(current.seconds || 0);
    } else {
      setRemaining(0);
    }
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadWorkoutForPlayer() {
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
        setSteps([]);
        setStepIndex(0);
        return;
      }
      setWorkout(w);

      const { data: its, error: iErr } = await supabase
        .from("workout_items")
        .select("id, workout_id, exercise_id, sets, reps, duration_sec, note, order_index")
        .eq("workout_id", workoutId)
        .order("order_index", { ascending: true });

      if (iErr) throw iErr;

      const items = its || [];

      // exercise names
      const exIds = [...new Set(items.map((x) => x.exercise_id).filter(Boolean))];
      let nameById = {};
      if (exIds.length > 0) {
        const { data: exRows, error: exErr } = await supabase
          .from("exercises")
          .select("id, name, category")
          .in("id", exIds);

        if (exErr) throw exErr;

        for (const ex of exRows || []) {
          nameById[ex.id] = ex.category ? `${ex.name} (${ex.category})` : ex.name;
        }
      }

      const normalized = buildSteps(items, nameById);
      setSteps(normalized);
      setStepIndex(0);
    } catch (e) {
      setError(e?.message || "Fehler beim Laden des Workouts.");
    } finally {
      setLoading(false);
    }
  }

  function buildSteps(items, nameById) {
    const out = [];
    const list = items || [];

    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const exName = nameById[it.exercise_id] || "Übung";

      const sets = Math.max(1, Number(it.sets || 1));
      const isTime = it.duration_sec != null && Number(it.duration_sec) > 0;
      const isReps = it.reps != null && Number(it.reps) > 0;

      for (let s = 1; s <= sets; s++) {
        // WORK step
        out.push({
          type: "work",
          title: exName,
          note: it.note || "",
          mode: isTime ? "time" : "reps",
          seconds: isTime ? Number(it.duration_sec) : null,
          reps: !isTime && isReps ? Number(it.reps) : null,
          setText: sets > 1 ? `Satz ${s}/${sets}` : "",
        });

        // REST between sets (but not after last set)
        if (sets > 1 && s < sets) {
          out.push({
            type: "rest",
            title: "Pause",
            mode: "time",
            seconds: REST_BETWEEN_SETS_SEC,
            note: "",
            setText: "",
          });
        }
      }

      // REST between exercises (but not after last exercise)
      if (i < list.length - 1) {
        out.push({
          type: "rest",
          title: "Pause",
          mode: "time",
          seconds: REST_BETWEEN_EXERCISES_SEC,
          note: "",
          setText: "",
        });
      }
    }

    return out;
  }

  function startStep() {
    if (!current) return;

    // sound cue
    if (current.type === "rest") safePlay(AUDIO_REST);
    else safePlay(AUDIO_START);

    if (current.mode === "time") {
      setIsRunning(true);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = Math.max(0, r - 1);
          if (next === 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRunning(false);
            // auto-advance after 0
            setTimeout(() => goNext(true), 250);
          }
          return next;
        });
      }, 1000);
    } else {
      // reps: no timer, user will tap "Weiter"
      setIsRunning(false);
    }
  }

  function pauseStep() {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function goNext(fromAuto = false) {
    if (!steps.length) return;

    // if last
    if (isLast) {
      // finish
      safePlay(AUDIO_DONE);
      router.push(`/workouts/${workoutId}`);
      return;
    }

    // cleanup timer
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    setStepIndex((i) => Math.min(steps.length - 1, i + 1));

    // For auto-advance we do not auto-start next step (MVP),
    // so user gets a clean "Start" moment. (Optional: change later.)
    if (fromAuto) {
      // do nothing
    }
  }

  function goPrev() {
    if (!steps.length) return;
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <main className="min-h-screen" style={{ padding: 16, paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : loading ? (
        <p className="mt-6 text-gray-600">Lade Workout…</p>
      ) : error ? (
        <div className="ui-empty" style={{ marginTop: 14, borderStyle: "solid", whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      ) : !workout ? (
        <div className="mt-6 ui-empty">Workout nicht gefunden.</div>
      ) : steps.length === 0 ? (
        <div className="mt-6 ui-empty">Keine Übungen gespeichert.</div>
      ) : (
        <>
          {/* Top: minimal header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => router.push(`/workouts/${workoutId}`)}>
              Zurück
            </button>
            <div className="ui-badge">
              Schritt {stepIndex + 1}/{steps.length}
            </div>
          </div>

          {/* Main minimal card */}
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(51, 42, 68, 0.10)",
              borderRadius: 18,
              background: "#fff",
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "var(--c-darker)", lineHeight: 1.15 }}>
                {current?.title}
              </div>

              {current?.setText ? (
                <div className="ui-muted" style={{ color: "var(--c-darker)" }}>
                  {current.setText}
                </div>
              ) : null}

              {current?.type === "rest" ? (
                <div className="ui-badge" style={{ width: "fit-content" }}>
                  Pause
                </div>
              ) : (
                <div className="ui-badge" style={{ width: "fit-content" }}>
                  Übung
                </div>
              )}
            </div>

            {/* Instruction */}
            {current?.mode === "time" ? (
              <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--c-darker)" }}>
                {fmtTime(remaining)}
              </div>
            ) : (
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--c-darker)" }}>
                {current?.reps ? `${current.reps} Wdh` : "Wdh"}
              </div>
            )}

            {current?.note ? (
              <div style={{ color: "var(--c-darker)", opacity: 0.9 }}>
                {current.note}
              </div>
            ) : null}

            {/* Controls */}
            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              {current?.mode === "time" ? (
                <div style={{ display: "flex", gap: 10 }}>
                  {!isRunning ? (
                    <button className="btn btn-primary" type="button" onClick={startStep} style={{ flex: 1 }}>
                      Start
                    </button>
                  ) : (
                    <button className="btn btn-secondary" type="button" onClick={pauseStep} style={{ flex: 1 }}>
                      Pause
                    </button>
                  )}
                  <button className="btn btn-ghost" type="button" onClick={() => goNext(false)} style={{ flex: 1 }}>
                    Überspringen
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => goNext(false)}>
                  Weiter
                </button>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={goPrev} disabled={stepIndex === 0} style={{ flex: 1 }}>
                  Zurück
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => goNext(false)} style={{ flex: 1 }}>
                  Nächster Schritt
                </button>
              </div>

              <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)" }}>
                Tipp: Für Zeit-Übungen startet der Countdown. Für Wdh drücke nach dem Satz einfach „Weiter“.
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
