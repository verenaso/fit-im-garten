"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../_components/AuthProvider";

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 9l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPhotos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M21 16l-5.2-5.2a1.6 1.6 0 0 0-2.3 0L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccordionCard({ icon, title, open, onToggle, children }) {
  return (
    <div
      className="ui-card ui-card-pad-lg"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(51, 42, 68, 0.10)",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(92, 76, 124, 0.08)",
                color: "var(--c-darker)",
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "var(--c-darker)", lineHeight: 1.1 }}>
              {title}
            </div>
          </div>

          <div style={{ color: "var(--c-darker)", opacity: 0.9 }}>
            <Chevron open={open} />
          </div>
        </div>
      </button>

      {open ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </div>
  );
}

function fileUuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

export default function FotosPage() {
  const { user, loading: authLoading } = useAuth();

  const [openUpload, setOpenUpload] = useState(true);
  const [openGallery, setOpenGallery] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [urlsById, setUrlsById] = useState({});

  const fileRef = useRef(null);

  const canUse = useMemo(() => !!user?.id, [user?.id]);

  async function loadPhotos() {
    if (!user?.id) return;

    setError("");

    const { data, error: e } = await supabase
      .from("photos")
      .select("id, user_id, storage_path, caption, taken_on, created_at")
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (e) {
      setError(e.message || "Fehler beim Laden der Fotos.");
      return;
    }

    setPhotos(data || []);

    // Signed URLs holen
    const nextUrls = {};
    for (const p of data || []) {
      if (!p.storage_path) continue;

      const { data: signed, error: se } = await supabase.storage
        .from("workout-fotos")
        .createSignedUrl(p.storage_path, 60 * 60); // 1h

      if (!se && signed?.signedUrl) {
        nextUrls[p.id] = signed.signedUrl;
      }
    }
    setUrlsById(nextUrls);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    // ✅ wichtig: NICHT von role abhängig machen!
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!user?.id) return;

    if (!selectedFile) {
      setError("Bitte zuerst ein Foto auswählen.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const ext = (selectedFile.name || "").split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${fileUuid()}.${ext}`;
      const storagePath = `${user.id}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from("workout-fotos")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type || "image/jpeg",
        });

      if (upErr) throw upErr;

      const nowIso = new Date().toISOString();

      const { error: dbErr } = await supabase.from("photos").insert({
        user_id: user.id,
        storage_path: storagePath,
        caption: caption.trim() || null,
        taken_on: nowIso, // MVP
      });

      if (dbErr) throw dbErr;

      setCaption("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";

      await loadPhotos();
      setOpenGallery(true);
    } catch (err) {
      setError(err?.message || "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !canUse ? (
        <p className="mt-6 text-gray-700">Bitte einloggen, um Fotos zu sehen.</p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <AccordionCard
            icon={<IconUpload />}
            title="Foto hochladen"
            open={openUpload}
            onToggle={() => setOpenUpload((v) => !v)}
          >
            {error ? (
              <div className="ui-empty" style={{ marginBottom: 12, borderStyle: "solid" }}>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleUpload} className="ui-col">
              {/* Hidden input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />

              {/* ✅ Upload-Item statt nativer Datei-UI */}
              <button
                type="button"
                className="ui-card ui-card-pad"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(51, 42, 68, 0.10)",
                  background: "rgba(92, 76, 124, 0.04)",
                  cursor: busy ? "not-allowed" : "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(92, 76, 124, 0.10)",
                      color: "var(--c-darker)",
                      flex: "0 0 auto",
                    }}
                  >
                    <IconUpload />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: "var(--c-darker)" }}>
                      Foto auswählen
                    </div>
                    <div className="ui-muted" style={{ marginTop: 2 }}>
                      {selectedFile ? selectedFile.name : "Tippe hier, um ein Bild auszuwählen"}
                    </div>
                  </div>
                </div>
              </button>

              <div className="field">
                <div className="label">Caption (optional)</div>
                <input
                  className="input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="z.B. Heute Intervall im Park"
                />
              </div>

              <div className="ui-row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                  {busy ? "Lade hoch…" : "Hochladen"}
                </button>
              </div>
            </form>
          </AccordionCard>

          <AccordionCard
            icon={<IconPhotos />}
            title="Fotos"
            open={openGallery}
            onToggle={() => setOpenGallery((v) => !v)}
          >
            {photos.length === 0 ? (
              <div className="ui-empty">Noch keine Fotos.</div>
            ) : (
              <div className="ui-list" style={{ gap: 12 }}>
                {photos.map((p) => {
                  const url = urlsById[p.id];
                  const uploadedAt = p.created_at ? new Date(p.created_at).toLocaleDateString("de-DE") : "";
                  return (
                    <div key={p.id} className="ui-card ui-card-pad" style={{ borderRadius: 18 }}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={p.caption || "Foto"}
                          style={{
                            width: "100%",
                            borderRadius: 14,
                            display: "block",
                            objectFit: "cover",
                            maxHeight: 360,
                          }}
                        />
                      ) : (
                        <div className="ui-empty">Bild lädt…</div>
                      )}

                      {/* ✅ Unter dem Foto: minimal, wie du es willst */}
                      <div style={{ marginTop: 10, color: "var(--c-darker)", opacity: 0.9, fontSize: 13 }}>
                        hochgeladen am {uploadedAt}
                      </div>

                      {p.caption ? (
                        <div style={{ marginTop: 6, color: "var(--c-darker)" }}>{p.caption}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </AccordionCard>
        </div>
      )}
    </main>
  );
}
