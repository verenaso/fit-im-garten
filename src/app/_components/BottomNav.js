"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname, href) {
  if (!pathname) return false;
  if (pathname === href) return true;

  // ✅ Special-case: /workouts soll NICHT aktiv sein bei /workouts/neu
  if (href === "/workouts" && pathname.startsWith("/workouts/neu")) return false;

  return href !== "/" && pathname.startsWith(href + "/");
}

function NavItem({ href, label, icon }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      style={{
        flex: 1,
        textDecoration: "none",
        color: active ? "rgba(51, 42, 68, 1)" : "rgba(51, 42, 68, 0.62)",
        display: "grid",
        justifyItems: "center",
        gap: 4,
        padding: "10px 6px",
      }}
    >
      <div
        style={{
          width: 42,
          height: 30,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: active ? "rgba(92, 76, 124, 0.12)" : "transparent",
        }}
      >
        <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: active ? 800 : 600, lineHeight: 1 }}>
        {label}
      </div>
    </Link>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4.5 8.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6.5 21h11A3 3 0 0 0 20.5 18V8A3 3 0 0 0 17.5 5h-11A3 3 0 0 0 3.5 8v10A3 3 0 0 0 6.5 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDumbbell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10v4M17 10v4M5 9v6M19 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 11.5a2 2 0 1 0 0-.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M21 16l-5.2-5.2a1.6 1.6 0 0 0-2.3 0L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BottomNav() {
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(51, 42, 68, 0.12)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <NavItem href="/termine" label="Termine" icon={<IconCalendar />} />
        <NavItem href="/uebungen" label="Übungen" icon={<IconDumbbell />} />
        <NavItem href="/workouts/neu" label="Neu" icon={<IconPlus />} />
        <NavItem href="/workouts" label="Historie" icon={<IconHistory />} />
        <NavItem href="/fotos" label="Fotos" icon={<IconPhoto />} />
      </div>
    </nav>
  );
}
