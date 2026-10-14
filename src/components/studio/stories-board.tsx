"use client";

import { MapCard } from "@/components/studio/map-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, ChipStatus, type ConfidenceLevel, type StatusState } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { addStep, attachStepAudio, createStory, reorderSteps, updateStep } from "@/server/stories";
import type { StoriesData, StoryRecord, StoryStatus, StoryStepRecord, StoryTrigger } from "@/server/stories-data";
import { ImageIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FLOW: StoryStatus[] = ["draft", "in_review", "approved", "published"];
const STATUS: Record<StoryStatus, StatusState> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
};
const FILTERS = [
  { id: "all", label: "All" },
  { id: "places", label: "Places" },
  { id: "people", label: "People" },
  { id: "events", label: "Events" },
  { id: "daily life", label: "Daily life" },
  { id: "objects", label: "Objects" },
  { id: "audio", label: "Audio" },
];
const TRIGGERS: { value: StoryTrigger; label: string }[] = [
  { value: "arrival", label: "On arrival" },
  { value: "tap", label: "Tap" },
  { value: "scan", label: "Scan" },
];

function minutes(story: StoryRecord) {
  const seconds = story.durationS ?? story.steps.reduce((sum, step) => sum + (step.audioDurationS ?? 0), 0);
  return Math.max(1, Math.round(seconds / 60) || 1);
}

function confidence(value: string): ConfidenceLevel {
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

export function StoriesBoard({ data, storyId }: { data: StoriesData; storyId?: string }) {
  const story = data.stories.find((item) => item.id === storyId);
  if (storyId && !story) {
    return <Notice kind="Warning" message="That story is not on this site." className="w-full" />;
  }
  if (story) return <StoryBuilder data={data} story={story} />;
  return <StoryLibrary data={data} />;
}

function StoryLibrary({ data }: { data: StoriesData }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("daily life");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const visible = data.stories.filter((story) => {
    if (filter === "all") return true;
    if (filter === "audio") return story.hasAudio;
    return (story.category ?? "").toLowerCase() === filter;
  });

  async function create() {
    setError(null);
    const result = await createStory({ siteId: data.siteId, title, category, summary });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/s/${data.slug}/stories?story=${result.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[32px] font-normal leading-10 tracking-[-0.02em] text-text-1">Stories</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-text-2">
          Bring the site to life through people, events and daily life — placed where they happened.
        </p>
      </header>
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-4 overflow-x-auto" role="tablist" aria-label="Story categories">
          {FILTERS.map((item) => {
            const count = item.id === "all" ? data.stories.length : null;
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.id)}
                className={`h-8 border-b-2 text-[13px] leading-5 ${selected ? "border-text-1 font-medium text-text-1" : "border-transparent text-text-2"}`}
              >
                {item.label}
                {count !== null ? ` ${count}` : ""}
              </button>
            );
          })}
        </div>
        <Button type="Primary" size="Small" label="Create story" iconLeft={<Plus className="size-4" />} onClick={() => setOpen(true)} />
      </div>
      {visible.length === 0 ? (
        <Notice kind="Info" message="No stories in this category yet." className="w-full" />
      ) : (
        visible.map((story) => (
          <Card key={story.id} padding="Tight">
            <div className="flex gap-4">
              <div className="flex h-28 w-36 shrink-0 flex-col items-start justify-end rounded-card border border-dashed border-border bg-surface-2 p-2">
                <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-0.5 text-[11px] text-text-2">
                  <ImageIcon aria-hidden className="size-3" />
                  Image
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
                <div>
                  <h2 className="text-[18px] font-medium leading-[26px] text-text-1">{story.title}</h2>
                  <p className="text-[13px] leading-5 text-text-2">
                    {story.locationCount} locations · {minutes(story)} minutes
                    {story.category ? ` · ${story.category}` : ""}
                  </p>
                </div>
                <p className="text-[15px] leading-6 text-text-1">{story.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <ChipStatus state={STATUS[story.status]} />
                    <Workflow status={story.status} />
                  </span>
                  <Link href={`/s/${data.slug}/stories?story=${story.id}`} className="text-[13px] font-medium text-accent">
                    Open builder
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        step="New story"
        title="Create story"
        progress={false}
        continueLabel="Create story"
        disabled={title.trim().length < 2}
        onContinue={() => void create()}
      >
        <div className="flex flex-col gap-3">
          <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Story title" />
          <Field
            kind="Select"
            label="Category"
            value={category}
            options={FILTERS.filter((item) => item.id !== "all" && item.id !== "audio").map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            onChange={(event) => setCategory(event.target.value)}
          />
          <Field kind="Textarea" label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
          {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
          <Notice kind="Info" message="A new story starts as Draft. Review moves it forward, and publishing the site publishes it." className="w-full" />
        </div>
      </Modal>
    </div>
  );
}

function Workflow({ status }: { status: StoryStatus }) {
  const current = FLOW.indexOf(status);
  return (
    <span className="inline-flex gap-1" aria-label={`${STATUS[status]}, step ${current + 1} of ${FLOW.length}`}>
      {FLOW.map((item, index) => (
        <span key={item} className={`size-1.5 rounded-full ${index <= current ? "bg-conf-high" : "bg-border"}`} />
      ))}
    </span>
  );
}

function StoryBuilder({ data, story }: { data: StoriesData; story: StoryRecord }) {
  const [selectedId, setSelectedId] = useState(story.steps[0]?.id ?? "");
  const [order, setOrder] = useState(story.steps.map((step) => step.id));
  const [toast, setToast] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const selected = story.steps.find((step) => step.id === selectedId) ?? story.steps[0];
  const known = new Set(story.steps.map((step) => step.id));
  const orderedIds = [...order.filter((id) => known.has(id)), ...story.steps.map((step) => step.id).filter((id) => !order.includes(id))];
  const steps = orderedIds.map((id) => story.steps.find((step) => step.id === id)).filter((step): step is StoryStepRecord => Boolean(step));
  const previewStep = selected ?? steps[0];

  async function save(result: Promise<{ ok: boolean; error?: string }>, failure: string) {
    const settled = await result;
    if (!settled.ok) setToast(settled.error ?? failure);
  }

  async function dropPin(stepId: string, planX: number, planY: number) {
    const place = data.locations.reduce<{ id: string; d: number } | null>((best, location) => {
      const d = (location.planX - planX) ** 2 + (location.planY - planY) ** 2;
      return !best || d < best.d ? { id: location.id, d } : best;
    }, null);
    if (!place) return;
    await save(updateStep({ siteId: data.siteId, storyId: story.id, id: stepId, locationId: place.id }), "The location was not saved.");
  }

  return (
    <div className="grid h-[calc(100vh-7.5rem)] min-h-[640px] grid-cols-1 gap-4 min-[1100px]:grid-cols-[280px_minmax(0,1fr)_340px]">
      <section className="flex min-h-0 flex-col rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/s/${data.slug}/stories`} className="text-[13px] text-text-2">
            Stories
          </Link>
          <Button
            type="Ghost"
            size="Small"
            label="Add step"
            onClick={() => void save(addStep({ siteId: data.siteId, storyId: story.id }), "A step could not be added.")}
          />
        </div>
        <h1 className="mt-2 text-[18px] font-medium leading-[26px] text-text-1">{story.title}</h1>
        <span className="mt-2 inline-flex items-center gap-2">
          <ChipStatus state={STATUS[story.status]} />
          <Workflow status={story.status} />
        </span>
        <p className="mt-2 text-[13px] leading-5 text-text-2">
          Draft moves to In review from the review step, then to Published when the site is published.
        </p>
        <ol className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
          {steps.map((step, index) => (
            <li
              key={step.id}
              draggable
              onDragStart={() => setDragId(step.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === step.id) return;
                const next = orderedIds.filter((id) => id !== dragId);
                const at = next.indexOf(step.id);
                next.splice(at, 0, dragId);
                setOrder(next);
                setDragId(null);
                void save(reorderSteps({ siteId: data.siteId, storyId: story.id, ids: next }), "The steps were not reordered.");
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedId(step.id)}
                className={`flex w-full items-center gap-2 rounded-button px-2 py-2 text-left ${selected?.id === step.id ? "bg-surface-2" : ""}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-on-primary">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] leading-5">{step.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <section className="min-h-0">
        <MapCard
          title="Plan · story"
          places={data.locations}
          markers={steps.flatMap((step, index) => {
            const place = data.locations.find((location) => location.id === step.locationId);
            if (!place) return [];
            return [{ id: step.id, n: index + 1, planX: place.planX, planY: place.planY, label: step.title }];
          })}
          onMarkerDrop={(id, x, y) => void dropPin(id, x, y)}
        />
      </section>
      <section className="min-h-0 overflow-auto rounded-card bg-surface p-4 shadow-card">
        {previewStep ? (
          <a
            href={`/${data.slug}/story/${story.id}/${previewStep.id}?preview=${encodeURIComponent(data.previewToken)}`}
            className="text-[13px] font-medium text-accent"
          >
            Preview
          </a>
        ) : null}
        {selected ? (
          <StepInspector key={selected.id} data={data} storyId={story.id} step={selected} onError={(message) => setToast(message)} />
        ) : (
          <p className="mt-4 text-[13px] text-text-2">Add a step to start the story.</p>
        )}
      </section>
      <Toast message={toast ?? ""} open={Boolean(toast)} />
    </div>
  );
}

function StepInspector({
  data,
  storyId,
  step,
  onError,
}: {
  data: StoriesData;
  storyId: string;
  step: StoryStepRecord;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(step.title);
  const [body, setBody] = useState(step.body);
  const [uploading, setUploading] = useState(false);
  const element = data.elements.find((item) => item.id === step.elementId);

  async function save(patch: Parameters<typeof updateStep>[0]) {
    const result = await updateStep(patch);
    if (!result.ok) onError(result.error);
  }

  async function upload(file: File) {
    setUploading(true);
    const durationS = await readDuration(file);
    const safe = file.name.replace(/[^\w.-]+/g, "-");
    const path = `${data.siteId}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setUploading(false);
      onError("Sign in again before uploading.");
      return;
    }
    const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/assets/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY ?? "",
        "Content-Type": file.type || "audio/mpeg",
        "x-upsert": "false",
      },
      body: file,
    });
    if (!response.ok) {
      setUploading(false);
      onError("The audio upload did not finish.");
      return;
    }
    const saved = await attachStepAudio({
      siteId: data.siteId,
      storyId,
      stepId: step.id,
      storagePath: path,
      filename: file.name,
      bytes: file.size,
      mime: file.type || "audio/mpeg",
      durationS,
    });
    setUploading(false);
    if (!saved.ok) onError(saved.error);
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Field
        label="Title"
        surface="Flat"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void save({ siteId: data.siteId, storyId, id: step.id, title })}
      />
      <Field
        kind="Select"
        label="Location"
        surface="Flat"
        value={step.locationId ?? ""}
        options={[{ value: "", label: "No location" }, ...data.locations.map((location) => ({ value: location.id, label: location.name }))]}
        onChange={(event) =>
          void save({ siteId: data.siteId, storyId, id: step.id, locationId: event.target.value || null })
        }
      />
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Trigger</p>
        <Segmented
          layoutId={`trigger-${step.id}`}
          items={TRIGGERS}
          value={step.trigger}
          onValueChange={(value) => void save({ siteId: data.siteId, storyId, id: step.id, trigger: value as StoryTrigger })}
        />
      </div>
      <Field
        kind="Textarea"
        label="Body"
        surface="Flat"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={() => void save({ siteId: data.siteId, storyId, id: step.id, body })}
      />
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Audio</p>
        <label className="flex cursor-pointer flex-col gap-1 rounded-card border border-dashed border-border px-4 py-3 text-[13px] leading-5">
          <span>{uploading ? "Uploading…" : step.audioName ? step.audioName : "Upload audio"}</span>
          {step.audioDurationS ? <span className="text-text-2">{step.audioDurationS}s</span> : null}
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field
            kind="Select"
            label="Linked element"
            surface="Flat"
            value={step.elementId ?? ""}
            options={[{ value: "", label: "None" }, ...data.elements.map((item) => ({ value: item.id, label: item.name }))]}
            onChange={(event) =>
              void save({ siteId: data.siteId, storyId, id: step.id, elementId: event.target.value || null })
            }
          />
        </div>
        {element ? <ChipConfidence level={confidence(element.confidence)} /> : null}
      </div>
      <fieldset>
        <legend className="mb-2 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Sources</legend>
        <div className="flex flex-col gap-1">
          {data.sources.map((source) => {
            const checked = step.sourceIds.includes(source.id);
            return (
              <label key={source.id} className="flex items-center gap-2 text-[13px] leading-5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const sourceIds = checked ? step.sourceIds.filter((id) => id !== source.id) : [...step.sourceIds, source.id];
                    void save({ siteId: data.siteId, storyId, id: step.id, sourceIds });
                  }}
                />
                {source.title}
              </label>
            );
          })}
        </div>
      </fieldset>
      {body.trim() && step.sourceIds.length === 0 ? (
        <Notice kind="Warning" message="This step makes a claim without a linked source." className="w-full" />
      ) : null}
    </div>
  );
}

function readDuration(file: File) {
  return new Promise<number>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      URL.revokeObjectURL(audio.src);
      resolve(duration);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}
