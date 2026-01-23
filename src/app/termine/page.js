"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";
import PollWidget from "./_components/PollWidget";

function fmtDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TerminePage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [termine, setTermine] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formular-State (Admin)
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [time, setTime] = useState(""); // hh:mm
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  async function loadTermine() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sessions")
      .select("id, starts_at, location, note")
      .order("starts_at", { ascending: true });

    if (!error) setTermine(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setTermine([]);
      setLoading(false);
      return;
    }

    loadTermine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const canCreate = useMemo(() => isAdmin, [isAdmin]);

  async function onCreate(e) {
    e.preventDefault();

    const dt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dt.getTime())) {
      alert("Bitte Datum und Uhrzeit korrekt ausfüllen.");
      return;
    }

    const { error } = await supabase.from("sessions").insert({
      starts_at: dt.toISOString(),
      location: location.trim(),
      note: note.trim() || null,
    });

    if (error) {
      alert("Konnte Termin nicht speichern.\n\n" + error.message);
      return;
    }

    setDate("");
    setTime("");
    setLocation("");
    setNote("");
    await loadTermine();
  }

  async function onDelete(id) {
    const ok = confirm("Diesen Termin wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("sessions").delete().eq("id", id);

    if (error) {
      alert("Konnte Termin nicht löschen.\n\n" + error.message);
      return;
    }

    await loadTermine();
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      <h1 className="text-2xl font-bold">Termine</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Termine zu sehen.
        </p>
      ) : (
        <>
          {/* Abschnitt: Abstimmung */}
          <div className="mt-6 ui-card ui-card-pad-lg">
            <div className="ui-section-title" style={{ marginBottom: 8 }}>
            </div>

            <PollWidget />
          </div>

          {/* Abschnitt: Termine */}
          <div className="mt-6 ui-card ui-card-pad-lg">
            <div className="ui-section-title" style={{ marginBottom: 8 }}>
              Termine
            </div>
            <div
              className="ui-muted"
              style={{ fontSize: 16, marginBottom: 12, color: "var(--c-darker)" }}
            >
              
            </div>

            {/* Admin: Termin anlegen (nur wenn Admin, ohne Hinweistext) */}
            {canCreate ? (
              <form onSubmit={onCreate} className="ui-col" style={{ marginBottom: 14 }}>
                <div className="ui-section-title" style={{ marginBottom: 10 }}>
                  Neuen Termin anlegen
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="field">
                    <div className="label">Datum</div>
                    <input
                      className="input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <div className="label">Uhrzeit</div>
                    <input
                      className="input"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <div className="label">Ort</div>
                    <input
                      className="input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="z.B. Sporthalle"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <div className="label">Notiz (optional)</div>
                  <input
                    className="input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="z.B. Intervall + Mobility"
                  />
                </div>

                <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Termin speichern
                  </button>
                </div>
              </form>
            ) : null}

            {/* Liste */}

            {loading ? (
              <div className="ui-empty">Lade…</div>
            ) : termine.length === 0 ? (
              <div className="ui-empty">Noch keine Termine.</div>
            ) : (
              <div className="ui-list">
                {termine.map((t) => (
                  <div key={t.id} className="ui-card ui-card-pad">
                    <div style={{ fontWeight: 800, color: "var(--c-darker)" }}>
                      {fmtDateTime(t.starts_at)}
                    </div>
                    <div className="ui-muted" style={{ color: "var(--c-darker)" }}>
                      {t.location}
                    </div>

                    {t.note ? (
                      <div style={{ marginTop: 8, color: "var(--c-darker)", opacity: 0.9 }}>
                        {t.note}
                      </div>
                    ) : null}

                    {isAdmin ? (
                      <div className="ui-row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => onDelete(t.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
