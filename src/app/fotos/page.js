"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("de-DE");
  } catch {
    return "";
  }
}

function fileExt(name) {
  const parts = (name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export default function FotosPage() {
  const { user, displayName, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [profileMap, setProfileMap] = useState({}); // user_id -> display name

  const canUpload = useMemo(() => !!user?.id, [user]);

  async function loadPhotos() {
    setError("");
    setLoading(true);

    try {
      const { data, error: e } = await supabase
        .from("photos")
        .select("id,user_id,storage_path,caption,created_at")
        .order("created_at", { ascending: false });

      if (e) throw e;

      const rows = data || [];
      setPhotos(rows);

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      if (userIds.length === 0) {
        setProfileMap({});
        return;
      }

      const { data: profs, error: pe } = await supabase
        .from("profiles")
        .select('id,"Display name"')
        .in("id", userIds);

      if (pe) throw pe;

      const map = {};
      for (const p of profs || []) map[p.id] = p?.["Display name"] || null;
      setProfileMap(map);
    } catch (e2) {
      setError(e2?.message || "Fehler beim Laden der Fotos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhotos([]);
      setProfileMap({});
      setLoading(false);
      return;
    }
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function onUpload(e) {
    e.preventDefault();
    if (!user?.id) return;

    setError("");

    if (!file) {
      setError("Bitte wähle ein Foto aus.");
      return;
    }

    setLoading(true);

    try {
      const ext = fileExt(file.name) || "jpg";
      const stamp = Date.now();
      const path = `${user.id}/${stamp}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("photos").insert({
        user_id: user.id,
        storage_path: path,
        caption: caption.trim() || null,
      });

      if (insErr) throw insErr;

      setCaption("");
      setFile(null);

      const input = document.getElementById("photo-file-input");
      if (input) input.value = "";

      await loadPhotos();
    } catch (e2) {
      setError(e2?.message || "Upload fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function publicUrl(path) {
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function onDeletePhoto(row) {
    const ok = confirm("Foto wirklich löschen?");
    if (!ok) return;

    setError("");
    setLoading(true);

    try {
      // DB row löschen (Policy: nur eigene)
      const { error: delRowErr } = await supabase.from("photos").delete().eq("id", row.id);
      if (delRowErr) throw delRowErr;

      // Storage file löschen (kann je nach Storage-Policy blockiert sein)
      const { error: delFileErr } = await supabase.storage.from("photos").remove([row.storage_path]);
      if (delFileErr) {
        // DB ist wichtiger als Storage cleanup -> nicht hart failen
        console.warn("Could not delete storage file:", delFileErr.message);
      }

      await loadPhotos();
    } catch (e2) {
      setError(e2?.message || "Löschen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Fotos</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Fotos zu sehen.
        </p>
      ) : (
        <>
          <p className="mt-2 text-gray-600">
            Eingeloggt als {displayName || "Nutzer"}{" "}
          </p>

          <form onSubmit={onUpload} className="ui-card ui-card-pad-lg" style={{ marginTop: 16 }}>
            <div className="ui-section-title" style={{ marginBottom: 10 }}>
              Foto hochladen
            </div>

            {error ? (
              <div className="ui-empty" style={{ borderStyle: "solid", marginBottom: 12 }}>
                {error}
              </div>
            ) : null}

            <div className="ui-col">
              <div className="field">
                <div className="label">Datei</div>
                <input
                  id="photo-file-input"
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={!canUpload || loading}
                />
              </div>

              <div className="field">
                <div className="label">Caption (optional)</div>
                <input
                  className="input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="z.B. Fit im Garten – Intervalle 💪"
                  disabled={!canUpload || loading}
                />
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={!canUpload || loading}>
                {loading ? "Bitte warten…" : "Hochladen"}
              </button>

              <div className="help">
                Hinweis: Für MVP ist der Storage-Bucket oft „public“. Wenn dein Bucket privat ist, brauchen wir Signed URLs.
              </div>
            </div>
          </form>

          <div style={{ marginTop: 18 }}>
            <div className="ui-section-title" style={{ marginBottom: 10 }}>
              Galerie
            </div>

            {loading ? (
              <div className="ui-empty">Lade…</div>
            ) : photos.length === 0 ? (
              <div className="ui-empty">Noch keine Fotos.</div>
            ) : (
              <div className="ui-list">
                {photos.map((p) => {
                  const url = publicUrl(p.storage_path);
                  const uploader = profileMap[p.user_id] || "Unbekannt";

                  return (
                    <div key={p.id} className="ui-card ui-card-pad">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {url ? (
                          <img
                            src={url}
                            alt={p.caption || "Foto"}
                            style={{
                              width: "100%",
                              borderRadius: 14,
                              border: "1px solid rgba(51,42,68,0.12)",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div className="ui-empty">Bild-URL konnte nicht geladen werden.</div>
                        )}

                        <div>
                          <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                            {p.caption || "—"}
                          </div>
                          <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)" }}>
                            von <b>{uploader}</b> · {fmtDate(p.created_at)}
                          </div>
                        </div>

                        {user?.id === p.user_id ? (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => onDeletePhoto(p)}
                            disabled={loading}
                          >
                            Löschen
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
