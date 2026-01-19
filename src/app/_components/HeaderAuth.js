"use client";

import { supabase } from "../../lib/supabaseClient"; // RELATIV
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const { user, role, loading } = useAuth();

  async function onLogout() {
    await supabase.auth.signOut();
  }

  if (loading) return <div className="text-sm text-gray-600">…</div>;

  if (!user) {
    return (
      <a className="rounded-lg border px-3 py-2 text-sm" href="/login">
        Login
      </a>
    );
  }

  const badge = role === "admin" ? "Admin" : role === "member" ? "Mitglied" : "";

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-gray-700">
        {user.email}{" "}
        {badge ? (
          <span className="ml-1 rounded-full border px-2 py-0.5 text-xs">
            {badge}
          </span>
        ) : null}
      </div>
      <button className="rounded-lg border px-3 py-2 text-sm" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}
