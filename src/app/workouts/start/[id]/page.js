"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../_components/AuthProvider";

const REST_BETWEEN_SETS_SEC = 20;
const REST_BETWEEN_EXERCISES_SEC = 30;

// Deine .m4a Dateien in: /public/audio/
const AUDIO_START = "/audio/start.m4a"; // "Start"
const AUDIO_REST = "/audio/rest.m4a";   // "Pause"
const AUDIO_DONE = "/audio/done.m4a";   // "Geschafft"
const AUDIO_5SEC = "/audio/5sec.m4a";   // "Noch 5 Sekunden"

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
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const intervalRef = useRef(null);

  // Auto-start fürs nächste Element (damit es durchläuft)
  const autoStartNextRef = useRef(false);

  // Audio: unlock + preloaded audio elements
  const audioUnlockedRef = useRef(false);
  const startAudioRef = useRef(null);
  const restAudioRef = useRef(null);
  const doneAudioRef = useRef(null);
  const fiveAudioRef = useRef(null);

  // "Noch 5 Sekunden" nur einmal pro Step
  const played5Ref = useRef(false);

  // Wake Lock (Bildschirm wach halten)
  const wakeLockRef = useRef(null);

  const current = steps[stepIndex] || null;
  const isLast = stepIndex >= steps.length - 1;

  function ensureAudioObjects() {
    if (!startAudioRef.current) {
      startAudioRef.current = new Audio(AUDIO_START);
      startAudioRef.current.preload = "auto";
    }
    if (!restAudioRef.current) {
      restAudioRef.current = new Audio(AUDIO_REST);
      restAudioRef.current.preload = "auto";
    }
    if (!doneAudioRef.current) {
      doneAudioRef.current = new Audio(AUDIO_DONE);
      doneAudioRef.current.preload = "auto";
    }
    if (!fiveAudioRef.current) {
      fiveAudioRef.current = new Audio(AUDIO_5SEC);
      fiveAudioRef.current.preload = "auto";
    }
  }

  async function unlockAudio() {
    if (audioUnlockedRef.current) return;
    ensureAudioObjects();

    const audios = [
      startAudioRef.current,
      restAudioRef.current,
      doneAudioRef.current,
      fiveAudioRef.current,
    ];

    for (const a of audios) {
      try {
        a.currentTime = 0;
        a.volume = 0; // kurz "stumm" abspielen, um zu entsperren
        await a.play();
        a.pause();
        a.currentTime = 0;
        a.volume = 1;
      } catch {
        // ignore
      }
    }

    audioUnlockedRef.current = true;
  }

  function playAudio(which) {
    if (!audioUnlockedRef.current) return;
    try {
      ensureAudioObjects();
      const a =
        which === "start"
          ? startAudioRef.current
          : which === "rest"
          ? restAudioRef.current
          : which === "done"
          ? doneAudioRef.current
          : which === "five"
          ? fiveAudioRef.current
          : null;

      if (!a) return;
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
      a.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  async function requestWakeLock() {
    try {
      if (typeof navigator === "undefined") return;
      if (!("wakeLock" in navigator)) return;
      if (wakeLockRef.current) return;
      // @ts-ignore
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch {
      // ignore
    }
  }

  async function releaseWakeLock() {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && isRunning) {
        requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) requestWakeLock();
    else releaseWakeLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    if (!workoutId) return;
    loadWorkoutForPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, workoutId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step change: reset timer, reset 5sec flag, auto-start if desired
  useEffect(() => {
    if (!current) return;

    played5Ref.current = false;

    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (current.mode === "time") {
      setRemaining(Number(current.seconds || 0));
    } else {
      setRemaining(0);
    }

    // Auto-start next time-step (inkl. Pausen)
    if (autoStartNextRef.current && current.mode === "time") {
      autoStartNextRef.current = false;
      setTimeout(() => startStep(true), 150);
    } else {
      autoStartNextRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

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
      const dur = Number(it.duration_sec || 0);
      const reps = Number(it.reps || 0);

      const isTime = dur > 0;
      const isReps = reps > 0;

      for (let s = 1; s <= sets; s++) {
        // ✅ time steps bekommen mindestens 1 Sekunde, sonst springt es sofort weiter
        const seconds = isTime ? Math.max(1, dur) : null;

        out.push({
          type: "work",
          title: exName,
          note: it.note || "",
          mode: isTime ? "time" : "reps",
          seconds,
          reps: !isTime && isReps ? reps : null,
          setText: sets > 1 ? `Satz ${s}/${sets}` : "",
        });

        if (sets > 1 && s < sets) {
          out.push({
            type: "rest",
            title: "Pause",
            mode: "time",
            seconds: Math.max(1, REST_BETWEEN_SETS_SEC),
            note: "",
            setText: "",
          });
        }
      }

      if (i < list.length - 1) {
        out.push({
          type: "rest",
          title: "Pause",
          mode: "time",
          seconds: Math.max(1, REST_BETWEEN_EXERCISES_SEC),
          note: "",
          setText: "",
        });
      }
    }

    return out;
  }

  // startStep: auto=true means it may run without user click (audio needs unlock from earlier)
  async function startStep(auto = false) {
    if (!current) return;

    if (!auto) {
      await unlockAudio();
    } else {
      ensureAudioObjects();
    }

    // Sound cue
    if (current.type === "rest") playAudio("rest");
    else playAudio("start");

    if (current.mode !== "time") {
      setIsRunning(false);
      releaseWakeLock();
      return;
    }

    // ✅ harte Absicherung: niemals mit 0 starten
    const initial = Math.max(1, Number(current.seconds || remaining || 1));
    setRemaining(initial);

    setIsRunning(true);
    requestWakeLock();

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);

        // 5 Sekunden Cue (bei work UND pause)
        if (next === 5 && !played5Ref.current) {
          played5Ref.current = true;
          playAudio("five");
        }

        if (next === 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);

          // Automatisch weiter + automatisch starten
          setTimeout(() => goNext(true), 250);
        }
        return next;
      });
    }, 1000);
  }

  function pauseStep() {
    autoStartNextRef.current = false;

    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    releaseWakeLock();
  }

  function goNext(fromAuto = false) {
    if (!steps.length) return;

    autoStartNextRef.current = true;

    if (isLast) {
      playAudio("done");
      router.push(`/workouts/${workoutId}`);
      return;
    }

    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    setStepIndex((i) => Math.min(steps.length - 1, i + 1));

    if (fromAuto) {
      // Step-Effect startet automatisch
    }
  }

  function goPrev() {
    if (!steps.length) return;

    autoStartNextRef.current = false;

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                pauseStep();
                router.push(`/workouts/${workoutId}`);
              }}
            >
              Zurück
            </button>
            <div className="ui-badge">
              Schritt {stepIndex + 1}/{steps.length}
            </div>
          </div>

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

              <div className="ui-badge" style={{ width: "fit-content" }}>
                {current?.type === "rest" ? "Pause" : "Übung"}
              </div>
            </div>

            {current?.mode === "time" ? (
              <div style={{ fontSize: 78, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--c-darker)" }}>
                {fmtTime(remaining)}
              </div>
            ) : (
              <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--c-darker)" }}>
                {current?.reps ? `${current.reps} Wdh` : "Wdh"}
              </div>
            )}

            {current?.note ? (
              <div style={{ color: "var(--c-darker)", opacity: 0.9 }}>
                {current.note}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              {current?.mode === "time" ? (
                <div style={{ display: "flex", gap: 10 }}>
                  {!isRunning ? (
                    <button className="btn btn-primary" type="button" onClick={() => startStep(false)} style={{ flex: 1 }}>
                      Start
                    </button>
                  ) : (
                    <button className="btn btn-secondary" type="button" onClick={pauseStep} style={{ flex: 1 }}>
                      Pause
                    </button>
                  )}

                  {/* ✅ "Nächster Schritt" raus; statt "Überspringen" -> "Weiter" */}
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => goNext(false)}
                    style={{ flex: 1 }}
                  >
                    Weiter
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => goNext(false)}>
                  Weiter
                </button>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={goPrev}
                  disabled={stepIndex === 0}
                  style={{ flex: 1 }}
                >
                  Zurück
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
