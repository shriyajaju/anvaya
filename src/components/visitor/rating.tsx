"use client";

import { saveFeedback } from "@/server/visitor-actions";
import { useState } from "react";

export function Rating({ siteId, versionId }: { siteId: string; versionId: string | null }) {
  const [understand, setUnderstand] = useState(0);
  const [trust, setTrust] = useState(0);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const sessionId = window.localStorage.getItem("anvaya-session") ?? crypto.randomUUID();
        window.localStorage.setItem("anvaya-session", sessionId);
        void saveFeedback({ siteId, versionId, understand, trust, comment: note, page: "about", sessionId }).then((result) => {
          setMessage(result.ok ? "Thank you. Your response was saved." : result.error ?? "The feedback was not saved.");
        });
      }}
    >
      <Score label="How clear was this?" value={understand} onChange={setUnderstand} />
      <Score label="How much do you trust it?" value={trust} onChange={setTrust} />
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional comment" className="min-h-20 rounded-card bg-surface-2 px-3 py-2 text-[15px]" />
      <button type="submit" disabled={!understand || !trust} className="h-[52px] rounded-card bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black disabled:opacity-40">
        Send feedback
      </button>
      {message ? <p role="status" className="text-[13px] text-text-2">{message}</p> : null}
    </form>
  );
}

function Score({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-[13px] text-text-2">{label}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className={`flex size-10 items-center justify-center rounded-card ${value === score ? "bg-white text-black" : "bg-surface-2"}`}>
            <input type="radio" name={label} value={score} checked={value === score} onChange={() => onChange(score)} className="sr-only" />
            {score}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
