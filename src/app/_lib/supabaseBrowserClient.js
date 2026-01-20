"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../_lib/supabaseBrowserClient";
import { useAuth } from "../../_components/AuthProvider";

function uid() {
  return Math.random().toString(16).slice(2);
}

export default function PollWidget() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user, role, loading: authLoading } = useAuth();

  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [counts, setCounts] = useState({}); // option_id -> votes
  const [myVotes, setMyVotes] = useState(new Set()); // option_id
  const [error, setError] = useState("");

  // Admin editor state
  const [adminOpen, setAdminOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftAllowMulti, setDraftAllowMulti] = useState(true);
  const [draftMaxVotes, setDraftMaxVotes] = useState(2);
  const [draftIsOpen, setDraftIsOpen] = useState(true);
  const [draftClosesAt, setDraftClosesAt] = useState("");
  const [draftOptions, setDraftOptions] = useState([
    { key: uid(), label: "" },
    { key: uid(), label: "" },
  ]);

  async function loadActivePoll() {
    setError("");
    setLoading(true);

    try {
      // aktive Poll
      const { data: pollData, error: pollErr } = await supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pollErr) throw pollErr;

      if (!pollData) {
        setPoll(null);
        setOptions([]);
        setCounts({});
        setMyVotes(new Set());
        setLoading(false);
        return;
      }

      setPoll(pollData);

      // Optionen
      const { data: optData, error: optErr } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollData.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (optErr) throw optErr;

      setOptions(optData || []);

      // Counts
      const { data: countData, error: countErr } = await supabase
        .from("poll_option_counts")
        .select("option_id,votes")
        .eq("poll_id", pollData.id);

      if (countErr) throw countErr;

      const map = {};
      for (const row of countData || []) map[row.option_id] = row.votes;
      setCounts(map);

      // eigene Votes
      if (user?.id) {
        const { data: myVoteData, error: myVoteErr } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollData.id)
          .eq("user_id", user.id);

        if (myVoteErr) throw myVoteErr;

        setMyVotes(new Set((myVoteData || []).map((r) => r.option_id)));
      } else {
        setMyVotes(new Set());
      }
    } catch (e) {
      setError(e?.message || "Fehler beim Laden der Abstimmung.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) loadActivePoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  function isPollClosed(p) {
    if (!p) return true;
    if (!p.is_open) return true;
    if (p.closes_at) {
      const close = new Date(p.closes_at).getTime();
      if (!Number.isNaN(close) && Date.now() > close) return true;
    }
    return false;
  }

  const closed = isPollClosed(poll);

  function toggleOption(optionId) {
    if (!poll || closed) return;

    const next = new Set(myVotes);

    const already = next.has(optionId);

    if (already) {
      next.delete(optionId);
      setMyVotes(next);
      return;
    }

    // if single-choice
    if (!poll.allow_multi || poll.max_votes <= 1) {
      next.clear();
      next.add(optionId);
      setMyVotes(next);
      return;
    }

    // multi-choice with max
    if (next.size >= poll.max_votes) return;
    next.add(optionId);
    setMyVotes(next);
  }

  async function saveVotes() {
    if (!poll || !user?.id) return;
    if (closed) return;

    setError("");
    setLoading(true);

    try {
      // Bestehende Votes laden, delta berechnen
      const { data: existing, error: exErr } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);

      if (exErr) throw exErr;

      const existingSet = new Set((existing || []).map((r) => r.option_id));

      const toInsert = [...myVotes].filter((id) => !existingSet.has(id));
      const toDelete = [...existingSet].filter((id) => !myVotes.has(id));

      // Delete
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .in("option_id", toDelete);

        if (delErr) throw delErr;
      }

      // Insert
      if (toInsert.length > 0) {
        const rows = toInsert.map((option_id) => ({
          poll_id: poll.id,
          option_id,
          user_id: user.id,
        }));

        const { error: insErr } = await supabase.from("poll_votes").insert(rows);
        if (insErr) throw insErr;
      }

      await loadActivePoll();
    } catch (e) {
      setError(e?.message || "Fehler beim Speichern der Stimme.");
    } finally {
      setLoading(false);
    }
  }

  async function resetMyVotes() {
    if (!poll || !user?.id) return;

    setError("");
    setLoading(true);

    try {
      const { error: delErr } = await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);

      if (delErr) throw delErr;

      setMyVotes(new Set());
      await loadActivePoll();
    } catch (e) {
      setError(e?.message || "Fehler beim Zurücksetzen.");
    } finally {
      setLoading(false);
    }
  }

  function openAdminWithPoll(p) {
    if (!p) {
      setDraftTitle("");
      setDraftDesc("");
      setDraftAllowMulti(true);
      setDraftMaxVotes(2);
      setDraftIsOpen(true);
      setDraftClosesAt("");
      setDraftOptions([{ key: uid(), label: "" }, { key: uid(), label: "" }]);
      setAdminOpen(true);
      return;
    }

    setDraftTitle(p.title || "");
    setDraftDesc(p.description || "");
    setDraftAllowMulti(!!p.allow_multi);
    setDraftMaxVotes(Math.max(1, Number(p.max_votes || 1)));
    setDraftIsOpen(!!p.is_open);
    setDraftClosesAt(p.closes_at ? new Date(p.closes_at).toISOString().slice(0, 16) : "");

    const mapped = (options || []).map((o) => ({ key: o.id, label: o.label }));
    setDraftOptions(mapped.length >= 2 ? mapped : [{ key: uid(), label: "" }, { key: uid(), label: "" }]);

    setAdminOpen(true);
  }

  async function saveAdminPoll() {
    setError("");

    const cleanOptions = draftOptions
      .map((o) => ({ key: o.key, label: (o.label || "").trim() }))
      .filter((o) => o.label.length > 0);

    if (draftTitle.trim().length === 0) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Bitte mindestens 2 Optionen angeben.");
      return;
    }

    const maxVotes = draftAllowMulti ? Math.max(1, Number(draftMaxVotes || 1)) : 1;

    setLoading(true);

    try {
      let pollId = poll?.id || null;

      // Wenn es noch keine aktive Poll gibt, erstellen wir eine neue und setzen sie aktiv.
      // Wenn es eine gibt, wird sie editiert.
      if (!pollId) {
        const { data: ins, error: insErr } = await supabase
          .from("polls")
          .insert({
            title: draftTitle.trim(),
            description: draftDesc.trim() || null,
            is_active: true,
            is_open: draftIsOpen,
            allow_multi: draftAllowMulti,
            max_votes: maxVotes,
            closes_at: draftClosesAt ? new Date(draftClosesAt).toISOString() : null,
            created_by: user?.id || null,
          })
          .select("*")
          .single();

        if (insErr) throw insErr;
        pollId = ins.id;
      } else {
        // Update bestehende
        const { error: upErr } = await supabase
          .from("polls")
          .update({
            title: draftTitle.trim(),
            description: draftDesc.trim() || null,
            is_open: draftIsOpen,
            allow_multi: draftAllowMulti,
            max_votes: maxVotes,
            closes_at: draftClosesAt ? new Date(draftClosesAt).toISOString() : null,
          })
          .eq("id", pollId);

        if (upErr) throw upErr;
      }

      // Optionen: einfach "ersetzen" (löschen + neu) ist am stabilsten
      // (cascade löscht votes der Optionen mit)
      const { error: delOptErr } = await supabase
        .from("poll_options")
        .delete()
        .eq("poll_id", pollId);

      if (delOptErr) throw delOptErr;

      const rows = cleanOptions.map((o, idx) => ({
        poll_id: pollId,
        label: o.label,
        sort_order: idx,
      }));

      const { error: insOptErr } = await supabase.from("poll_options").insert(rows);
      if (insOptErr) throw insOptErr;

      setAdminOpen(false);
      await loadActivePoll();
    } catch (e) {
      setError(e?.message || "Fehler beim Speichern der Abstimmung (Admin).");
    } finally {
      setLoading(false);
    }
  }

  async function deletePoll() {
    if (!poll?.id) return;
    if (!confirm("Abstimmung wirklich löschen? (Optionen & Stimmen werden mit gelöscht)")) return;

    setError("");
    setLoading(true);

    try {
      const { error: delErr } = await supabase.from("polls").delete().eq("id", poll.id);
      if (delErr) throw delErr;

      setAdminOpen(false);
      await loadActivePoll();
    } catch (e) {
      setError(e?.message || "Fehler beim Löschen der Abstimmung.");
    } finally {
      setLoading(false);
    }
  }

  // UI helpers
  function optionChecked(optionId) {
    return myVotes.has(optionId);
  }

  function remainingText() {
    if (!poll) return "";
    if (!poll.allow_multi || poll.max_votes <= 1) return "1 Auswahl";
    const used = myVotes.size;
    const max = poll.max_votes;
    return `${used}/${max} gewählt`;
  }

  // Renders
  if (authLoading) return null;

  return (
    <div className="ui-card ui-card-pad-lg" style={{ marginBottom: 16 }}>
      <div className="ui-toolbar" style={{ marginBottom: 10 }}>
        <div className="ui-toolbar-left">
          <div className="ui-section-title" style={{ marginBottom: 0 }}>
            Abstimmung
          </div>
          {poll ? (
            <span className="ui-badge">
              {closed ? "geschlossen" : "offen"} · {remainingText()}
            </span>
          ) : (
            <span className="ui-badge">keine aktive Abstimmung</span>
          )}
        </div>

        {isAdmin ? (
          <div className="ui-toolbar-right">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openAdminWithPoll(poll)}
              disabled={loading}
              type="button"
            >
              {poll ? "Bearbeiten" : "Neue Abstimmung"}
            </button>

            {poll ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={deletePoll}
                disabled={loading}
                type="button"
              >
                Löschen
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="ui-empty" style={{ marginBottom: 12, borderStyle: "solid" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="ui-empty">Lade Abstimmung…</div>
      ) : !poll ? (
        <div className="ui-empty">
          Aktuell gibt es keine aktive Abstimmung.{" "}
          {isAdmin ? "Du kannst oben eine neue erstellen." : ""}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--c-darker)" }}>
              {poll.title}
            </div>
            {poll.description ? (
              <div className="ui-muted" style={{ fontSize: 13, color: "var(--c-darker)" }}>
                {poll.description}
              </div>
            ) : null}
            {poll.closes_at ? (
              <div className="ui-muted" style={{ fontSize: 12, marginTop: 4, color: "var(--c-darker)" }}>
                Ende: {new Date(poll.closes_at).toLocaleString("de-DE")}
              </div>
            ) : null}
          </div>

          <div className="ui-list" style={{ marginBottom: 12 }}>
            {options.map((o) => {
              const checked = optionChecked(o.id);
              const voteCount = counts[o.id] ?? 0;

              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOption(o.id)}
                  className="ui-list-item"
                  disabled={!user?.id || closed}
                  style={{
                    cursor: !user?.id || closed ? "not-allowed" : "pointer",
                    opacity: !user?.id || closed ? 0.75 : 1,
                    background: checked
                      ? "rgba(92, 76, 124, 0.14)"
                      : "rgba(92, 76, 124, 0.05)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    <div style={{ fontWeight: 800, color: "var(--c-darker)" }}>
                      {o.label}
                    </div>
                    <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)" }}>
                      {voteCount} Stimme{voteCount === 1 ? "" : "n"}
                    </div>
                  </div>

                  <span className="ui-badge" style={{ minWidth: 52, justifyContent: "center" }}>
                    {checked ? "✓" : " "}
                  </span>
                </button>
              );
            })}
          </div>

          {!user?.id ? (
            <div className="ui-empty">Bitte einloggen, um abzustimmen.</div>
          ) : closed ? (
            <div className="ui-empty">Diese Abstimmung ist geschlossen.</div>
          ) : (
            <div className="ui-row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetMyVotes}
                disabled={loading}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={saveVotes}
                disabled={loading}
              >
                Abstimmen
              </button>
            </div>
          )}
        </>
      )}

      {/* Admin Editor Modal (simple inline) */}
      {isAdmin && adminOpen ? (
        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid rgba(51, 42, 68, 0.12)",
            paddingTop: 14,
          }}
        >
          <div className="ui-section-title" style={{ marginBottom: 10 }}>
            Admin: Abstimmung konfigurieren
          </div>

          <div className="ui-col">
            <div className="field">
              <div className="label">Titel</div>
              <input
                className="input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="z.B. Nächster Termin – welche Uhrzeit?"
              />
            </div>

            <div className="field">
              <div className="label">Beschreibung (optional)</div>
              <textarea
                className="textarea"
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="z.B. Bitte stimmt bis Mittwoch ab."
              />
            </div>

            <div className="ui-row" style={{ flexWrap: "wrap" }}>
              <label className="ui-row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draftIsOpen}
                  onChange={(e) => setDraftIsOpen(e.target.checked)}
                />
                <span style={{ color: "var(--c-darker)", fontWeight: 700 }}>offen</span>
              </label>

              <label className="ui-row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draftAllowMulti}
                  onChange={(e) => setDraftAllowMulti(e.target.checked)}
                />
                <span style={{ color: "var(--c-darker)", fontWeight: 700 }}>Mehrfachauswahl</span>
              </label>

              <div className="field" style={{ minWidth: 140 }}>
                <div className="label">Max. Stimmen</div>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={draftAllowMulti ? draftMaxVotes : 1}
                  onChange={(e) => setDraftMaxVotes(e.target.value)}
                  disabled={!draftAllowMulti}
                />
              </div>

              <div className="field" style={{ minWidth: 220 }}>
                <div className="label">Ende (optional)</div>
                <input
                  className="input"
                  type="datetime-local"
                  value={draftClosesAt}
                  onChange={(e) => setDraftClosesAt(e.target.value)}
                />
              </div>
            </div>

            <div className="ui-card ui-card-pad" style={{ background: "rgba(92, 76, 124, 0.05)" }}>
              <div className="label" style={{ marginBottom: 8 }}>
                Optionen
              </div>

              <div className="ui-col">
                {draftOptions.map((o, idx) => (
                  <div key={o.key} className="ui-row" style={{ alignItems: "stretch" }}>
                    <input
                      className="input"
                      value={o.label}
                      onChange={(e) => {
                        const next = [...draftOptions];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setDraftOptions(next);
                      }}
                      placeholder={`Option ${idx + 1} (z.B. Di 18:00)`}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => {
                        const next = draftOptions.filter((x) => x.key !== o.key);
                        setDraftOptions(next.length >= 2 ? next : next.concat({ key: uid(), label: "" }));
                      }}
                      title="Option entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDraftOptions([...draftOptions, { key: uid(), label: "" }])}
                >
                  + Option hinzufügen
                </button>
              </div>
            </div>

            <div className="ui-row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAdminOpen(false)}
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={saveAdminPoll}
                disabled={loading}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
