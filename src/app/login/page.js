"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function normalizeUsername(s) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function isValidUsername(u) {
  const s = normalizeUsername(u);
  // simple MVP-Regel: 3–24 Zeichen
  return s.length >= 3 && s.length <= 24;
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Username nur beim Signup
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (isSignup) return isValidUsername(username);
    return true;
  }, [email, password, username, isSignup]);

  useEffect(() => {
    setMsg("");
    setErr("");
  }, [mode]);

  async function ensureProfileUsername(userId, desiredUsername) {
    // Fallback: wir versuchen zusätzlich, den Username in profiles zu schreiben.
    // (Der Trigger macht es normalerweise sowieso.)
    const u = normalizeUsername(desiredUsername);
    if (!u) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: u }, { onConflict: "id" });

    if (error) throw error;
  }

  function mapNiceError(e) {
    const m = e?.message || "";

    // Supabase/Postgres unique violation
    // Kann in Messages unterschiedlich auftauchen, daher mehrere Checks
    if (
      m.toLowerCase().includes("duplicate key") ||
      m.toLowerCase().includes("unique") ||
      m.toLowerCase().includes("profiles_username_unique")
    ) {
      return "Dieser Nutzername ist leider schon vergeben. Bitte wähle einen anderen.";
    }

    return m || "Unbekannter Fehler.";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPw = password;

      if (!cleanEmail || !cleanPw) {
        setErr("Bitte E-Mail und Passwort eingeben.");
        return;
      }

      if (isSignup) {
        const u = normalizeUsername(username);

        if (!isValidUsername(u)) {
          setErr("Bitte einen Nutzernamen mit 3–24 Zeichen eingeben.");
          return;
        }

        // 1) Signup inkl. user_metadata.username (Trigger nutzt genau das)
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPw,
          options: {
            data: { username: u },
          },
        });

        if (error) throw error;

        // 2) Optionaler Fallback: profiles upsert (falls Trigger zeitlich verzögert oder deaktiviert)
        if (data?.user?.id) {
          await ensureProfileUsername(data.user.id, u);
        }

        // Wenn Email confirmation aktiv ist, ist session evtl. null
        if (data?.session) {
          router.push("/termine");
        } else {
          setMsg(
            "Registrierung erfolgreich. Bitte prüfe ggf. deine E-Mails zur Bestätigung. Danach kannst du dich einloggen."
          );
          setMode("login");
        }

        return;
      }

      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPw,
      });
      if (error) throw error;

      if (data?.session) router.push("/termine");
    } catch (e2) {
      setErr(mapNiceError(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="ui-card ui-card-pad-lg" style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--c-darker)", marginBottom: 6 }}>
          Fit im Garten
        </h1>
        <div className="ui-muted" style={{ color: "var(--c-darker)", marginBottom: 14 }}>
          {isSignup ? "Registrieren" : "Login"}
        </div>

        <div className="ui-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <button
            type="button"
            className={`btn btn-sm ${!isSignup ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("login")}
            disabled={loading}
          >
            Login
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isSignup ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("signup")}
            disabled={loading}
          >
            Registrieren
          </button>
        </div>

        {err ? (
          <div className="ui-empty" style={{ borderStyle: "solid", marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="ui-empty" style={{ borderStyle: "solid", marginBottom: 12 }}>
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="ui-col">
          {isSignup ? (
            <div className="field">
              <div className="label">Nutzername</div>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z.B. Verena"
                autoComplete="nickname"
                required
              />
              <div className="help">
                Wird in Forum, Abstimmungen und bei Foto-Uploads angezeigt. (3–24 Zeichen)
              </div>
            </div>
          ) : null}

          <div className="field">
            <div className="label">E-Mail</div>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.de"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <div className="label">Passwort</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Bitte warten…" : isSignup ? "Registrieren" : "Einloggen"}
          </button>
        </form>
      </div>
    </main>
  );
}
