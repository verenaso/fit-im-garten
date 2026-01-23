"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

/**
 * Fotos – stabiler MVP
 * - Listet Fotos aus DB (photos)
 * - Holt Signed URLs für die Storage-Paths
 * - Upload: Storage upload -> DB insert (taken_on NOT NULL)
 *
 * Spalten: photos.storage_path (statt path)
 */

export default function FotosPage() {
  const { user, role, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]); // { id, storage_path, caption, taken_on, created_at, url }
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState(""); // "YYYY-MM-DD" optional
  const fileRef = useRef(null);

  const bucketName = "workout-fotos";

  const canUpload = useMemo(() => !!user && !authLoading, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setPageLoading(false);
      return;
    }
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function loadPhotos() {
    setError("");
    setInfo("");
    setPageLoading(true);

    try {
      const { data, error: dbErr } = await supabase
        .from("photos")
        .select("id, user_id, storage_path, caption, taken_on, created_at")
        .order("taken_on", { ascending: false })
        .limit(200);

      if (dbErr) throw dbErr;

      const rows = data || [];

      const withUrls = await Promise.all(
        rows.map(async (row) => {
          const path = row.storage_path;

          const { data: signed, error: signedErr } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, 60 * 60); // 1h

          if (signedErr) {
            return { ...row, url: "" };
          }
          return { ...row, url: signed?.signedUrl || "" };
        })
      );

      setItems(withUrls);
    } catch (e) {
      setError(normalizeSupabaseError(e));
    } finally {
      setPageLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!user) {
      setError("Du bist nicht eingeloggt.");
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Bitte wähle ein Foto aus.");
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setError("Bitte wähle eine Bilddatei aus (z.B. JPG/PNG).");
      return;
    }

    const takenOnIso = takenOn
      ? new Date(`${takenOn}T00:00:00.000Z`).toISOString()
      : new Date().toISOString();

    setUploading(true);

    const fileExt = getFileExtension(file.name) || "jpg";
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = `${user.id}/${fileName}`;

    try {
      // 1) Storage Upload
      const { error: storageErr } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (storageErr) throw storageErr;

      // 2) DB Insert (storage_path!)
      const { data: inserted, error: insertErr } = await supabase
        .from("photos")
        .insert([
          {
            user_id: user.id,
            storage_path: storagePath,
            caption: caption?.trim() ? caption.trim() : null,
            taken_on: takenOnIso,
          },
        ])
        .select("id, user_id, storage_path, caption, taken_on, created_at")
        .single();

      if (insertErr) {
        // Cleanup (best effort)
        await supabase.storage.from(bucketName).remove([storagePath]);
        throw insertErr;
      }

      // Signed URL für sofortige Anzeige
      const { data: signed } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 60 * 60);

      const newItem = { ...inserted, url: signed?.signedUrl || "" };
      setItems((prev) => [newItem, ...prev]);

      // Reset Form
      if (fileRef.current) fileRef.current.value = "";
      setCaption("");
      setTakenOn("");
      setInfo("Upload erfolgreich ✅");
    } catch (e) {
      setError(normalizeSupabaseError(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleRefresh() {
    await loadPhotos();
  }

  return (
    <div style={{ padding: 16, paddingBottom: 96, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Fotos</h1>
      <p style={{ marginTop: 0, marginBottom: 16, color: "#444" }}>
        Lade Workout-Fotos hoch und schau dir die Galerie an.
      </p>

      {!user && !authLoading && (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "#fafafa",
            marginBottom: 16,
          }}
        >
          Bitte einloggen, um Fotos zu sehen oder hochzuladen.
        </div>
      )}

      {error && (
        <div
          style={{
            border: "1px solid #f3c0c0",
            background: "#fff5f5",
            color: "#7a1f1f",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {info && (
        <div
          style={{
            border: "1px solid #cfe9d4",
            background: "#f3fff5",
            color: "#1f6b2b",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {info}
        </div>
      )}

      {/* Upload */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          marginBottom: 18,
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 18, margin: 0, marginBottom: 10 }}>Neues Foto</h2>

        <form onSubmit={handleUpload} style={{ display: "grid", gap: 10 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            disabled={!canUpload || uploading}
            style={{ width: "100%" }}
          />

          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={!canUpload || uploading}
            style={inputStyle}
          />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#555" }}>
              Aufnahmedatum (optional – sonst heute)
            </label>
            <input
              type="date"
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
              disabled={!canUpload || uploading}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={!canUpload || uploading}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: uploading ? "#f5f5f5" : "#111",
              color: uploading ? "#777" : "#fff",
              fontWeight: 600,
              cursor: uploading ? "default" : "pointer",
            }}
          >
            {uploading ? "Lade hoch…" : "Hochladen"}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={!user || uploading || pageLoading}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Aktualisieren
          </button>
        </form>

        {user && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Eingeloggt als: <b>{user.email}</b> · Rolle: <b>{role || "?"}</b>
          </div>
        )}
      </div>

      {/* Galerie */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Galerie</h2>
        <div style={{ fontSize: 12, color: "#666" }}>{items.length} Fotos</div>
      </div>

      {pageLoading ? (
        <div style={{ marginTop: 12, color: "#666" }}>Lade Fotos…</div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: 12, color: "#666" }}>Noch keine Fotos vorhanden.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <div style={{ width: "100%", background: "#fafafa" }}>
                {it.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.url}
                    alt={it.caption || "Workout Foto"}
                    style={{ width: "100%", height: "auto", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ padding: 12, color: "#777" }}>
                    Bild konnte nicht geladen werden (Signed URL fehlgeschlagen).
                  </div>
                )}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 650, marginBottom: 4 }}>
                  {formatDate(it.taken_on)}
                </div>
                {it.caption ? <div style={{ color: "#333" }}>{it.caption}</div> : <div style={{ color: "#777" }}>—</div>}

                <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                  {it.created_at ? `Upload: ${formatDateTime(it.created_at)}` : ""}
                </div>

                <div style={{ marginTop: 6, fontSize: 12, color: "#999", wordBreak: "break-all" }}>
                  {it.storage_path}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, fontSize: 12, color: "#777" }}>
        Hinweis: Wenn Upload/Anzeige danach noch scheitert, ist es fast immer eine RLS/Storage Policy.
      </div>
    </div>
  );
}

const inputStyle = {
  height: 42,
  borderRadius: 12,
  border: "1px solid #ddd",
  padding: "0 12px",
  outline: "none",
};

function getFileExtension(name) {
  const parts = String(name || "").split(".");
  if (parts.length < 2) return "";
  return parts.pop().toLowerCase();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(d);
  } catch {
    return iso || "";
  }
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return iso || "";
  }
}

function normalizeSupabaseError(e) {
  if (!e) return "Unbekannter Fehler.";
  if (typeof e === "string") return e;

  const msg = e.message || "Fehler";
  const details = e.details ? `\nDetails: ${e.details}` : "";
  const hint = e.hint ? `\nHint: ${e.hint}` : "";
  const code = e.code ? `\nCode: ${e.code}` : "";

  return `${msg}${details}${hint}${code}`.trim();
}
