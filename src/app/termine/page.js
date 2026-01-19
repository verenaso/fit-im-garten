"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/_components/AuthProvider";

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

  // Formular-State
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
  }, [authLoading, user]);

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
      alert("Konnte Termin nicht speichern (bist du Admin?).\n\n" + error.message);
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
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Termine</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Termine zu sehen.
        </p>
      ) : (
        <>
          <p className="mt-2 text-gray-600">
            Eingeloggt {isAdmin ? "(Admin)" : "(Mitglied)"}
          </p>

          {canCreate ? (
            <form onSubmit={onCreate} className="mt-6 rounded-xl border p-4 space-y-3">
              <div className="font-semibold">Neuen Termin anlegen</div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <div className="text-sm text-gray-700">Datum</div>
                  <input
                    className="w-full rounded-lg border p-2"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm text-gray-700">Uhrzeit</div>
                  <input
                    className="w-full rounded-lg border p-2"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm text-gray-700">Ort</div>
                  <input
                    className="w-full rounded-lg border p-2"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="z.B. Sporthalle"
                    required
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <div className="text-sm text-gray-700">Notiz (optional)</div>
                <input
                  className="w-full rounded-lg border p-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z.B. Intervall + Mobility"
                />
              </label>

              <button className="rounded-lg border px-4 py-2">Termin speichern</button>
            </form>
          ) : (
            <p className="mt-6 text-gray-600">Nur Admins können Termine anlegen oder löschen.</p>
          )}

          <div className="mt-6">
            <div className="font-semibold">Kommende Termine</div>

            {loading ? (
              <p className="mt-3 text-gray-600">Lade…</p>
            ) : termine.length === 0 ? (
              <p className="mt-3 text-gray-600">Noch keine Termine.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {termine.map((t) => (
                  <div key={t.id} className="rounded-xl border p-4">
                    <div className="font-semibold">{fmtDateTime(t.starts_at)}</div>
                    <div className="text-gray-700">{t.location}</div>
                    {t.note ? <div className="mt-2 text-gray-600">{t.note}</div> : null}

                    {isAdmin ? (
                      <button className="mt-3 underline text-sm" onClick={() => onDelete(t.id)}>
                        Löschen
                      </button>
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
