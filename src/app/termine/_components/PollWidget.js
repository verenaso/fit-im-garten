"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../_components/AuthProvider";

function uniq(arr) {
  return [...new Set(arr)];
}

function maskUserId(id) {
  if (!id) return "Unbekannt";
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
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
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profErr) throw profErr;

        for (const p of profs || []) profileMap[p.id] = p?.display_name || null;
      }

      const map = {};
      for (const v of allVotes || []) {
        const name = profileMap[v.user_id] || maskUserId(v.user_id);
        if (!map[v.option_id]) map[v.option_id] = [];
        map[v.option_id].push(name);
      }

      const cleaned = {};
      for (const [optionId, arr] of Object.entries(map)) {
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

  function renderNames(optionId) {
    const list = namesByOption[optionId] || [];
    if (list.length === 0) return null;

    return (
      <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)", marginTop: 6 }}>
        <div style={{ fontWeight: 700, opacity: 0.9 }}>Abgestimmt:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {list.map((x) => (
            <span key={x} className="ui-badge" style={{ fontSize: 11 }}>
              {x}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (authLoading) return null;

  return (
    <div className="ui-card ui-card-pad-lg" style={{ marginBottom: 16 }}>
      <div className="ui-toolbar" style={{ marginBottom: 10 }}>
        <div className="ui-toolbar-left">
          <div className="ui-section-title" style={{ marginBottom: 0 }}>
            Abstimmung
          </div>
          {poll ? (
            <span className="ui-badge">{closed ? "geschlossen" : "offen"}</span>
          ) : (
            <span className="ui-badge">keine aktive Abstimmung</span>
          )}
        </div>
        {isAdmin ? <div className="ui-toolbar-right" /> : null}
      </div>

      {error ? (
        <div className="ui-empty" style={{ marginBottom: 12, borderStyle: "solid" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="ui-empty">Lade Abstimmung…</div>
      ) : !poll ? (
        <div className="ui-empty">Aktuell gibt es keine aktive Abstimmung.</div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--c-darker)" }}>{poll.title}</div>
            {poll.description ? (
              <div className="ui-muted" style={{ fontSize: 13, color: "var(--c-darker)" }}>
                {poll.description}
              </div>
            ) : null}
          </div>

          <div className="ui-list" style={{ marginBottom: 12 }}>
            {options.map((o) => {
              const checked = myVotes.has(o.id);
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
                    background: checked ? "rgba(92, 76, 124, 0.14)" : "rgba(92, 76, 124, 0.05)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                    <div style={{ fontWeight: 800, color: "var(--c-darker)" }}>{o.label}</div>
                    <div className="ui-muted" style={{ fontSize: 12, color: "var(--c-darker)" }}>
                      {voteCount} Stimme{voteCount === 1 ? "" : "n"}
                    </div>
                    {renderNames(o.id)}
                  </div>

                  <span className="ui-badge" style={{ minWidth: 52, justifyContent: "center", alignSelf: "flex-start" }}>
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
              <button type="button" className="btn btn-primary btn-sm" onClick={saveVotes} disabled={loading}>
                Abstimmen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
