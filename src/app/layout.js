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
    <a
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-medium text-purple-100 hover:bg-purple-900/40 hover:text-white"
    >
      {children}
    </a>
  );
}

function BottomNavItem({ href, label, icon }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs text-purple-100 hover:bg-purple-900/40"
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>
          <header className="sticky top-0 z-10 border-b border-purple-800 bg-purple-950/90 backdrop-blur">
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
                  <span className="hidden sm:inline text-lg text-white">Fit im Garten</span>
                </a>

                <HeaderAuth />
              </div>

              {/* Desktop-Navigation */}
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

          {/* Content: Platz für Bottom Nav */}
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 pb-24 sm:pb-8">
            <div className="card p-5 sm:p-8">{children}</div>
          </div>

          {/* Bottom Nav: nur Mobile */}
          <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-800 bg-purple-950/95 backdrop-blur sm:hidden">
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
