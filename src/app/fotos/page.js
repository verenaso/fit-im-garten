"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

const BUCKET = "workout-fotos";

/** timeout helper so UI never hangs forever */
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

/**
 * We support multiple possible column names, because your schema drifted.
 * We’ll auto-detect which one exists and use it for inserts.
 */
const PATH_CANDIDATES = ["path", "file_path", "storage_path", "object_path", "key"];

function pickFilePath(row) {
  if (!row) return null;
  for (const k of PATH_CANDIDATES) {
    if (row[k]) return row[k];
  }
  return null;
}

function detectPathColumn(rows) {
  // Look at first rows and see which column actually exists
  for (const r of rows || []) {
    if (!r || typeof r !== "object") continue;
    for (const k of PATH_CANDIDATES) {
      // Column exists if key present (even if null), but we prefer one that has a value
      if (Object.prototype.hasOwnProperty.call(r, k)) {
        // Prefer the first key that either has a value, or is at least present
        if (r[k]) return k;
      }
    }
  }
  // If none had a value, check presence anyway
  const first = (rows || [])[0];
  if (first && typeof first === "object") {
    for (const k of PATH_CANDIDATES) {
      if (Object.prototype.hasOwnProperty.call(first, k)) return k;
    }
  }
  // Default guess: "path" (most common)
  return "path";
}

export default function FotosPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  // We detect which DB column holds the storage path (e.g. "path")
  const [pathColumn, setPathColumn] = useState("path");

  const pathColumnLabel = useMemo(() => pathColumn || "path", [pathColumn]);

  async function loadPhotos() {
    setError("");
    setLoading(true);

    try {
      const { data, error: e } = await withTimeout(
        supabase.from("photos").select("*").order("created_at", { ascending: false }),
        12000,
        "DB: Fotos laden"
      );
      if (e) throw e;

      const rows = data || [];
      setPathColumn(detectPathColumn(rows));

      if (rows.length === 0) {
        setItems([]);
        return;
      }

      // Sign first 60 for mobile performance
      const limited = rows.slice(0, 60);
      const paths = limited.map((r) => pickFilePath(r)).filter(Boolean);

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
          if (entry?.path && entry?.signedUrl && !entry?.error) {
            signedMap[entry.path] = entry.signedUrl;
          }
        }
      }

      const withUrls = rows.map((r) => {
        const fp = pickFilePath(r);
        return {
          ...r,
          __file_path: fp,
          url: fp ? signedMap[fp] || null : null,
        };
      });

      setItems(withUrls);
    } catch (e) {
      setItems([]);
      setError(
        (e?.message || "Fehler beim Laden der Fotos.") +
          "\n\nHinweis: Falls hier Policies stehen, ist es RLS/Storage. 'Bucket not found' wäre Bucket-Name."
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
      const storagePath = `${user.id}/${fileName}`;

      // 1) Upload to storage
      const { error: upErr } = await withTimeout(
        supabase.storage.from(BUCKET).upload(storagePath, file, { upsert: false }),
        20000,
        "Storage: Upload"
      );
      if (upErr) throw upErr;

      // 2) Insert DB row using the detected column name
      const payload = {
        user_id: user.id,
        caption: caption.trim() || null,
        [pathColumnLabel]: storagePath,
      };

      const { error: insErr } = await withTimeout(
        supabase.from("photos").insert(payload),
        12000,
        `DB: Insert (Spalte: ${pathColumnLabel})`
      );

      if (insErr) throw insErr;

      setCaption("");
      e.target.reset();
      await loadPhotos();
    } catch (e) {
      setError(
        (e?.message || "Upload fehlgeschlagen.") +
          `\n\nDebug: Wir schreiben den Storage-Pfad in DB-Spalte "${pathColumnLabel}".` +
          "\nTypisch: RLS blockt INSERT in photos oder Storage Policy blockt Upload."
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
        supabase.from("photos").select("*").eq("id", photoId).single(),
        12000,
        "DB: Foto laden"
      );
      if (fe) throw fe;

      const storagePath = pickFilePath(data);

      const { error: de } = await withTimeout(
        supabase.from("photos").delete().eq("id", photoId),
        12000,
        "DB: Foto löschen"
      );
      if (de) throw de;

      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }

      await loadPhotos();
    } catch (e) {
      setError(e?.message || "Konnte Foto nicht löschen.");
    }
  }

  return (
    <main className="page">
      <div>
        <h1 className="page-title">Fotos</h1>
        <div className="page-subtitle">
          Mobile-first Galerie · Bucket: <strong>{BUCKET}</strong> · DB-Pfadspalte:{" "}
          <strong>{pathColumnLabel}</strong>
        </div>
      </div>

      {authLoading ? (
        <p className="text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Fotos zu sehen.
        </p>
      ) : (
        <>
          <div className="card card-pad stack">
            <div className="section-title">Foto hochladen</div>

            <form onSubmit={onUpload} className="stack">
              <div className="stack-sm">
                <div className="label">Bilddatei</div>
                <input className="input" name="file" type="file" accept="image/*" required />
              </div>

              <div className="stack-sm">
                <div className="label">Beschreibung (optional)</div>
                <input
                  className="input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="z.B. Workout am Sonntag 💪"
                />
                <div className="help">Wird zusammen mit dem Upload gespeichert.</div>
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={uploading}>
                {uploading ? "Lade hoch…" : "Hochladen"}
              </button>

              {error ? (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    marginTop: 6,
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

          <div className="divider" />

          <div className="stack">
            <div className="section-title">Uploads</div>

            {loading ? (
              <p className="text-gray-600">Lade…</p>
            ) : items.length === 0 ? (
              <p className="text-gray-600">Noch keine Fotos.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="card card-pad stack-sm">
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
                        Bild konnte nicht geladen werden.
                      </div>
                    )}

                    <div className="stack-sm">
                      <div className="help">{fmtDate(p.created_at)}</div>
                      {p.caption ? <div>{p.caption}</div> : null}
                    </div>

                    {isAdmin ? (
                      <button className="btn btn-danger btn-full" onClick={() => onDelete(p.id)} type="button">
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
