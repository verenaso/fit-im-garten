"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Logout error:", e);
      } finally {
        window.location.href = "/login";
      }
    })();
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-bold">Logout…</h1>
      <p className="mt-2 text-slate-600">Du wirst abgemeldet.</p>
    </main>
  );
}
