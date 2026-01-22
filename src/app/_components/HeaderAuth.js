"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function HeaderAuth() {
  const router = useRouter();
  const { user, role } = useAuth();

  // Prefer username/display name, fallback to email
  const username =
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.email ||
    "";

  async function onLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore — we still navigate away
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (!user) {
    return (
      <div className="header-auth">
        <button
          className="header-auth-btn"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
          type="button"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="header-auth">
      <span className="header-auth-name" title={username}>
        {username} {role === "admin" ? "· Admin" : ""}
      </span>

      <button className="header-auth-btn" onClick={onLogout} type="button">
        Logout
      </button>
    </div>
  );
}
