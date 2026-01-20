"use client";

import "./globals.css";
import Image from "next/image";
import { usePathname } from "next/navigation";
import HeaderAuth from "./_components/HeaderAuth";
import { AuthProvider } from "./_components/AuthProvider";

function isActivePath(pathname, href) {
  if (!pathname) return false;

  // Exakt match
  if (pathname === href) return true;

  // Sonderfall: /workouts/neu soll NICHT auch "Historie" (/workouts) aktivieren
  if (href === "/workouts" && pathname.startsWith("/workouts/")) {
    if (pathname.startsWith("/workouts/neu")) return false;
    return true;
  }

  // Generisches Prefix-Matching für Unterseiten (außer "/")
  if (href !== "/" && pathname.startsWith(href + "/")) return true;

  return false;
}

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <a
      href={href}
      className={`navlink${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </a>
  );
}

function BottomNavItem({ href, label, icon }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <a
      href={href}
      className={`bottomnavitem${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        {/* Mobile Browser UI Farbe */}
        <meta name="theme-color" content="#5C4C7C" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>

      <body className="min-h-screen antialiased">
        <AuthProvider>
          {/* HEADER (lila) */}
          <header
            className="sticky top-0 z-10 backdrop-blur"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.85)",
              borderBottom: "1px solid var(--c-dark)",
              color: "var(--c-text)",
            }}
          >
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <a
                  href="/"
                  className="flex items-center gap-3 font-bold"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="relative h-12 w-24 sm:h-14 sm:w-28">
                    <Image
                      src="/fitimgarten-logo.jpg"
                      alt="Fit im Garten Logo"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <span className="hidden sm:inline text-lg">Fit im Garten</span>
                </a>

                <HeaderAuth />
              </div>

              {/* Desktop Navigation */}
              <div className="mt-3 hidden sm:block">
                <nav className="flex flex-wrap gap-1">
                  <NavLink href="/termine">Termine</NavLink>
                  <NavLink href="/uebungen">Übungen</NavLink>
                  <NavLink href="/workouts/neu">Workout erstellen</NavLink>
                  <NavLink href="/workouts">Historie</NavLink>
                  <NavLink href="/fotos">Fotos</NavLink>
                </nav>
              </div>
            </div>
          </header>

          {/* CONTENT: weiße Box mit dunkellila Text */}
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 pb-24 sm:pb-8">
            <div
              className="content-card rounded-3xl p-5 shadow-sm sm:p-8"
              style={{
                backgroundColor: "white",
                border: "1px solid rgba(69, 57, 93, 0.25)",
                color: "#332A44",
              }}
            >
              {children}
            </div>
          </div>

          {/* BOTTOM NAV (nur Mobile, lila) */}
          <nav
            className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur sm:hidden"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.92)",
              borderTop: "1px solid var(--c-dark)",
              color: "var(--c-text)",
            }}
          >
            <div className="mx-auto max-w-5xl px-3 py-2">
              <div className="grid grid-cols-5 gap-2">
                <BottomNavItem href="/termine" label="Termine" icon="📅" />
                <BottomNavItem href="/uebungen" label="Übungen" icon="🏋️" />
                <BottomNavItem href="/workouts/neu" label="Neu" icon="➕" />
                <BottomNavItem href="/workouts" label="Historie" icon="🕒" />
                <BottomNavItem href="/fotos" label="Fotos" icon="📸" />
              </div>
            </div>
          </nav>
        </AuthProvider>
      </body>
    </html>
  );
}
