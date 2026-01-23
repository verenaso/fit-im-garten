"use client";

import Link from "next/link";
import { useAuth } from "./_components/AuthProvider";

export default function HomePage() {
  const { user, loading } = useAuth();

  // Optional: wenn eingeloggt, kannst du später direkt weiterleiten/anderen Inhalt zeigen.
  // Für jetzt: nur ausgeloggt relevant.
  if (loading) return null;

  if (user) {
    // MVP: wenn eingeloggt, z.B. direkt zu Termine oder Fotos
    // return <div style={{ padding: 16 }}>Du bist eingeloggt.</div>;
  }

  return (
    <div style={{ padding: 20, paddingBottom: 96 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
        Willkommen bei Fit im Garten.
      </h1>

      <p style={{ marginTop: 14, fontSize: 18, color: "#444", lineHeight: 1.4 }}>
        Hier geht&apos;s zur Registrierung / zum Login.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        <Link href="/login" style={buttonPrimary}>
          Registrierung
        </Link>
        <Link href="/login" style={buttonSecondary}>
          Login
        </Link>
      </div>
    </div>
  );
}

const buttonPrimary = {
  height: 48,
  borderRadius: 14,
  background: "#111",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  textDecoration: "none",
};

const buttonSecondary = {
  height: 48,
  borderRadius: 14,
  background: "#fff",
  color: "#111",
  border: "1px solid #ddd",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  textDecoration: "none",
};
