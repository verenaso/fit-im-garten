"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/_components/AuthProvider";
import CollapsibleSection from "@/app/_components/CollapsibleSection";

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Du bist nicht eingeloggt. Bitte logge dich ein, um Übungen zu sehen.</p>
      ) : (
        <>
          {canCreate ? (
            <div style={{ marginTop: 14 }}>
              <CollapsibleSection title="Neue Übung" icon={<IconPlus />} defaultOpen={false}>
                <form onSubmit={onCreate} className="ui-col" style={{ gap: 12 }}>
                  <label className="field">
                    <div className="label">Name</div>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="z.B. Kniebeuge"
                      required
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                      <div className="label">Kategorie (optional)</div>
                      <input
                        className="input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="z.B. Beine, Core, Mobility…"
                      />
                    </label>

                    <label className="field">
                      <div className="label">Link (optional)</div>
                      <input
                        className="input"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="z.B. YouTube / Anleitung"
                      />
                    </label>
                  </div>

                  <label className="field">
                    <div className="label">Beschreibung (optional)</div>
                    <textarea
                      className="textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Kurzbeschreibung, Technik-Hinweise…"
                      rows={3}
                    />
                  </label>

                  <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn-primary btn-sm" type="submit">
                      Übung speichern
                    </button>
                  </div>
                </form>
              </CollapsibleSection>
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <div className="ui-section-title" style={{ marginBottom: 10 }}>
              Übungen
            </div>

            {loading ? (
              <div className="ui-empty">Lade…</div>
            ) : exercises.length === 0 ? (
              <div className="ui-empty">Noch keine Übungen angelegt.</div>
            ) : (
              <div className="ui-list">
                {exercises.map((ex) => (
                  <div key={ex.id} className="ui-card ui-card-pad">
                    <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>{ex.name}</div>
                    {ex.category ? <div className="ui-muted" style={{ color: "var(--c-darker)" }}>{ex.category}</div> : null}
                    {ex.description ? (
                      <div style={{ marginTop: 8, color: "var(--c-darker)", opacity: 0.9 }}>{ex.description}</div>
                    ) : null}
                    {ex.link ? (
                      <a className="mt-2 block underline" href={ex.link} target="_blank" rel="noreferrer">
                        Link öffnen
                      </a>
                    ) : null}

                    {isAdmin ? (
                      <div className="ui-row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => onDelete(ex.id)}>
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
