import "./globals.css";
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
      className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </a>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
        <AuthProvider>
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <a href="/" className="flex items-center gap-2 font-bold">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-white shadow-sm">
                      🌿
                    </span>
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

          <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
