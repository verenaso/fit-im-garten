"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/_components/AuthProvider";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          alert("Login fehlgeschlagen.\n\n" + error.message);
          return;
        }
        window.location.href = "/";
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          alert("Registrierung fehlgeschlagen.\n\n" + error.message);
          return;
        }
        alert("Account erstellt! Je nach Supabase-Einstellung musst du deine E-Mail bestätigen.");
        window.location.href = "/";
      }
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen">
      <h1 className="text-2xl font-bold">Login</h1>

      {authLoading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : user ? (
        <div className="mt-6 rounded-xl border p-4 space-y-2">
          <div className="text-gray-700">
            Du bist bereits eingeloggt als <span className="font-semibold">{user.email}</span>.
          </div>
          <button className="rounded-lg border px-4 py-2 text-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 rounded-xl border p-4 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-sm ${mode === "login" ? "bg-gray-100" : ""}`}
              onClick={() => setMode("login")}
              disabled={busy}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-sm ${mode === "signup" ? "bg-gray-100" : ""}`}
              onClick={() => setMode("signup")}
              disabled={busy}
            >
              Registrieren
            </button>
          </div>

          <label className="space-y-1 block">
            <div className="text-sm text-gray-700">E-Mail</div>
            <input
              className="w-full rounded-lg border p-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="space-y-1 block">
            <div className="text-sm text-gray-700">Passwort</div>
            <input
              className="w-full rounded-lg border p-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button className="rounded-lg border px-4 py-2" type="submit" disabled={busy}>
            {busy ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Account erstellen"}
          </button>

          <p className="text-sm text-gray-600">
            Neue Accounts sind standardmäßig “Mitglied”. Admin machst du später in Supabase (profiles.role = 'admin').
          </p>
        </form>
      )}
    </main>
  );
}
