import "./globals.css";
import HeaderAuth from "./_components/HeaderAuth";
import { AuthProvider } from "./_components/AuthProvider";

export const metadata = {
  title: "Fit im Garten",
  description: "Termine, Übungen, Workouts und Fotos",
};

function NavLink({ href, children }) {
  return (
    <a href={href} className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100">
      {children}
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {/* WICHTIG: Provider muss um Header + Seiteninhalt herum */}
        <AuthProvider>
          <header className="sticky top-0 z-10 border-b bg-white">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Links: Titel + (Mobile) Auth */}
                <div className="flex items-center justify-between gap-3">
                  <a href="/" className="font-bold">
                    Fit im Garten
                  </a>

                  {/* Auth nur auf Mobile sichtbar */}
                  <div className="sm:hidden">
                    <HeaderAuth />
                  </div>
                </div>

                {/* Rechts: Navigation + (Desktop) Auth */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <nav className="flex flex-wrap gap-1">
                    <NavLink href="/termine">Termine</NavLink>
                    <NavLink href="/uebungen">Übungen</NavLink>
                    <NavLink href="/workouts/neu">Workout erstellen</NavLink>
                    <NavLink href="/workouts">Historie</NavLink>
                    <NavLink href="/fotos">Fotos</NavLink>
                  </nav>

                  {/* Auth nur auf Desktop sichtbar */}
                  <div className="hidden sm:block">
                    <HeaderAuth />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
