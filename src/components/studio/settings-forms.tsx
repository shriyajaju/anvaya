"use client";

import { Toggle } from "@/components/ui/toggle";
import { useDarkTheme } from "@/lib/theme";
import { archiveSite, updateProfile, updateSiteRules } from "@/server/settings";
import { useState } from "react";

export function ProfileForm({ name, title, email }: { name: string; title: string; email: string }) {
  const [nextName, setName] = useState(name);
  const [nextTitle, setTitle] = useState(title);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-card bg-surface p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void updateProfile({ name: nextName, title: nextTitle }).then((result) => setMessage(result.ok ? "Saved." : result.error ?? "Not saved."));
      }}
    >
      <label className="text-[13px] text-text-2">Name
        <input value={nextName} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-border bg-page px-3" />
      </label>
      <label className="text-[13px] text-text-2">Email
        <input value={email} readOnly className="mt-1 h-10 w-full rounded-button border border-border bg-surface-2 px-3" />
      </label>
      <label className="text-[13px] text-text-2">Job title
        <input value={nextTitle} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-border bg-page px-3" />
      </label>
      <div className="flex items-end">
        <button type="submit" className="h-10 rounded-button bg-primary px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary">Save profile</button>
      </div>
      {message ? <p className="text-[13px] text-text-2">{message}</p> : null}
    </form>
  );
}

export function PreferencesForm() {
  const [dark, setDark] = useDarkTheme();
  const [previewLight, setPreviewLight] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("anvaya-preview-theme") === "light",
  );
  return (
    <section className="rounded-card bg-surface p-5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Preferences</h2>
      <div className="mt-3 flex items-center justify-between border-b border-border py-3">
        <span>Dark mode</span>
        <Toggle label="Dark mode" state={dark} onStateChange={(next) => {
          setDark(next);
          const theme = next ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", theme);
          window.localStorage.setItem("anvaya-theme", theme);
        }} />
      </div>
      <div className="flex items-center justify-between py-3">
        <span>Visitor preview light</span>
        <Toggle label="Visitor preview light" state={previewLight} onStateChange={(next) => {
          setPreviewLight(next);
          window.localStorage.setItem("anvaya-preview-theme", next ? "light" : "dark");
        }} />
      </div>
    </section>
  );
}

export function SiteRulesForm({
  siteId,
  requireReview,
  showAssumptions,
  showAlternatives,
  collectFeedback,
  requireSourceForHigh,
  canEdit,
}: {
  siteId: string;
  requireReview: boolean;
  showAssumptions: boolean;
  showAlternatives: boolean;
  collectFeedback: boolean;
  requireSourceForHigh: boolean;
  canEdit: boolean;
}) {
  const [rules, setRules] = useState({ requireReview, showAssumptions, showAlternatives, collectFeedback, requireSourceForHigh });
  const [message, setMessage] = useState<string | null>(null);
  function save(next: typeof rules) {
    setRules(next);
    void updateSiteRules({ siteId, ...next }).then((result) => setMessage(result.ok ? "Saved." : result.error ?? "Not saved."));
  }
  const rows = [
    ["requireReview", "Require review before publish"],
    ["showAssumptions", "Show assumptions to visitors"],
    ["showAlternatives", "Show alternatives to visitors"],
    ["collectFeedback", "Collect visitor feedback"],
    ["requireSourceForHigh", "Require a source for High"],
  ] as const;
  return (
    <section className="rounded-card bg-surface p-5">
      {rows.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between border-b border-border py-3 last:border-0">
          <span>{label}</span>
          <Toggle label={label} disabled={!canEdit} state={rules[key]} onStateChange={(value) => save({ ...rules, [key]: value })} />
        </div>
      ))}
      {message ? <p className="pt-2 text-[13px] text-text-2">{message}</p> : null}
    </section>
  );
}

export function ArchiveSite({ siteId, name }: { siteId: string; name: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section className="rounded-card border border-conf-low p-5">
      <div className="flex items-center justify-between gap-4">
        <p>Archive {name}. Published versions stay readable.</p>
        <button type="button" className="text-[13px] font-medium uppercase tracking-[0.08em] text-conf-low" onClick={() => { void archiveSite(siteId).then((result) => setMessage(result.ok ? "Archived." : result.error ?? "Not archived.")); }}>
          Archive site
        </button>
      </div>
      {message ? <p className="pt-2 text-[13px]">{message}</p> : null}
    </section>
  );
}
