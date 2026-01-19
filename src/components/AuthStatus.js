"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthStatus() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? "");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!email) {
    return (
      <a className="underline text-sm" href="/login">
        Login
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-700">{email}</span>
      <button className="underline" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
