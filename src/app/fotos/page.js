"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

export default function FotosPage() {
  const { user, role, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]); // photos enriched with url + uploader_name
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [takenOn, setTakenOn] = useState(""); // optional
  const fileRef = useRef(null);

  // Comments state
  const [openComments, setOpenComments] = useState({}); // { [photoIdKey]: boolean }
  const [commentsByPhoto, setCommentsByPhoto] = useState({}); // { [photoIdKey]: { loading, error, items, newText, saving } }

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
        .select("id, user_id, storage_path, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (dbErr) throw dbErr;

      const rows = data || [];

      // Uploader usernames batch
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        if (!profErr && profiles) {
          profileMap = Object.fromEntries(
            profiles.map((p) => [
              p.id,
              (p.username || p.display_name || "").trim() || "Unbekannt",
            ])
          );
        }
      }

      // Signed URLs
      const withUrls = await Promise.all(
        rows.map(async (row) => {
          const { data: signed, error: signedErr } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(row.storage_path, 60 * 60);

          return {
  ...row,
  uploader_name: profileMap[row.user_id] || "Unbekannt",
  url: signedErr ? "" : signed?.signedUrl || "",
  url_error: signedErr ? (signedErr.message || JSON.stringify(signedErr)) : "",
};

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

      // 2) DB Insert (taken_on NOT NULL; Caption ist raus in UI, aber DB darf es trotzdem haben)
      const { data: inserted, error: insertErr } = await supabase
        .from("photos")
        .insert([
          {
            user_id: user.id,
            storage_path: storagePath,
            taken_on: takenOnIso,
          },
        ])
        .select("id, user_id, storage_path, created_at")
        .single();

      if (insertErr) {
        await supabase.storage.from(bucketName).remove([storagePath]);
        throw insertErr;
      }

      // Signed URL + username
      const { data: signed } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 60 * 60);

      const uploaderName = await getUsernameForUserId(inserted.user_id);

      const newItem = {
        ...inserted,
        uploader_name: uploaderName || "Unbekannt",
        url: signed?.signedUrl || "",
      };

      setItems((prev) => [newItem, ...prev]);

      // Reset form
      if (fileRef.current) fileRef.current.value = "";
      setTakenOn("");
      setInfo("Upload erfolgreich ✅");
    } catch (e) {
      setError(normalizeSupabaseError(e));
    } finally {
      setUploading(false);
    }
  }

  async function getUsernameForUserId(userId) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) return "Unbekannt";
      return (data.username || data.display_name || "").trim() || "Unbekannt";
    } catch {
      return "Unbekannt";
    }
  }

  async function handleRefresh() {
    await loadPhotos();
  }

  function photoKey(photoId) {
    // bigint kann als number oder string kommen — als object key immer string stabil
    return String(photoId);
  }

  function ensureCommentsState(key) {
    setCommentsByPhoto((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: { loading: false, error: "", items: [], newText: "", saving: false },
      };
    });
  }

  function toggleComments(photoId) {
    const key = photoKey(photoId);

    setOpenComments((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        ensureCommentsState(key);
        loadComments(photoId);
      }
      return { ...prev, [key]: nextOpen };
    });
  }

  async function loadComments(photoId) {
    const key = photoKey(photoId);

    setCommentsByPhoto((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), loading: true, error: "" },
    }));

    try {
      const { data, error: dbErr } = await supabase
        .from("photo_comments")
        .select("id, photo_id, user_id, content, created_at")
        .eq("photo_id", photoId) // photo_id ist BIGINT → photoId muss einfach nur "gleiches Format" haben
        .order("created_at", { ascending: true });

      if (dbErr) throw dbErr;

      const rows = data || [];

      // Authors batch
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        if (profiles) {
          profileMap = Object.fromEntries(
            profiles.map((p) => [
              p.id,
              (p.username || p.display_name || "").trim() || "Unbekannt",
            ])
          );
        }
      }

      const enriched = rows.map((r) => ({
        ...r,
        author_name: profileMap[r.user_id] || "Unbekannt",
      }));

      setCommentsByPhoto((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), loading: false, error: "", items: enriched },
      }));
    } catch (e) {
      setCommentsByPhoto((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), loading: false, error: normalizeSupabaseError(e) },
      }));
    }
  }

  async function saveComment(photoId) {
    if (!user) {
      setError("Bitte einloggen, um zu kommentieren.");
      return;
    }

    const key = photoKey(photoId);
    const state = commentsByPhoto[key];
    const text = (state?.newText || "").trim();
    if (!text) return;

    setCommentsByPhoto((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), saving: true, error: "" },
    }));

    try {
      const { data: inserted, error: insErr } = await supabase
        .from("photo_comments")
        .insert([
          {
            photo_id: photoId, // BIGINT FK
            user_id: user.id,
            content: text,
          },
        ])
        .select("id, photo_id, user_id, content, created_at")
        .single();

      if (insErr) throw insErr;

      const authorName = await getUsernameForUserId(inserted.user_id);

      setCommentsByPhoto((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          saving: false,
          newText: "",
          items: [...(prev[key]?.items || []), { ...inserted, author_name: authorName || "Unbekannt" }],
        },
      }));
    } catch (e) {
      setCommentsByPhoto((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), saving: false, error: normalizeSupabaseError(e) },
      }));
    }
  }

  return (
    <div style={{ padding: 16, paddingBottom: 96, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Fotos</h1>
      <p style={{ marginTop: 0, marginBottom: 16, color: "#444" }}>
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

          {/* Debug-Zeile (wenn du die nicht willst, sag Bescheid, dann nehme ich sie raus) */}
          {user && (
            <div style={{ fontSize: 12, color: "#777" }}>
              Eingeloggt · Rolle: <b>{role || "?"}</b>
            </div>
          )}
        </form>
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
          {items.map((it) => {
            const key = photoKey(it.id);
            const isOpen = !!openComments[key];
            const cState = commentsByPhoto[key];

            const uploadedText = `hochgeladen von ${it.uploader_name} am ${formatDateTime(it.created_at)}`;

            return (
              <div
                key={key}
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
                      alt="Workout Foto"
                      style={{ width: "100%", height: "auto", display: "block" }}
                      loading="lazy"
                    />
                  ) : (
                  <div style={{ padding: 12, color: "#777", whiteSpace: "pre-wrap" }}>
  Bild konnte nicht geladen werden.
  {it.url_error ? `\n\nSigned URL Fehler: ${it.url_error}` : ""}
</div>

                  )}
                </div>

                <div style={{ padding: 12 }}>
                  {/* Nur dieser Text unter dem Foto */}
                  <div style={{ color: "#444", fontSize: 13 }}>{uploadedText}</div>

                  {/* Comment icon */}
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => toggleComments(it.id)}
                      style={iconButtonStyle}
                      aria-label="Kommentare anzeigen"
                      title="Kommentare"
                    >
                      <CommentIcon />
                    </button>
                  </div>

                  {/* Comments Panel */}
                  {isOpen && (
                    <div
                      style={{
                        marginTop: 10,
                        borderTop: "1px solid #eee",
                        paddingTop: 10,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {/* Existing comments */}
                      <div style={{ display: "grid", gap: 10 }}>
                        {cState?.loading ? (
                          <div style={{ color: "#666", fontSize: 13 }}>Lade Kommentare…</div>
                        ) : cState?.error ? (
                          <div style={{ color: "#7a1f1f", fontSize: 13, whiteSpace: "pre-wrap" }}>
                            {cState.error}
                          </div>
                        ) : (cState?.items || []).length === 0 ? (
                          <div style={{ color: "#666", fontSize: 13 }}>Noch keine Kommentare.</div>
                        ) : (
                          (cState.items || []).map((c) => (
                            <div key={c.id} style={{ display: "grid", gap: 2 }}>
                              <div style={{ fontSize: 13, color: "#222" }}>{c.content}</div>
                              <div style={{ fontSize: 12, color: "#777" }}>
                                {c.author_name} · {formatDateTime(c.created_at)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* New comment */}
                      <div style={{ display: "grid", gap: 8 }}>
                        <textarea
                          value={cState?.newText || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommentsByPhoto((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), newText: val },
                            }));
                          }}
                          placeholder="Kommentar schreiben…"
                          disabled={!user || cState?.saving}
                          rows={3}
                          style={{
                            width: "100%",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            padding: 10,
                            outline: "none",
                            resize: "vertical",
                            fontFamily: "inherit",
                            fontSize: 14,
                          }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => saveComment(it.id)}
                            disabled={!user || cState?.saving || !(cState?.newText || "").trim()}
                            style={{
                              height: 38,
                              borderRadius: 12,
                              border: "1px solid #ddd",
                              background:
                                !user || cState?.saving || !(cState?.newText || "").trim()
                                  ? "#f5f5f5"
                                  : "#111",
                              color:
                                !user || cState?.saving || !(cState?.newText || "").trim()
                                  ? "#777"
                                  : "#fff",
                              fontWeight: 600,
                              padding: "0 12px",
                              cursor: "pointer",
                            }}
                          >
                            {cState?.saving ? "Speichere…" : "Kommentar speichern"}
                          </button>
                        </div>

                        {!user && (
                          <div style={{ fontSize: 12, color: "#777" }}>
                            Bitte einloggen, um zu kommentieren.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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

const iconButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h10M7 12h6M21 12c0 4.418-4.03 8-9 8-1.05 0-2.06-.16-3-.46L3 21l1.67-4.34C4.25 15.3 3 13.74 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getFileExtension(name) {
  const parts = String(name || "").split(".");
  if (parts.length < 2) return "";
  return parts.pop().toLowerCase();
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
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
