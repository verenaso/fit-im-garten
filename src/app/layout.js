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
      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          {/* Mobile first: Header SOLID (kein /80). Blur erst ab sm. */}
          <header className="sticky top-0 z-10 border-b bg-white sm:bg-white/90 sm:backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <a href="/" className="flex items-center gap-3 font-bold">
                    <div className="relative h-12 w-24 sm:h-14 sm:w-28">
                      <Image
                        src="/logo.jpg"
                        alt="Fit im Garten Logo"
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>

                    <span className="text-lg">Fit im Garten</span>
                  </a>

                  <div className="sm:hidden">
                    <HeaderAuth />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <nav className="flex flex-wrap gap-1">
                    <NavLink href="/termine">Termine</NavLink>
                    <NavLink href="/uebungen">Übungen</NavLink>
                    <NavLink href="/workouts/neu">Workout erstellen</NavLink>
                    <NavLink href="/workouts">Historie</NavLink>
                    <NavLink href="/fotos">Fotos</NavLink>
                  </nav>

                  <div className="hidden sm:block">
                    <HeaderAuth />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile first: etwas mehr Luft und klare Karte */}
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
