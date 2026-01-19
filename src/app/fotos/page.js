"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/_components/AuthProvider";

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FotosPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);

  const [takenOn, setTakenOn] = useState(todayYMD());
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function loadPhotos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("photos")
      .select("id, taken_on, title, storage_path, created_at")
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) setPhotos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    loadPhotos();
  }, [authLoading, user]);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) {
      alert("Bitte eine Bilddatei auswählen.");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
      const fileName = `${crypto.randomUUID()}.${safeExt}`;
      const path = `${takenOn}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from("workout-fotos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (upErr) {
        alert("Upload fehlgeschlagen.\n\n" + upErr.message);
        return;
      }

      const { error: dbErr } = await supabase.from("photos").insert({
        taken_on: takenOn,
        title: title.trim() || null,
        storage_path: path,
      });

      if (dbErr) {
        alert("Foto hochgeladen, aber DB-Eintrag fehlgeschlagen.\n\n" + dbErr.message);
        return;
      }

      setTitle("");
      setFile(null);
      const input = document.getElementById("photoFileInput");
      if (input) input.value = "";
      await loadPhotos();
    } finally {
      setUploading(false);
    }
  }

  function getSignedUrl(storagePath) {
    return supabase.storage.from("workout-fotos").createSignedUrl(storagePath, 60 * 60);
  }

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Fotos</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">
          Du bist nicht eingeloggt. Bitte logge dich ein, um Fotos zu sehen und hochzuladen.
        </p>
      ) : (
        <>
          <form onSubmit={onUpload} className="mt-6 rounded-xl border p-4 space-y-3">
            <div className="font-semibold">Foto hochladen</div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <div className="text-sm text-gray-700">Datum</div>
                <input
                  className="w-full rounded-lg border p-2"
                  type="date"
                  value={takenOn}
                  onChange={(e) => setTakenOn(e.target.value)}
                  required
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm text-gray-700">Titel (optional)</div>
                <input
                  className="w-full rounded-lg border p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Nach dem Training"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <div className="text-sm text-gray-700">Bilddatei</div>
              <input
                id="photoFileInput"
                className="w-full"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </label>

            <button className="rounded-lg border px-4 py-2" type="submit" disabled={uploading}>
              {uploading ? "Lade hoch…" : "Hochladen"}
            </button>
          </form>

          <div className="mt-6">
            <div className="font-semibold">Galerie</div>

            {loading ? (
              <p className="mt-3 text-gray-600">Lade…</p>
            ) : photos.length === 0 ? (
              <p className="mt-3 text-gray-600">Noch keine Fotos.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((p) => (
                  <PhotoCard key={p.id} photo={p} getSignedUrl={getSignedUrl} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function PhotoCard({ photo, getSignedUrl }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    getSignedUrl(photo.storage_path).then(({ data, error }) => {
      if (!alive) return;
      if (error) return;
      setUrl(data?.signedUrl ?? null);
    });
    return () => {
      alive = false;
    };
  }, [photo.storage_path, getSignedUrl]);

  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-semibold">{fmtDate(photo.taken_on)}</div>
      {photo.title ? <div className="text-sm text-gray-600">{photo.title}</div> : null}

      {/* Kein Crop: natürliche Höhe */}
      <div className="mt-2 w-full overflow-hidden rounded-lg border bg-gray-50">
        {url ? (
          <img
            src={url}
            alt={photo.title || "Workout Foto"}
            className="w-full h-auto"
            loading="lazy"
          />
        ) : (
          <div className="h-40 w-full flex items-center justify-center text-sm text-gray-500">
            Lade Bild…
          </div>
        )}
      </div>
    </div>
  );
}
