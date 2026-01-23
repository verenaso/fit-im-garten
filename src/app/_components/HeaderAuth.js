"use client";

import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const { user, loading, displayName, profileLoading } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(51, 42, 68, 1)", // ✅ dunkles Lila
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Links: Username (ruhig) */}
        <div style={{ minWidth: 0, flex: 1 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>…</div>
          ) : user ? (
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.92)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={displayName || ""}
            >
              {displayName ? (
                <span style={{ fontWeight: 800 }}>{displayName}</span>
              ) : profileLoading ? (
                <span style={{ opacity: 0.85 }}>Profil lädt…</span>
              ) : (
                <span style={{ opacity: 0.85 }}>Eingeloggt</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}> </div>
          )}
        </div>

        {/* Rechts: Actions */}
        {loading ? null : user ? (
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={handleLogout}
            style={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.25)",
            }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link
              className="btn btn-ghost btn-sm"
              href="/login"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
            >
              Login
            </Link>
            <Link className="btn btn-primary btn-sm" href="/register">
              Registrieren
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
