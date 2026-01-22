"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

const BUCKET = "photos";

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} Timeout nach ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

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
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  async function loadPhotos() {
    setError("");
    setLoading(true);

    try {
      const { data, error: e } = await withTimeout(
        supabase
          .from("photos")
          .select("id, created_at, user_id, file_path, caption")
          .order("created_at", { ascending: false }),
        12000,
        "DB: Fotos laden"
      );

      if (e) throw e;

      const rows = data || [];
      if (rows.length === 0) {
        setItems([]);
        return;
      }

      // sign only first 60 (mobile performance)
      const limited = rows.slice(0, 60);
      const paths = limited.map((r) => r.file_path).filter(Boolean);

      let signedMap = {};
      if (paths.length > 0) {
        const { data: signedData, error: se } = await withTimeout(
          supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60),
          12000,
          "Storage: Signed URLs"
        );

        if (se) throw se;

        signedMap = {};
        for (const entry of signedData || []) {
          // { path, signedUrl, error }
          if (entry?.path && entry?.signedUrl && !entry?.error) {
            signedMap[entry.path] = entry.signedUrl;
          }
        }
      }

      const withUrls = rows.map((r) => ({
        ...r,
        url: r.file_path ? signedMap[r.file_path] || null : null,
      }));

      setItems(withUrls);
    } catch (e) {
      setItems([]);
      setError(
        (e?.message || "Fehler beim Laden der Fotos.") +
          "\n\nCheck: (1) Bucket-Name, (2) Storage Policies, (3) RLS auf photos."
      );
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
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.length <= 5 ? ext : "jpg";

      const id =
        (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const fileName = `${id}.${safeExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1) upload to storage
      const { error: upErr } = await withTimeout(
        supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false }),
        20000,
        "Storage: Upload"
      );
      if (upErr) throw upErr;

      // 2) insert row in DB (IMPORTANT: file_path column)
      const { error: insErr } = await withTimeout(
        supabase.from("photos").insert({
          user_id: user.id,
          file_path: filePath,
          caption: caption.trim() || null,
        }),
        12000,
        "DB: Foto-Row anlegen"
      );
      if (insErr) throw insErr;

      setCaption("");
      e.target.reset();
      await loadPhotos();
    } catch (e) {
      setError(
        (e?.message || "Upload fehlgeschlagen.") +
          "\n\nTypisch: Storage Policy blockt Upload oder RLS blockt Insert in photos."
      );
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(photoId) {
    const ok = confirm("Foto wirklich löschen?");
    if (!ok) return;

    setError("");

    try {
      const { data, error: fe } = await withTimeout(
        supabase.from("photos").select("id, file_path").eq("id", photoId).single(),
        12000,
        "DB: Foto laden"
      );
      if (fe) throw fe;

      const filePath = data?.file_path;

      const { error: de } = await withTimeout(
        supabase.from("photos").delete().eq("id", photoId),
        12000,
        "DB: Foto löschen"
      );
      if (de) throw de;

      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath]);
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

          <div className="mt-6 ui-card ui-card-pad">
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Foto hochladen</div>

            <form onSubmit={onUpload} className="space-y-3">
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6, color: "rgba(31,27,43,0.78)" }}>
                  Bilddatei
                </div>
                <input className="input" name="file" type="file" accept="image/*" required />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6, color: "rgba(31,27,43,0.78)" }}>
                  Beschreibung (optional)
                </div>
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

              {error ? (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(92,76,124,0.06)",
                    border: "1px solid rgba(92,76,124,0.14)",
                    color: "rgba(31,27,43,0.84)",
                    fontSize: 12,
                  }}
                >
                  {error}
                </pre>
              ) : null}
            </form>
          </div>

          <div className="mt-6">
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Uploads</div>

            {loading ? (
              <p className="mt-3 text-gray-600">Lade…</p>
            ) : items.length === 0 ? (
              <p className="mt-3 text-gray-600">Noch keine Fotos.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="ui-card ui-card-pad">
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={p.caption || "Foto"}
                        style={{
                          width: "100%",
                          height: 240,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(31,27,43,0.10)",
                          background: "rgba(31,27,43,0.04)",
                        }}
                      />
                    ) : (
                      <div className="text-gray-600" style={{ fontSize: 13 }}>
                        Bild konnte nicht geladen werden (keine URL).
                      </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: "rgba(31,27,43,0.62)" }}>{fmtDate(p.created_at)}</div>
                      {p.caption ? <div style={{ marginTop: 4 }}>{p.caption}</div> : null}
                    </div>

                    {isAdmin ? (
                      <button
                        className="btn btn-danger btn-full"
                        style={{ marginTop: 10 }}
                        onClick={() => onDelete(p.id)}
                        type="button"
                      >
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
