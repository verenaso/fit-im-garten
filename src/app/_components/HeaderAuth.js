"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function HeaderAuth() {
  const { user, loading, role } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    // AuthProvider sollte state refreshten
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "#fff",
        borderBottom: "1px solid rgba(51, 42, 68, 0.10)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end", // ✅ kein Logo -> rechts ausrichten
          gap: 10,
        }}
      >
        {loading ? (
          <div style={{ fontSize: 13, color: "#666" }}>…</div>
        ) : user ? (
          <>
            <div style={{ fontSize: 13, color: "#333", marginRight: "auto" }}>
              {role ? <span style={{ opacity: 0.75 }}>{role}</span> : null}
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost btn-sm" href="/login">
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
