import "./globals.css";
import Image from "next/image";
import HeaderAuth from "./_components/HeaderAuth";
import { AuthProvider } from "./_components/AuthProvider";

export const metadata = {
  title: "Fit im Garten",
  description: "Termine, Übungen, Workouts und Fotos",
};

function NavLink({ href, children }) {
  return (
    <a href={href} className="navlink">
      {children}
    </a>
  );
}

function BottomNavItem({ href, label, icon }) {
  return (
    <a href={href} className="bottomnavitem">
      <span className="text-lg leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <meta name="theme-color" content="#5C4C7C" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>

      <body className="min-h-screen antialiased">
        <AuthProvider>
          {/* HEADER */}
          <header
            className="sticky top-0 z-20 backdrop-blur"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.92)",
              borderBottom: "1px solid rgba(255,255,255,0.14)",
              color: "var(--text-on-brand)",
            }}
          >
            <div className="app-container" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex items-center justify-between gap-3">
                <a href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
                  <div className="relative h-10 w-24 sm:h-12 sm:w-28">
                    <Image
                      src="/fitimgarten-logo.jpg"
                      alt="Fit im Garten Logo"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <span className="hidden sm:inline text-lg" style={{ color: "white", fontWeight: 900 }}>
                    Fit im Garten
                  </span>
                </a>

                <HeaderAuth />
              </div>

              {/* Desktop Navigation (später polieren) */}
              <div className="mt-3 hidden sm:block">
                <nav className="flex flex-wrap gap-2">
                  <NavLink href="/termine">Termine</NavLink>
                  <NavLink href="/uebungen">Übungen</NavLink>
                  <NavLink href="/workouts/neu">Workout erstellen</NavLink>
                  <NavLink href="/workouts">Historie</NavLink>
                  <NavLink href="/fotos">Fotos</NavLink>
                </nav>
              </div>
            </div>
          </header>

          {/* CONTENT: wrapper bleibt, aber wir geben globalen Rhythmus rein */}
          <div className="app-container content-wrap page-shell">
            <div className="content-card">
              <div style={{ padding: 16 }}>{children}</div>
            </div>
          </div>

          {/* BOTTOM NAV */}
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur sm:hidden"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.94)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              color: "var(--text-on-brand)",
            }}
          >
            <div className="app-container" style={{ paddingTop: 10, paddingBottom: 10 }}>
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
