"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  const timeoutRef = useRef(null);

  async function fetchProfile(u) {
    if (!u?.id) {
      setRole(null);
      setDisplayName(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select('role,"Display name"')
      .eq("id", u.id)
      .maybeSingle();

    if (error) {
      setRole(null);
      setDisplayName(null);
      return;
    }

    setRole(data?.role || null);
    setDisplayName(data?.["Display name"] || null);
  }

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);
      await fetchProfile(sessionUser);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    function startTimeoutFailsafe() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!mounted) return;
        setLoading(false);
      }, 8000);
    }

    startTimeoutFailsafe();

    (async () => {
      await refresh();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      startTimeoutFailsafe();
      const nextUser = session?.user || null;
      setUser(nextUser);
      await fetchProfile(nextUser);
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      displayName,
      loading,
      refresh,
    }),
    [user, role, displayName, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
