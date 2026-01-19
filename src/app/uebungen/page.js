"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/_components/AuthProvider";

export default function UebungenPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);

  // Formular
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  async function loadExercises() {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, category, description, link, created_at")
      .order("created_at", { ascending: false });

    if (!error) setExercises(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setExercises([]);
      setLoading(false);
      return;
    }
    loadExercises();
  }, [authLoading, user]);

  const canCreate = useMemo(() => isAdmin, [isAdmin]);

  async function onCreate(e) {
    e.preventDefault();

    const { error } = await supabase.from("exercises").insert({
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      link: link.trim() || null,
    });

    if (error) {
      alert("Konnte Übung nicht speichern (bist du Admin?).\n\n" + error.message);
      return;
    }

    setName("");
    setCategory("");
    setDescription("");
    setLink("");
    await loadExercises();
  }

  async function onDelete(id) {
    const ok = confirm("Diese Übung wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) {
      alert("Konnte Übung nicht löschen.\n\n" + error.message);
      return;
    }
    await loadExercises();
  }

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Übungsdatenbank</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Übungen zu sehen.
        </p>
      ) : (
        <>
          <p className="mt-2 text-gray-600">
            Eingeloggt {isAdmin ? "(Admin)" : "(Mitglied)"}
          </p>

          {canCreate ? (
            <form onSubmit={onCreate} className="mt-6 rounded-xl border p-4 space-y-3">
              <div className="font-semibold">Neue Übung anlegen</div>

              <label className="space-y-1 block">
                <div className="text-sm text-gray-700">Name</div>
                <input
                  className="w-full rounded-lg border p-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Kniebeuge"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-sm text-gray-700">Kategorie (optional)</div>
                  <input
                    className="w-full rounded-lg border p-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="z.B. Beine, Core, Mobility…"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-sm text-gray-700">Link (optional)</div>
                  <input
                    className="w-full rounded-lg border p-2"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="z.B. YouTube / Anleitung"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <div className="text-sm text-gray-700">Beschreibung (optional)</div>
                <textarea
                  className="w-full rounded-lg border p-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurzbeschreibung, Technik-Hinweise…"
                  rows={3}
                />
              </label>

              <button className="rounded-lg border px-4 py-2">Übung speichern</button>
            </form>
          ) : (
            <p className="mt-6 text-gray-600">Nur Admins können Übungen anlegen oder löschen.</p>
          )}

          <div className="mt-6">
            <div className="font-semibold">Alle Übungen</div>

            {loading ? (
              <p className="mt-3 text-gray-600">Lade…</p>
            ) : exercises.length === 0 ? (
              <p className="mt-3 text-gray-600">Noch keine Übungen angelegt.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {exercises.map((ex) => (
                  <div key={ex.id} className="rounded-xl border p-4">
                    <div className="font-semibold">{ex.name}</div>
                    {ex.category ? <div className="text-gray-700">{ex.category}</div> : null}
                    {ex.description ? <div className="mt-2 text-gray-600">{ex.description}</div> : null}
                    {ex.link ? (
                      <a className="mt-2 block underline" href={ex.link} target="_blank" rel="noreferrer">
                        Link öffnen
                      </a>
                    ) : null}

                    {isAdmin ? (
                      <button className="mt-3 underline text-sm" onClick={() => onDelete(ex.id)}>
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
