"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function fmtDate(ymdOrIso) {
  if (!ymdOrIso) return "";
  const d = new Date(ymdOrIso.includes("T") ? ymdOrIso : `${ymdOrIso}T00:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtShortDate(ymdOrIso) {
  if (!ymdOrIso) return "";
  const d = new Date(ymdOrIso.includes("T") ? ymdOrIso : `${ymdOrIso}T00:00:00`);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WorkoutsPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workouts, setWorkouts] = useState([]);

  async function loadWorkouts() {
    if (!user?.id) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: wErr } = await supabase
        .from("workouts")
        .select("id, workout_date, title, created_at")
        .order("workout_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (wErr) throw wErr;
      setWorkouts(data || []);
    } catch (e) {
      setError(e?.message || "Fehler beim Laden der Historie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    loadWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : error ? (
        <div className="ui-empty" style={{ marginTop: 14, borderStyle: "solid" }}>
          {error}
        </div>
      ) : loading ? (
        <p className="mt-6 text-gray-600">Lade Historie…</p>
      ) : workouts.length === 0 ? (
        <div className="mt-6 ui-empty">Noch keine Workouts gespeichert.</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {workouts.map((w) => (
            <Link
              key={w.id}
              href={`/workouts/${w.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="ui-card ui-card-pad"
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(51, 42, 68, 0.10)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      background: "rgba(92, 76, 124, 0.10)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--c-darker)",
                      flex: "0 0 auto",
                    }}
                  >
                    <div style={{ fontWeight: 900, lineHeight: 1, fontSize: 16 }}>
                      {fmtShortDate(w.workout_date)}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: "var(--c-darker)", lineHeight: 1.15 }}>
                      {fmtDate(w.workout_date)}
                    </div>
                    {w.title ? (
                      <div className="ui-muted" style={{ marginTop: 4, color: "var(--c-darker)" }}>
                        {w.title}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ color: "var(--c-darker)", opacity: 0.7, flex: "0 0 auto" }}>
                  <IconChevronRight />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
