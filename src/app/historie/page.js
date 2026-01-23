"use client";

import PageHeader from "../_components/PageHeader";
import { useAuth } from "../_components/AuthProvider";

export default function HistoriePage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen" style={{ paddingBottom: 96 }}>
      <PageHeader title="Historie" subtitle="Was war zuletzt?" />

      {loading ? (
        <p className="mt-6 text-gray-600">Prüfe Login…</p>
      ) : !user ? (
        <p className="mt-6 text-gray-700">Bitte einloggen.</p>
      ) : (
        <div className="mt-6 ui-card ui-card-pad-lg">
          <div style={{ fontWeight: 800, color: "var(--c-darker)" }}>MVP</div>
          <div className="ui-muted" style={{ marginTop: 6 }}>
            Hier kommt später eine Liste vergangener Workouts/Termine.
          </div>
        </div>
      )}
    </main>
  );
}
