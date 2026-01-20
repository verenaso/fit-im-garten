"use client";

import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const { user, role, loading } = useAuth();

  async function onLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <div className="text-sm text-purple-200">…</div>;

  if (!user) {
    return (
      <a
        className="rounded-xl border border-purple-700 bg-purple-950/20 px-4 py-2 text-sm text-purple-100 hover:bg-purple-900/30"
        href="/login"
      >
        Login
      </a>
    );
  }

  const badge = role === "admin" ? "Admin" : role === "member" ? "Mitglied" : "";

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block text-sm text-purple-100">
        {user.email}{" "}
        {badge ? (
          <span className="ml-1 rounded-full border border-purple-700 bg-purple-900/30 px-2 py-0.5 text-xs text-purple-100">
            {badge}
          </span>
        ) : null}
      </div>

      <button
        className="rounded-xl border border-purple-700 bg-purple-950/20 px-4 py-2 text-sm text-purple-100 hover:bg-purple-900/30"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );
}
