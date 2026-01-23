"use client";

import { useAuth } from "../_components/AuthProvider";

export default function WorkoutsPage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      {loading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : (
        <div className="mt-6 ui-card ui-card-pad-lg">
          <div className="ui-muted">Hier kommt die Workout-Historie.</div>
        </div>
      )}
    </main>
  );
}
