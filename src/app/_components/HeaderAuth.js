"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    if (busy) return;
    setBusy(true);

    try {
      // Versuch normal auszuloggen
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
      // egal – wir leiten trotzdem um
    } finally {
      // Wichtig: IMMER umleiten, damit du sicher rauskommst
      window.location.href = "/login";
    }
  }

  if (loading) return <div className="text-sm" style={{ color: "var(--c-muted)" }}>…</div>;

  if (!user) {
    return (
      <a
        href="/login"
        className="rounded-xl border px-4 py-2 text-sm font-semibold"
        style={{
          borderColor: "var(--c-dark)",
          background: "rgba(51, 42, 68, 0.15)",
          color: "var(--c-text)",
        }}
      >
        Login
      </a>
    );
  }

  const badge = role === "admin" ? "Admin" : role === "member" ? "Mitglied" : "";

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block text-sm" style={{ color: "var(--c-text)" }}>
        {user.email}{" "}
        {badge ? (
          <span
            className="ml-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: "var(--c-dark)", background: "rgba(51, 42, 68, 0.25)" }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="rounded-xl border px-4 py-2 text-sm font-semibold"
        style={{
          borderColor: "var(--c-dark)",
          background: "rgba(51, 42, 68, 0.15)",
          color: "var(--c-text)",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Logout…" : "Logout"}
      </button>
    </div>
  );
}
