import "./globals.css";
import Image from "next/image";
import HeaderAuth from "./_components/HeaderAuth";
import { AuthProvider } from "./_components/AuthProvider";

export const metadata = {
  title: "Fit im Garten",
  description: "Termine, Übungen, Workouts und Fotos",
};

// Logo-Farben (aus dem Bild abgeleitet)
const COLORS = {
  base: "#5C4C7C",   // Haupt-Lila (Logo-Hintergrund)
  dark: "#45395D",   // dunkler für Borders/Header
  darker: "#332A44", // noch dunkler für Bottom Nav / Kontrast
  hover: "#85799D",  // hellerer Hover
  text: "#F5F3FF",   // sehr helles Lila/Weiß
  textMuted: "#E6E0F2",
};

function NavLink({ href, children }) {
  return (
    <a
      href={href}
      className={`rounded-xl px-3 py-2 text-sm font-medium
        text-[${COLORS.text}] hover:bg-[${COLORS.hover}]`}
    >
      {children}
    </a>
  );
}

function BottomNavItem({ href, label, icon }) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2
        text-xs text-[${COLORS.text}] hover:bg-[${COLORS.hover}]`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: COLORS.base, color: COLORS.text }}
      >
        <AuthProvider>
          <header
            className="sticky top-0 z-10 backdrop-blur"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.85)", // darker mit Transparenz
              borderBottom: `1px solid ${COLORS.dark}`,
            }}
          >
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <a href="/" className="flex items-center gap-3 font-bold">
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

          {/* Content */}
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 pb-24 sm:pb-8">
            <div
              className="rounded-3xl p-5 shadow-sm sm:p-8"
              style={{
                backgroundColor: "rgba(51, 42, 68, 0.35)",
                border: `1px solid ${COLORS.dark}`,
              }}
            >
              {children}
            </div>
          </div>

          {/* Bottom Nav (Mobile only) */}
          <nav
            className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur sm:hidden"
            style={{
              backgroundColor: "rgba(51, 42, 68, 0.92)",
              borderTop: `1px solid ${COLORS.dark}`,
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

          {/* Kleine globale Text-Farben für häufige “graue” Texte */}
          <style jsx global>{`
            .text-slate-600,
            .text-slate-700,
            .text-slate-800 {
              color: ${COLORS.textMuted} !important;
            }
            .border {
              border-color: ${COLORS.dark} !important;
            }
            .bg-white {
              background: rgba(51, 42, 68, 0.35) !important;
            }
          `}</style>
        </AuthProvider>
      </body>
    </html>
  );
}
