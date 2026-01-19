export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold">Fit im Garten</h1>
      <p className="mt-2 text-gray-600">
        Willkommen! Fit im Garten - jetzt auch digital ;)
      </p>

      <div className="mt-6 space-y-3">
        <a className="block underline" href="/termine">Termine</a>
        <a className="block underline" href="/uebungen">Übungsdatenbank</a>
        <a className="block underline" href="/workouts/neu">Workout erstellen</a>
        <a className="block underline" href="/workouts">Vergangene Workouts</a>
        <a className="block underline" href="/fotos">Fotos</a>
      </div>
    </main>
  );
}

