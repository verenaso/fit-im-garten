"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function FotosPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  // Upload
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  async function loadPhotos() {
    setError("");
    setLoading(true);

    try {
      const { data, error: e } = await supabase
        .from("photos")
        .select("id, created_at, user_id, path, file_path, caption")
        .order("created_at", { ascending: false });

      if (e) throw e;

      const rows = data || [];

      // Signed URLs erzeugen (funktioniert auch bei privaten Buckets)
      const withUrls = await Promise.all(
        rows.map(async (r) => {
          const path = r.path || r.file_path;
          if (!path) return { ...r, url: null };

          const { data: signed, error: se } = await supabase.storage
            .from("photos")
            .createSignedUrl(path, 60 * 60); // 1h

          if (se) {
            return { ...r, url: null, urlError: se.message };
          }

          return { ...r, url: signed?.signedUrl || null };
        })
      );

      setItems(withUrls);
    } catch (e) {
      setError(e?.message || "Fehler beim Laden der Fotos.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function onUpload(e) {
    e.preventDefault();
    if (!user) return;

    const file = e.target?.elements?.file?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ext.length <= 5 ? ext : "jpg";
      const fileName = `${crypto.randomUUID()}.${safeExt}`;
      const path = `${user.id}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: false });

      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("photos").insert({
        user_id: user.id,
        path,
        caption: caption.trim() || null,
      });

      if (insErr) throw insErr;

      setCaption("");
      e.target.reset();
      await loadPhotos();
    } catch (e) {
      setError(e?.message || "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(photoId) {
    const ok = confirm("Foto wirklich löschen?");
    if (!ok) return;

    setError("");

    try {
      // erst row holen, dann storage delete
      const { data, error: fe } = await supabase
        .from("photos")
        .select("id, path, file_path")
        .eq("id", photoId)
        .single();

      if (fe) throw fe;

      const path = data.path || data.file_path;

      // delete db row
      const { error: de } = await supabase.from("photos").delete().eq("id", photoId);
      if (de) throw de;

      // delete storage object (best effort)
      if (path) {
        await supabase.storage.from("photos").remove([path]);
      }

      await loadPhotos();
    } catch (e) {
      setError(e?.message || "Konnte Foto nicht löschen.");
    }
  }

  return (
    <main>
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
            Eingeloggt {isAdmin ? "(Admin)" : "(Mitglied)"}
          </p>

          <form onSubmit={onUpload} className="mt-6 ui-card ui-card-pad space-y-3">
            <div className="ui-section-title" style={{ marginBottom: 0 }}>
              Foto hochladen
            </div>

            <div className="field">
              <div className="label">Bilddatei</div>
              <input className="input" name="file" type="file" accept="image/*" required />
            </div>

            <div className="field">
              <div className="label">Beschreibung (optional)</div>
              <input
                className="input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="z.B. Workout am Sonntag 💪"
              />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={uploading}>
              {uploading ? "Lade hoch…" : "Hochladen"}
            </button>

            {error ? <div className="ui-empty">{error}</div> : null}
          </form>

          <div className="mt-6">
            <div className="font-semibold">Uploads</div>

            {loading ? (
              <p className="mt-3 text-gray-600">Lade…</p>
            ) : items.length === 0 ? (
              <p className="mt-3 text-gray-600">Noch keine Fotos.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="ui-card ui-card-pad">
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={p.caption || "Foto"}
                        style={{
                          width: "100%",
                          height: 220,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(31,27,43,0.08)",
                          background: "rgba(0,0,0,0.03)",
                        }}
                      />
                    ) : (
                      <div className="ui-empty">
                        Bild konnte nicht geladen werden.
                        {p.urlError ? (
                          <div className="mt-2" style={{ fontSize: 12 }}>
                            {p.urlError}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="text-sm text-gray-700">{fmtDate(p.created_at)}</div>
                      {p.caption ? <div className="mt-1">{p.caption}</div> : null}
                    </div>

                    {isAdmin ? (
                      <button className="mt-3 btn btn-danger btn-sm btn-full" onClick={() => onDelete(p.id)} type="button">
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
