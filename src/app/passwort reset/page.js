"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PasswortResetPage() {
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function setPassword(e) {
    e.preventDefault();
    setMsg("");

    if (pw1.length < 6) return setMsg("Passwort muss mindestens 6 Zeichen haben.");
    if (pw1 !== pw2) return setMsg("Passwörter sind nicht identisch.");

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setLoading(false);
      return setMsg("Kein gültiger Reset/Login-Token gefunden. Bitte den Reset-Link erneut öffnen.");
    }

    const { error } = await supabase.auth.updateUser({ password: pw1 });

    if (error) setMsg(error.message);
    else {
      setMsg("Passwort gesetzt! Du bist jetzt eingeloggt.");
      router.push("/termine");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Neues Passwort setzen</h1>
      <p className="mt-2 text-gray-600">
        Öffne diese Seite über den Passwort-Reset-Link aus der E-Mail. Dann kannst du dein neues Passwort speichern.
      </p>

      <form onSubmit={setPassword} className="mt-6 space-y-3">
        <div>
          <label className="text-sm font-medium">Neues Passwort</label>
          <input
            className="mt-1 w-full rounded-xl border p-3"
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Neues Passwort wiederholen</label>
          <input
            className="mt-1 w-full rounded-xl border p-3"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
          />
        </div>

        <button className="w-full rounded-xl border p-3 font-semibold" disabled={loading} type="submit">
          {loading ? "…" : "Passwort speichern"}
        </button>

        {msg ? <div className="rounded-xl border p-3 text-sm">{msg}</div> : null}
      </form>
    </div>
  );
}
