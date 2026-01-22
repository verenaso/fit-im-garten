"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const router = useRouter();
  const { user, displayName, loading } = useAuth();

  async function onLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 10px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.28)",
          color: "white",
        }}
      >
        Prüfe Login…
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href="/login"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          padding: "0 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.32)",
          color: "white",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Login
      </a>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          padding: "8px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.28)",
          color: "white",
          fontWeight: 800,
          fontSize: 12,
          maxWidth: 220,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={displayName || user.email}
      >
        {displayName || user.email}
      </div>

      <button
        onClick={onLogout}
        type="button"
        style={{
          height: 40,
          padding: "0 14px",
          borderRadius: 14,
          background: "white",
          border: "1px solid rgba(255,255,255,0.9)",
          color: "#332A44",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}
