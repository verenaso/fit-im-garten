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
          <header className="app-header">
            <div className="app-container app-header-inner">
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

                  <div className="hidden sm:block" style={{ lineHeight: 1.05, color: "white" }}>
                    <div style={{ fontWeight: 900, letterSpacing: "0.2px" }}>Fit im Garten</div>
                    <div style={{ fontSize: 12, opacity: 0.82 }}>Workouts · Termine · Community</div>
                  </div>
                </a>

                <HeaderAuth />
              </div>

              {/* Desktop Nav */}
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

          {/* CONTENT: kein Card-Container mehr */}
          <div className="app-container app-content">{children}</div>

          {/* BOTTOM NAV */}
          <nav className="app-bottomnav sm:hidden">
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
