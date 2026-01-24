"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";
import CollapsibleSection from "../_components/CollapsibleSection";

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 6h13M8 12h13M8 18h13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function UebungenPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);

  // Sections
  const [openCreate, setOpenCreate] = useState(false); // ✅ default eingeklappt
  const [openList, setOpenList] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

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
      alert("Konnte Übung nicht speichern.\n\n" + error.message);
      return;
    }

    setName("");
    setCategory("");
    setDescription("");
    setLink("");
    await loadExercises();
    setOpenList(true);
    setOpenCreate(false);
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
        <p className="mt-6 text-gray-700">Bitte einloggen, um Übungen zu sehen.</p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {canCreate ? (
            <CollapsibleSection
              icon={<IconPlus />}
              title="Neue Übung"
              open={openCreate}
              onToggle={() => setOpenCreate((v) => !v)} // ✅ wichtig: Funktion übergeben
            >
              <form onSubmit={onCreate} className="ui-col">
                <div className="field">
                  <div className="label">Name</div>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Kniebeuge"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="field">
                    <div className="label">Kategorie (optional)</div>
                    <input
                      className="input"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="z.B. Beine, Core, Mobility…"
                    />
                  </div>

                  <div className="field">
                    <div className="label">Link (optional)</div>
                    <input
                      className="input"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="z.B. YouTube / Anleitung"
                    />
                  </div>
                </div>

                <div className="field">
                  <div className="label">Beschreibung (optional)</div>
                  <textarea
                    className="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Kurzbeschreibung, Technik-Hinweise…"
                    rows={3}
                  />
                </div>

                <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Übung speichern
                  </button>
                </div>
              </form>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            icon={<IconList />}
            title="Übungsdatenbank"
            open={openList}
            onToggle={() => setOpenList((v) => !v)} // ✅ wichtig
          >
            {loading ? (
              <div className="ui-empty">Lade…</div>
            ) : exercises.length === 0 ? (
              <div className="ui-empty">Noch keine Übungen angelegt.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      border: "1px solid rgba(51, 42, 68, 0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "var(--c-darker)", lineHeight: 1.15 }}>{ex.name}</div>
                    {ex.category ? (
                      <div className="ui-muted" style={{ color: "var(--c-darker)", marginTop: 4 }}>
                        {ex.category}
                      </div>
                    ) : null}

                    {ex.description ? (
                      <div style={{ marginTop: 10, color: "var(--c-darker)", opacity: 0.9 }}>{ex.description}</div>
                    ) : null}

                    {ex.link ? (
                      <a
                        href={ex.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-block", marginTop: 10, color: "var(--c-darker)", textDecoration: "underline" }}
                      >
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
          </CollapsibleSection>
        </div>
      )}
    </main>
  );
}
