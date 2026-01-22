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
    return <div className="text-sm opacity-80">Prüfe Login…</div>;
  }

  if (!user) {
    return (
      <a className="btn btn-secondary btn-sm" href="/login">
        Login
      </a>
    );
  }

  return (
    <div className="ui-row" style={{ gap: 10 }}>
      <div style={{ textAlign: "right", lineHeight: 1.1 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{displayName || "Eingeloggt"}</div>
      </div>

      <button className="btn btn-ghost btn-sm" onClick={onLogout} type="button">
        Logout
      </button>
    </div>
  );
}
