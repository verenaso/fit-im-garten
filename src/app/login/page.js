"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function normalizeDisplayName(s) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function isValidDisplayName(s) {
  const dn = normalizeDisplayName(s);
  return dn.length >= 3 && dn.length <= 24;
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (isSignup) return isValidDisplayName(displayName);
    return true;
  }, [email, password, displayName, isSignup]);

  useEffect(() => {
    setErr("");
    setMsg("");
  }, [mode]);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (isSignup) {
        const dn = normalizeDisplayName(displayName);
        if (!isValidDisplayName(dn)) {
          setErr("Bitte einen Nutzernamen mit 3–24 Zeichen eingeben.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: dn } },
        });

        if (error) throw error;

        if (data?.session) {
          router.push("/termine");
        } else {
          setMsg("Registrierung ok. Bitte ggf. E-Mail bestätigen und dann einloggen.");
          setMode("login");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data?.session) router.push("/termine");
      }
    } catch (e2) {
      setErr(e2?.message || "Login/Signup fehlgeschlagen.");
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
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z.B. Verena"
                autoComplete="nickname"
                required
              />
              <div className="help">Wird bei Abstimmungen, Forum und Fotos angezeigt.</div>
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
