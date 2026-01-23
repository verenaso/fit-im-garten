"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../_components/AuthProvider";

function uid() {
  return Math.random().toString(16).slice(2);
}

function uniq(arr) {
  return [...new Set(arr)];
}

function maskUserId(id) {
  if (!id) return "Unbekannt";
  return `${String(id).slice(0, 6)}…${String(id).slice(-4)}`;
}

function toLocalDatetimeInputValue(iso) {
  try {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function toISOFromDatetimeLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function PollWidget() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [counts, setCounts] = useState({});
  const [myVotes, setMyVotes] = useState(new Set());
  const [namesByOption, setNamesByOption] = useState({});
  const [error, setError] = useState("");

  // Admin editor
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

  async function getNameMapForUserIds(userIds) {
    const ids = uniq((userIds || []).filter(Boolean).map((x) => String(x)));
    if (ids.length === 0) return {};

    // 1) RPC
    try {
      const { data: rows, error: rpcErr } = await supabase.rpc("get_profile_names", { ids });
      if (rpcErr) throw rpcErr;

      const map = {};
      for (const r of rows || []) {
        const k = String(r.id);
        const n = (r.name || "").trim();
        if (n) map[k] = n;
      }
      if (Object.keys(map).length > 0) return map;
    } catch {
      // ignore -> fallback
    }

    // 2) Fallback profiles
    const { data: profs, error: pe } = await supabase
      .from("profiles")
      .select('id, "Display name", display_name, username')
      .in("id", ids);

    if (pe) throw pe;

    const map = {};
    for (const p of profs || []) {
      const k = String(p.id);
      const n =
        String(p["Display name"] || "").trim() ||
        String(p.display_name || "").trim() ||
        String(p.username || "").trim();
      if (n) map[k] = n;
    }
    return map;
  }

  async function loadActivePoll() {
    setError("");
    setLoading(true);

    try {
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
        setNamesByOption({});
        return;
      }

      setPoll(pollData);

      const { data: optData, error: optErr } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollData.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (optErr) throw optErr;
      setOptions(optData || []);

      const { data: countData, error: countErr } = await supabase
        .from("poll_option_counts")
        .select("option_id,votes")
        .eq("poll_id", pollData.id);

      if (countErr) throw countErr;

      const countMap = {};
      for (const row of countData || []) countMap[row.option_id] = row.votes;
      setCounts(countMap);

      const { data: allVotes, error: votesErr } = await supabase
        .from("poll_votes")
        .select("option_id,user_id")
        .eq("poll_id", pollData.id);

      if (votesErr) throw votesErr;

      const userIds = uniq((allVotes || []).map((v) => v.user_id).filter(Boolean));

      let profileMap = {};
      if (userIds.length > 0) {
        profileMap = await getNameMapForUserIds(userIds);
      }

      const mapByOption = {};
      for (const v of allVotes || []) {
        const k = String(v.user_id);
        const name = profileMap[k] || maskUserId(k);
        if (!mapByOption[v.option_id]) mapByOption[v.option_id] = [];
        mapByOption[v.option_id].push(name);
      }

      const cleaned = {};
      for (const [optionId, arr] of Object.entries(mapByOption)) {
        cleaned[optionId] = uniq(arr).sort((a, b) => a.localeCompare(b, "de"));
      }
      setNamesByOption(cleaned);

      if (user?.id) {
        const { data: myVoteRows, error: myVoteErr } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollData.id)
          .eq("user_id", user.id);

        if (myVoteErr) throw myVoteErr;
        setMyVotes(new Set((myVoteRows || []).map((r) => r.option_id)));
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
    if (authLoading) return;
    loadActivePoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  function toggleOption(optionId) {
    if (!poll || closed) return;

    const next = new Set(myVotes);
    const already = next.has(optionId);

    if (already) {
      next.delete(optionId);
      setMyVotes(next);
      return;
    }

    if (!poll.allow_multi || Number(poll.max_votes || 1) <= 1) {
      next.clear();
      next.add(optionId);
      setMyVotes(next);
      return;
    }

    const max = Math.max(1, Number(poll.max_votes || 1));
    if (next.size >= max) return;

    next.add(optionId);
    setMyVotes(next);
  }

  async function saveVotes() {
    if (!poll || !user?.id || closed) return;

    setError("");
    setLoading(true);

    try {
      const { data: existing, error: exErr } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);

      if (exErr) throw exErr;

      const existingSet = new Set((existing || []).map((r) => r.option_id));
      const toInsert = [...myVotes].filter((id) => !existingSet.has(id));
      const toDelete = [...existingSet].filter((id) => !myVotes.has(id));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .in("option_id", toDelete);

        if (delErr) throw delErr;
      }

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
    setDraftClosesAt(p.closes_at ? toLocalDatetimeInputValue(p.closes_at) : "");

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
            closes_at: draftClosesAt ? toISOFromDatetimeLocal(draftClosesAt) : null,
            created_by: user?.id || null,
          })
          .select("*")
          .single();

        if (insErr) throw insErr;
        pollId = ins.id;
      } else {
        const { error: upErr } = await supabase
          .from("polls")
          .update({
            title: draftTitle.trim(),
            description: draftDesc.trim() || null,
            is_open: draftIsOpen,
            allow_multi: draftAllowMulti,
            max_votes: maxVotes,
            closes_at: draftClosesAt ? toISOFromDatetimeLocal(draftClosesAt) : null,
          })
          .eq("id", pollId);

        if (upErr) throw upErr;
      }

      const { error: delOptErr } = await supabase.from("poll_options").delete().eq("poll_id", pollId);
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
    const ok = confirm("Abstimmung wirklich löschen? (Optionen & Stimmen werden mit gelöscht)");
    if (!ok) return;

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

  function remainingText() {
    if (!poll) return "";
    if (!poll.allow_multi || Number(poll.max_votes || 1) <= 1) return "1 Auswahl";
    const used = myVotes.size;
    const max = Math.max(1, Number(poll.max_votes || 1));
    return `${used}/${max} gewählt`;
  }

  function renderNames(optionId) {
    const list = namesByOption[optionId] || [];
    if (list.length === 0) return null;

    const maxShow = 12;
    const shown = list.slice(0, maxShow);
    const rest = list.length - shown.length;

    return (
      <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)", marginTop: 8 }}>
        <div style={{ fontWeight: 700, opacity: 0.9 }}>Abgestimmt:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {shown.map((x) => (
            <span key={x} className="ui-badge" style={{ fontSize: 11 }}>
              {x}
            </span>
          ))}
          {rest > 0 ? (
            <span className="ui-badge" style={{ fontSize: 11 }}>
              +{rest}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (authLoading) return null;

  return (
    <div>
      {/* Header / Status */}
      <div className="ui-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div className="ui-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {poll ? (
            <>
              <span
                className="ui-badge"
                style={{
                  background: closed ? "rgba(0,0,0,0.06)" : "rgba(17,17,17,0.10)",
                  color: "var(--c-darker)",
                  border: "1px solid rgba(51, 42, 68, 0.14)",
                }}
              >
                {closed ? "geschlossen" : "offen"}
              </span>
              <span className="ui-badge">{remainingText()}</span>
            </>
          ) : (
            <span className="ui-badge">keine aktive Abstimmung</span>
          )}
        </div>

        {isAdmin ? (
          <div className="ui-row" style={{ gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openAdminWithPoll(poll)}
              disabled={loading}
              type="button"
            >
              {poll ? "Bearbeiten" : "Neue Abstimmung"}
            </button>

            {poll ? (
              <button className="btn btn-danger btn-sm" onClick={deletePoll} disabled={loading} type="button">
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
          Aktuell gibt es keine aktive Abstimmung. {isAdmin ? "Du kannst oben eine neue erstellen." : ""}
        </div>
      ) : (
        <>
          {/* Title + description */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "var(--c-darker)", lineHeight: 1.2 }}>
              {poll.title}
            </div>

            {poll.description ? (
              <div className="ui-muted" style={{ fontSize: 13, marginTop: 6, color: "var(--c-darker)" }}>
                {poll.description}
              </div>
            ) : null}

            {poll.closes_at ? (
              <div className="ui-muted" style={{ fontSize: 12, marginTop: 6, color: "var(--c-darker)" }}>
                Ende: {new Date(poll.closes_at).toLocaleString("de-DE")}
              </div>
            ) : null}

            {!closed && user?.id ? (
              <div className="ui-muted" style={{ fontSize: 12, marginTop: 8, color: "var(--c-darker)" }}>
                Tipp: Du kannst deine Auswahl jederzeit ändern und erneut speichern.
              </div>
            ) : null}
          </div>

          {/* Options as clear click targets */}
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            {options.map((o) => {
              const checked = myVotes.has(o.id);
              const voteCount = counts[o.id] ?? 0;

              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOption(o.id)}
                  disabled={!user?.id || closed}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: checked
                      ? "2px solid rgba(17,17,17,0.9)"
                      : "1px solid rgba(51, 42, 68, 0.18)",
                    background: checked ? "rgba(17,17,17,0.92)" : "rgba(92, 76, 124, 0.06)",
                    color: checked ? "#fff" : "var(--c-darker)",
                    cursor: !user?.id || closed ? "not-allowed" : "pointer",
                    opacity: !user?.id || closed ? 0.75 : 1,
                    boxShadow: checked ? "0 1px 0 rgba(0,0,0,0.06)" : "none",
                    transform: checked ? "translateY(-1px)" : "none",
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{o.label}</div>
                      <span
                        className="ui-badge"
                        style={{
                          minWidth: 44,
                          justifyContent: "center",
                          background: checked ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.06)",
                          color: checked ? "#fff" : "var(--c-darker)",
                          border: "1px solid rgba(51, 42, 68, 0.14)",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, opacity: checked ? 0.9 : 0.85 }}>
                      {voteCount} Stimme{voteCount === 1 ? "" : "n"}
                    </div>

                    {renderNames(o.id)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          {!user?.id ? (
            <div className="ui-empty">Bitte einloggen, um abzustimmen.</div>
          ) : closed ? (
            <div className="ui-empty">Diese Abstimmung ist geschlossen.</div>
          ) : (
            <div className="ui-row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetMyVotes} disabled={loading}>
                Zurücksetzen
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveVotes} disabled={loading}>
                Stimme speichern
              </button>
            </div>
          )}
        </>
      )}

      {/* Admin editor (unchanged logic, but inside a clean divider) */}
      {isAdmin && adminOpen ? (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(51, 42, 68, 0.12)", paddingTop: 14 }}>
          <div className="ui-section-title" style={{ marginBottom: 10 }}>
            Admin: Abstimmung konfigurieren
          </div>

          <div className="ui-col">
            <div className="field">
              <div className="label">Titel</div>
              <input className="input" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            </div>

            <div className="field">
              <div className="label">Beschreibung (optional)</div>
              <textarea className="textarea" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
            </div>

            <div className="ui-row" style={{ flexWrap: "wrap" }}>
              <label className="ui-row" style={{ gap: 8 }}>
                <input type="checkbox" checked={draftIsOpen} onChange={(e) => setDraftIsOpen(e.target.checked)} />
                <span style={{ color: "var(--c-darker)", fontWeight: 700 }}>offen</span>
              </label>

              <label className="ui-row" style={{ gap: 8 }}>
                <input type="checkbox" checked={draftAllowMulti} onChange={(e) => setDraftAllowMulti(e.target.checked)} />
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
                      placeholder={`Option ${idx + 1}`}
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

            <div className="ui-row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdminOpen(false)} disabled={loading}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveAdminPoll} disabled={loading}>
                Speichern
              </button>
            </div>

            <div className="help">
              Hinweis: Beim Speichern werden Optionen neu angelegt (alte Stimmen können dabei verloren gehen).
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
