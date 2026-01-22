"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  const watchdogRef = useRef(null);
  const mountedRef = useRef(false);

  function startWatchdog() {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setLoading(false);
    }, 3500);
  }

  async function fetchProfile(u) {
    if (!u?.id) {
      setRole(null);
      setDisplayName(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", u.id)
        .maybeSingle();

      if (error) {
        setRole(null);
        setDisplayName(null);
        return;
      }

      setRole(data?.role || null);
      setDisplayName(data?.display_name || null);
    } catch {
      setRole(null);
      setDisplayName(null);
    }
  }

  async function refresh() {
    startWatchdog();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setUser(null);
        await fetchProfile(null);
        return;
      }

      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);
      await fetchProfile(sessionUser);
    } catch {
      setUser(null);
      await fetchProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      startWatchdog();
      setLoading(true);
      try {
        const nextUser = session?.user || null;
        setUser(nextUser);
        await fetchProfile(nextUser);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, role, displayName, loading, refresh }),
    [user, role, displayName, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
