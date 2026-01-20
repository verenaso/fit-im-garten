"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const MAX_LOADING_MS = 2500;

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  refresh: async () => {},
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

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      setUser(u);
      setRole(u ? await fetchRole(u.id) : null);
    } catch (e) {
      console.error("Auth refresh error:", e);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    // Failsafe: niemals endlos "Prüfe Login…"
    const timer = setTimeout(() => {
      if (cancelled) return;
      console.warn("Auth loading timeout – stop loading to avoid endless spinner");
      setLoading(false);
    }, MAX_LOADING_MS);

    refresh().finally(() => clearTimeout(timer));

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;
        setLoading(true);

        const u = session?.user ?? null;
        setUser(u);
        setRole(u ? await fetchRole(u.id) : null);
      } catch (e) {
        console.error("Auth onAuthStateChange error:", e);
        setUser(null);
        setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
