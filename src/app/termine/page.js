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

function IconVote() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M4 10h16M4 14h10M4 18h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3M4.5 8.5h15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.5 21h11A3 3 0 0 0 20.5 18V8A3 3 0 0 0 17.5 5h-11A3 3 0 0 0 3.5 8v10A3 3 0 0 0 6.5 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <div
      className="ui-card ui-card-pad-lg"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(51, 42, 68, 0.10)",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "rgba(92, 76, 124, 0.08)",
            color: "var(--c-darker)",
            flex: "0 0 auto",
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "var(--c-darker)", lineHeight: 1.1 }}>
            {title}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

export default function TerminePage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [termine, setTermine] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Form
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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
      {/* HERO */}
      <div
        style={{
          marginTop: 8,
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(51, 42, 68, 0.10)",
          background: "#111",
        }}
      >
        <div
          style={{
            height: 150,
            backgroundImage: `url(/hero/termine.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(1.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>
            Termine
          </div>
          <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 6 }}>
            Alles rund um Workouts & Abstimmungen
          </div>
        </div>
      </div>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Termine zu sehen.
        </p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {/* Abstimmung */}
          <SectionCard icon={<IconVote />} title="Abstimmung">
            <PollWidget />
          </SectionCard>

          {/* Kommende Workouts */}
          <SectionCard icon={<IconCalendar />} title="Kommende Workouts">
            {/* Admin: Termin anlegen (als klarer Block) */}
            {canCreate ? (
              <div
                style={{
                  border: "1px dashed rgba(51, 42, 68, 0.20)",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 12,
                  background: "rgba(92, 76, 124, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(17,17,17,0.08)",
                      color: "var(--c-darker)",
                    }}
                  >
                    <IconPlus />
                  </div>
                  <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>Neuen Termin anlegen</div>
                </div>

                <form onSubmit={onCreate} className="ui-col">
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
              </div>
            ) : null}

            {/* Liste */}
            {loading ? (
              <div className="ui-empty">Lade…</div>
            ) : termine.length === 0 ? null : (
              <div style={{ display: "grid", gap: 10 }}>
                {termine.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid rgba(51, 42, 68, 0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: "var(--c-darker)", lineHeight: 1.15 }}>
                          {fmtDateTime(t.starts_at)}
                        </div>
                        <div className="ui-muted" style={{ color: "var(--c-darker)", marginTop: 4 }}>
                          {t.location}
                        </div>
                      </div>

                      {isAdmin ? (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => onDelete(t.id)}
                          style={{ flex: "0 0 auto" }}
                        >
                          Löschen
                        </button>
                      ) : null}
                    </div>

                    {t.note ? (
                      <div style={{ marginTop: 10, color: "var(--c-darker)", opacity: 0.9 }}>
                        {t.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </main>
  );
}
