"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient"; // RELATIV, kein @ alias

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
});

async function fetchRole(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!error && data?.role) return data.role;
  return "member";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        const u = data?.session?.user ?? null;
        setUser(u);

        if (u) {
          const r = await fetchRole(u.id);
          if (!cancelled) setRole(r);
        } else {
          setRole(null);
        }
      } catch (e) {
        // Falls etwas schiefgeht: nicht hängen bleiben
        console.error("AuthProvider init error:", e);
        if (!cancelled) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;
        setLoading(true);

        const u = session?.user ?? null;
        setUser(u);

        if (u) setRole(await fetchRole(u.id));
        else setRole(null);
      } catch (e) {
        console.error("AuthProvider onAuthStateChange error:", e);
        setUser(null);
        setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
