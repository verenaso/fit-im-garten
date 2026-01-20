"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const BRAND = {
  purple: "#5C4C7C",
  dark: "#332A44",
};

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Nach Login weiterleiten
        window.location.href = "/termine";
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        setMsg(
          "✅ Registrierung erfolgreich. Du kannst dich jetzt einloggen."
        );
        setMode("login");
      }
    } catch (err) {
      setMsg("❌ " + (err?.message || "Unbekannter Fehler"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Willkommen</h1>
        <p className="mt-2 text-slate-600">
          {mode === "login"
            ? "Logge dich ein, um Termine, Workouts und Fotos zu sehen."
            : "Erstelle einen Account für Fit im Garten."}
        </p>

        {/* Toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border p-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: mode === "login" ? BRAND.purple : "transparent",
              color: mode === "login" ? "white" : BRAND.dark,
              border: mode === "login" ? "none" : "1px solid transparent",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: mode === "signup" ? BRAND.purple : "transparent",
              color: mode === "signup" ? "white" : BRAND.dark,
              border: mode === "signup" ? "none" : "1px solid transparent",
            }}
          >
            Registrieren
          </button>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
            <label className="block space-y-1">
              <div className="text-sm font-semibold" style={{ color: BRAND.dark }}>
                E-Mail
              </div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                style={{
                  borderColor: "rgba(69,57,93,0.35)",
                  color: BRAND.dark,
                }}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deinname@email.de"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-1 mt-4">
              <div className="text-sm font-semibold" style={{ color: BRAND.dark }}>
                Passwort
              </div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                style={{
                  borderColor: "rgba(69,57,93,0.35)",
                  color: BRAND.dark,
                }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition"
              style={{
                backgroundColor: loading ? "rgba(92,76,124,0.65)" : BRAND.purple,
              }}
            >
              {loading
                ? "Bitte warten…"
                : mode === "login"
                ? "Einloggen"
                : "Account erstellen"}
            </button>

            {/* Message */}
            {msg ? (
              <div
                className="mt-4 rounded-2xl border px-4 py-3 text-sm"
                style={{
                  borderColor: "rgba(69,57,93,0.25)",
                  color: BRAND.dark,
                  background: "rgba(92,76,124,0.06)",
                }}
              >
                {msg}
              </div>
            ) : null}

            {/* Hinweis */}
            <p className="mt-4 text-xs text-slate-600">
              Tipp: Wenn du dein Passwort vergisst, können wir später einen
              “Passwort zurücksetzen”-Flow einbauen.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
