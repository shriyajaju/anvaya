"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, type ConfidenceLevel } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Toast } from "@/components/ui/toast";
import { focusRing } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/browser";
import {
  deleteRegion,
  saveRegion,
  setCurrentReconstruction,
  uploadReconstruction,
} from "@/server/reconstruction";
import { setConfidence } from "@/server/reconstruct";
import { linkEvidence, unlinkEvidence } from "@/server/evidence";
import type { ImageReconstructData, ReconstructionAttempt, ReconstructionElement } from "@/server/reconstruction-data";
import { motion } from "framer-motion";
import { spring, useMotionEnabled } from "@/components/ui/motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const chip: Record<ReconstructionElement["confidence"], ConfidenceLevel> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const confStroke = {
  high: "var(--color-conf-high)",
  medium: "var(--color-conf-medium)",
  low: "var(--color-conf-low)",
};

export function ReconstructImageBoard({ data }: { data: ImageReconstructData }) {
  const router = useRouter();
  const [photoId, setPhotoId] = useState(data.photos[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>(
    data.elements.filter((element) => element.evidenceCount > 0).map((element) => element.id),
  );
  const [thenNow, setThenNow] = useState(80);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(data.current?.id ?? data.attempts[0]?.id ?? null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
  const [linkElementId, setLinkElementId] = useState(data.elements[0]?.id ?? "");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(data.elements[0]?.id ?? null);
  const [linking, setLinking] = useState(false);
  const motionEnabled = useMotionEnabled();

  const active = data.attempts.find((item) => item.id === activeId) ?? data.current;
  const sourcePhoto = data.photos.find((photo) => photo.id === photoId) ?? data.photos[0];
  const selectedElements = data.elements.filter((element) => selected.includes(element.id));
  const promptPreview = useMemo(() => {
    const names = selectedElements.map((element) => element.name).join("; ") || "—";
    return data.previewPrompt.replace(/: [^.]+\./, `: ${names}.`);
  }, [data.previewPrompt, selectedElements]);

  useEffect(() => {
    if (!active || (active.status !== "queued" && active.status !== "generating")) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/reconstruct?id=${active.id}&siteId=${data.siteId}`);
      if (!response.ok) return;
      const row = (await response.json()) as { status: string };
      if (row.status === "done" || row.status === "failed") {
        router.refresh();
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [active, data.siteId, router]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  }

  async function generate() {
    setError(null);
    setMissing([]);
    if (selected.length === 0) {
      setError("Select at least one element to rebuild.");
      return;
    }
    const without = selectedElements.filter((element) => element.evidenceCount === 0);
    if (without.length > 0) {
      setMissing(without.map((element) => element.name));
      setError("Every selected element needs at least one linked source before generation.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: data.siteId, sourcePhotoId: photoId, elementIds: selected }),
      });
      const body = (await response.json()) as { id?: string; error?: string; missing?: string[] };
      if (!response.ok) {
        setError(body.error ?? "Generation failed.");
        setMissing(body.missing ?? []);
        return;
      }
      if (body.id) setActiveId(body.id);
      showToast("Reconstruction ready.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Sign in again before uploading.");
        return;
      }
      void token;
      const safe = file.name.replace(/[^\w.-]+/g, "-");
      const storagePath = `${data.siteId}/reconstructions/upload-${crypto.randomUUID()}-${safe}`;
      const clientUpload = await supabase.storage.from("assets").upload(storagePath, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (clientUpload.error) {
        setError(clientUpload.error.message);
        return;
      }
      const saved = await uploadReconstruction({
        siteId: data.siteId,
        sourcePhotoId: photoId === "seed-cover" ? null : photoId,
        storagePath,
        filename: file.name,
        elementIds: selected,
      });
      if (!saved.ok) setError(saved.error);
      else {
        setActiveId(saved.id);
        showToast("Uploaded reconstruction saved.");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function commitRegion() {
    if (!active || draft.length < 3 || !linkElementId) return;
    const saved = await saveRegion({
      siteId: data.siteId,
      reconstructionImageId: active.id,
      elementId: linkElementId,
      shape: draft,
    });
    if (!saved.ok) setError(saved.error);
    else {
      setDraft([]);
      setDrawing(false);
      showToast("Region linked.");
      router.refresh();
    }
  }

  const inspect = data.elements.find((element) => element.id === inspectId) ?? null;

  return (
    <div className="grid h-[calc(100vh-7.5rem)] grid-cols-1 gap-4 pt-4 min-[1100px]:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-auto rounded-card bg-surface p-4 shadow-card">
        <div>
          <h1 className="text-[18px] font-medium leading-[26px]">Reconstruct</h1>
          <p className="mt-1 text-[13px] leading-5 text-text-2">
            Choose a site photograph, tick the elements to rebuild, then generate a white wireframe overlay.
          </p>
        </div>

        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Site photograph</h2>
          <div className="mt-2 grid gap-2">
            {data.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPhotoId(photo.id)}
                className={`${focusRing} flex items-center gap-3 rounded-button border px-3 py-2 text-left ${
                  photoId === photo.id ? "border-text-1 bg-surface-2" : "border-border"
                }`}
              >
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="size-12 rounded object-cover" />
                ) : (
                  <div className="size-12 rounded bg-surface-2" />
                )}
                <span className="min-w-0 truncate text-[14px]">{photo.caption || photo.filename}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Elements to rebuild</h2>
          <ul className="mt-2 grid gap-1">
            {data.elements.map((element) => {
              const checked = selected.includes(element.id);
              return (
                <li key={element.id}>
                  <div
                    className={`flex items-center gap-2 rounded-button px-2 py-1.5 ${
                      editId === element.id ? "bg-surface-2" : "hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`Rebuild ${element.name}`}
                      onChange={() =>
                        setSelected((current) =>
                          checked ? current.filter((id) => id !== element.id) : [...current, element.id],
                        )
                      }
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[14px]"
                      onClick={() => setEditId(element.id)}
                    >
                      {element.name}
                    </button>
                    <ChipConfidence level={chip[element.confidence]} />
                    {element.evidenceCount === 0 ? (
                      <span className="text-[11px] text-[var(--color-conf-low)]">No source</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {editId ? (
            <ElementConfidence
              key={editId}
              data={data}
              elementId={editId}
              linking={linking}
              setLinking={setLinking}
              motionEnabled={motionEnabled}
              onToast={showToast}
            />
          ) : null}
        </section>

        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Prompt (read-only)</h2>
          <p className="mt-2 max-h-40 overflow-auto rounded-button bg-surface-2 p-3 text-[13px] leading-5 text-text-2">
            {promptPreview}
          </p>
        </section>

        {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
        {missing.length > 0 ? (
          <Notice
            kind="Warning"
            message={`Missing evidence: ${missing.join(", ")}`}
            className="w-full"
          />
        ) : null}

        <div className="mt-auto grid gap-2">
          <Button
            label={busy ? "Working…" : "Generate reconstruction"}
            state={busy ? "Disabled" : "Default"}
            disabled={busy}
            onClick={() => void generate()}
          />
          <label className={`${focusRing} inline-flex h-10 cursor-pointer items-center justify-center rounded-button border border-border text-[14px] font-medium`}>
            Upload a reconstruction image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-3">
        <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-card bg-surface-2 shadow-card">
          <div className="absolute left-3 top-3 z-10">
            <Segmented
              layoutId="recon-then-now"
              value={thenNow > 50 ? "then" : "now"}
              onValueChange={(value) => setThenNow(value === "then" ? 100 : 0)}
              items={[
                { value: "then", label: "Then" },
                { value: "now", label: "Now" },
              ]}
            />
          </div>
          <label className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-pill bg-surface/90 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-text-2 backdrop-blur">
            Blend
            <input
              type="range"
              min={0}
              max={100}
              value={thenNow}
              aria-label="Then and now"
              onChange={(event) => setThenNow(Number(event.target.value))}
              className="w-28 accent-text-1"
            />
          </label>

          {!active || active.status === "queued" || active.status === "generating" ? (
            <EmptyOrLoading status={active?.status ?? null} />
          ) : active.status === "failed" ? (
            <div className="flex h-full items-center justify-center p-8">
              <Notice kind="Error" message={active.error ?? "Generation failed."} className="w-full max-w-md" />
            </div>
          ) : (
            <ResultCanvas
              sourceUrl={sourcePhoto?.url ?? null}
              resultUrl={active.imageUrl}
              opacity={thenNow / 100}
              regions={active.regions}
              elements={data.elements}
              drawing={drawing}
              draft={draft}
              onDraftPoint={(point) => setDraft((current) => [...current, point])}
              onSelectRegion={setInspectId}
              origin={active.origin}
            />
          )}

          {active?.status === "done" ? (
            <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-pill bg-black/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white">
              {active.origin === "uploaded" ? "Imagined reconstruction" : "AI-assisted, imagined reconstruction"}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="Secondary"
            size="Small"
            label={drawing ? "Cancel drawing" : "Draw region"}
            onClick={() => {
              setDrawing((value) => !value);
              setDraft([]);
            }}
          />
          {drawing ? (
            <>
              <select
                className="h-9 rounded-button border border-border bg-surface px-2 text-[13px]"
                value={linkElementId}
                onChange={(event) => setLinkElementId(event.target.value)}
                aria-label="Link region to element"
              >
                {data.elements.map((element) => (
                  <option key={element.id} value={element.id}>
                    {element.name}
                  </option>
                ))}
              </select>
              <Button
                size="Small"
                label="Save region"
                state={draft.length < 3 ? "Disabled" : "Default"}
                disabled={draft.length < 3}
                onClick={() => void commitRegion()}
              />
            </>
          ) : null}
          {active?.status === "done" && !active.isCurrent ? (
            <Button
              size="Small"
              label="Mark as current"
              onClick={() =>
                void setCurrentReconstruction({ siteId: data.siteId, id: active.id }).then(() => router.refresh())
              }
            />
          ) : null}
        </div>

        <AttemptStrip
          attempts={data.attempts}
          activeId={active?.id ?? null}
          onSelect={setActiveId}
        />

        {inspect ? (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-medium">{inspect.name}</h3>
                <p className="mt-1 text-[13px] text-text-2">{inspect.rationale || "No rationale yet."}</p>
                {inspect.assumptions.length > 0 ? (
                  <ul className="mt-2 list-disc pl-4 text-[13px] text-text-2">
                    {inspect.assumptions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[13px] text-text-3">{inspect.evidenceCount} linked source(s)</p>
              </div>
              <ChipConfidence level={chip[inspect.confidence]} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="Secondary" size="Small" label="Close" onClick={() => setInspectId(null)} />
              {active?.regions
                .filter((region) => region.elementId === inspect.id)
                .map((region) => (
                  <Button
                    key={region.id}
                    type="Secondary"
                    size="Small"
                    label="Remove region"
                    onClick={() =>
                      void deleteRegion({ siteId: data.siteId, id: region.id }).then(() => {
                        setInspectId(null);
                        router.refresh();
                      })
                    }
                  />
                ))}
            </div>
          </Card>
        ) : null}
      </section>
      <Toast message={toast ?? ""} open={Boolean(toast)} />
    </div>
  );
}

function ElementConfidence({
  data,
  elementId,
  linking,
  setLinking,
  motionEnabled,
  onToast,
}: {
  data: ImageReconstructData;
  elementId: string;
  linking: boolean;
  setLinking: (value: boolean) => void;
  motionEnabled: boolean;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const element = data.elements.find((item) => item.id === elementId);
  const [confidence, setLevel] = useState(element?.confidence ?? "low");
  const [notice, setNotice] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  if (!element) return null;

  return (
    <div className="mt-3 rounded-button border border-border p-3">
      <h3 className="text-[13px] font-medium">{element.name}</h3>
      <motion.div animate={pulse && motionEnabled ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={spring} className="mt-2">
        <Segmented
          layoutId={`image-confidence-${element.id}`}
          value={confidence}
          onValueChange={(value) => {
            const next = value as ReconstructionElement["confidence"];
            const previous = confidence;
            setLevel(next);
            void setConfidence({ siteId: data.siteId, id: element.id, confidence: next }).then((saved) => {
              if (!saved.ok && saved.error === "HIGH_NEEDS_EVIDENCE") {
                setLevel(previous);
                setNotice("High confidence needs at least one linked source.");
                onToast("Confidence was not changed.");
                return;
              }
              if (!saved.ok) {
                setLevel(previous);
                setNotice(saved.error);
                return;
              }
              setNotice(null);
              setPulse(true);
              window.setTimeout(() => setPulse(false), 400);
              onToast("Confidence updated");
              router.refresh();
            });
          }}
          items={[
            { value: "high", label: "High", tone: "Selected-High" },
            { value: "medium", label: "Medium", tone: "Selected-Medium" },
            { value: "low", label: "Low", tone: "Selected-Low" },
          ]}
        />
      </motion.div>
      {notice ? <Notice kind="Warning" message={notice} className="mt-2 w-full" /> : null}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[12px] text-text-2">{element.evidenceCount} linked source(s)</p>
        <button type="button" className="text-[13px] font-medium text-accent" onClick={() => setLinking(true)}>
          Link evidence
        </button>
      </div>
      {linking ? (
        <div className="mt-2 grid gap-1">
          {/* Sources come from site evidence via a lightweight fetch on refresh after link. */}
          <p className="text-[12px] text-text-3">Open Evidence to add new sources. Link existing ones below after refresh.</p>
          <LinkExisting data={data} element={element} onDone={() => { setLinking(false); router.refresh(); }} />
        </div>
      ) : null}
    </div>
  );
}

function LinkExisting({
  data,
  element,
  onDone,
}: {
  data: ImageReconstructData;
  element: ReconstructionElement;
  onDone: () => void;
}) {
  return (
    <div className="grid gap-1">
      {data.evidence.map((source) => {
        const linked = element.evidenceIds.includes(source.id);
        return (
          <button
            key={source.id}
            type="button"
            className="rounded-button px-2 py-1.5 text-left text-[13px] hover:bg-surface-2"
            onClick={() => {
              void (linked
                ? unlinkEvidence({ siteId: data.siteId, evidenceId: source.id, elementId: element.id })
                : linkEvidence({ siteId: data.siteId, evidenceId: source.id, elementId: element.id })
              ).then(onDone);
            }}
          >
            {linked ? `Unlink ${source.title}` : source.title}
          </button>
        );
      })}
      <button type="button" className="text-[13px] text-accent" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

function EmptyOrLoading({ status }: { status: string | null }) {
  if (status === "queued" || status === "generating") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
        <p className="text-[15px] text-text-2">Generating wireframe reconstruction…</p>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <p className="max-w-sm text-[15px] leading-6 text-text-2">
        No reconstruction yet. Choose a photograph and elements on the left, then generate or upload an image.
      </p>
    </div>
  );
}

function AttemptStrip({
  attempts,
  activeId,
  onSelect,
}: {
  attempts: ReconstructionAttempt[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (attempts.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {attempts.map((attempt) => (
        <button
          key={attempt.id}
          type="button"
          onClick={() => onSelect(attempt.id)}
          className={`${focusRing} relative h-16 w-24 shrink-0 overflow-hidden rounded-button border ${
            activeId === attempt.id ? "border-text-1" : "border-border"
          }`}
        >
          {attempt.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attempt.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center bg-surface text-[11px] text-text-3">
              {attempt.status}
            </span>
          )}
          {attempt.isCurrent ? (
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] uppercase tracking-wide text-white">
              Current
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ResultCanvas({
  sourceUrl,
  resultUrl,
  opacity,
  regions,
  elements,
  drawing,
  draft,
  onDraftPoint,
  onSelectRegion,
  origin,
}: {
  sourceUrl: string | null;
  resultUrl: string | null;
  opacity: number;
  regions: ReconstructionAttempt["regions"];
  elements: ReconstructionElement[];
  drawing: boolean;
  draft: { x: number; y: number }[];
  onDraftPoint: (point: { x: number; y: number }) => void;
  onSelectRegion: (elementId: string) => void;
  origin: "generated" | "uploaded";
}) {
  const ref = useRef<HTMLDivElement>(null);
  void origin;

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!drawing || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    onDraftPoint({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  return (
    <div ref={ref} className="relative size-full cursor-crosshair" onClick={onClick}>
      {sourceUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sourceUrl} alt="Site photograph" className="absolute inset-0 size-full object-contain" />
      ) : null}
      {resultUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resultUrl}
          alt="Reconstruction"
          className="absolute inset-0 size-full object-contain"
          style={{ opacity }}
        />
      ) : null}
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {regions.map((region) => {
          const element = elements.find((item) => item.id === region.elementId);
          const points = region.shape.map((point) => `${point.x},${point.y}`).join(" ");
          return (
            <polygon
              key={region.id}
              points={points}
              fill={confStroke[element?.confidence ?? "low"]}
              fillOpacity={0.22}
              stroke={confStroke[element?.confidence ?? "low"]}
              strokeWidth={0.4}
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onSelectRegion(region.elementId);
              }}
            />
          );
        })}
        {draft.length > 0 ? (
          <polyline
            points={draft.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
          />
        ) : null}
      </svg>
    </div>
  );
}
