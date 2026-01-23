"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Profil-Daten
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  // ✅ loading = NUR Session/Auth
  const [loading, setLoading] = useState(true);

  // Optional (stört bestehende Seiten nicht)
  const [profileLoading, setProfileLoading] = useState(false);

  const mountedRef = useRef(false);
  const watchdogRef = useRef(null);

  // verhindert Race Conditions bei schnellen Auth-Wechseln
  const profileFetchTokenRef = useRef(0);

  function startWatchdog() {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setLoading(false);
    }, 3500);
  }

  function clearProfile() {
    setRole(null);
    setDisplayName(null);
  }

  async function fetchProfileInBackground(u) {
    const token = ++profileFetchTokenRef.current;

    if (!u?.id) {
      clearProfile();
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    // ✅ Retry-Strategie: 3 Versuche mit kurzen Delays (hilft bei “manchmal klappt’s nicht”)
    const attempts = [
      { wait: 0 },
      { wait: 350 },
      { wait: 900 },
    ];

    for (let i = 0; i < attempts.length; i++) {
      try {
        if (!mountedRef.current) return;
        if (token !== profileFetchTokenRef.current) return;

        if (attempts[i].wait) await sleep(attempts[i].wait);

        const { data, error } = await supabase
          .from("profiles")
          .select("role, display_name, username")
          .eq("id", u.id)
          .maybeSingle();

        // Falls Request “alt” geworden ist: ignorieren
        if (!mountedRef.current) return;
        if (token !== profileFetchTokenRef.current) return;

        if (error) {
          // nicht sofort aufgeben -> nächster Versuch
          continue;
        }

        // ✅ Erfolgsfall
        setRole(data?.role || null);
        setDisplayName(
          (data?.display_name || data?.username || "").trim() || null
        );
        setProfileLoading(false);
        return;
      } catch {
        // nächster Versuch
      }
    }

    // ✅ Nach allen Versuchen: Profil bleibt leer, aber Auth bleibt stabil
    if (!mountedRef.current) return;
    if (token !== profileFetchTokenRef.current) return;

    clearProfile();
    setProfileLoading(false);
  }

  async function refresh() {
    startWatchdog();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setUser(null);
        clearProfile();
        return;
      }

      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);

      // ✅ Profil unabhängig nachladen (blockiert loading nicht)
      fetchProfileInBackground(sessionUser);
    } catch {
      setUser(null);
      clearProfile();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    // Initial
    refresh();

    // Änderungen (Login/Logout)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      startWatchdog();
      setLoading(true);

      try {
        const nextUser = session?.user || null;
        setUser(nextUser);

        // ✅ Profil unabhängig laden
        fetchProfileInBackground(nextUser);
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
    () => ({
      user,
      role,
      displayName,
      loading, // ✅ nur Auth/Session
      profileLoading, // optional
      refresh,
    }),
    [user, role, displayName, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
