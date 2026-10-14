"use client";

import { useWorkspace } from "@/components/studio/workspace-context";
import { Avatar } from "@/components/ui/avatar";
import { ConfidenceBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, ChipNeutral, type ConfidenceLevel } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { TileOption } from "@/components/ui/tile-option";
import { Toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/browser";
import type { EvidenceView } from "@/lib/studio/records";
import {
  addComment,
  createEvidence,
  createInterpretation,
  createQuestion,
  linkEvidence,
  resolveQuestion,
  saveEvidenceSettings,
  savePrivateNotes,
  selectInterpretation,
  unlinkEvidence,
} from "@/server/evidence";
import type { EvidenceElement, EvidencePageData, EvidenceSource, Level, SourceKind } from "@/server/evidence-data";
import { motion } from "framer-motion";
import { BookOpen, Camera, Check, Columns3, FileText, Mountain, Pickaxe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const tabs: { id: EvidenceView; label: string }[] = [
  { id: "sources", label: "Sources" },
  { id: "questions", label: "Open questions" },
  { id: "interpretations", label: "Interpretations" },
  { id: "confidence", label: "Confidence" },
];

const kindLabel: Record<SourceKind, string> = {
  physical: "Physical",
  archaeological: "Archaeological",
  historical: "Historical",
  comparative: "Comparative",
  visual: "Visual",
  scholarly: "Scholarly",
};

const tileName: Record<SourceKind, string> = {
  physical: "Physical remains",
  archaeological: "Archaeological record",
  historical: "Historical document",
  comparative: "Comparative example",
  visual: "Visual record",
  scholarly: "Scholarly interpretation",
};

const kindIcon = {
  physical: Mountain,
  archaeological: Pickaxe,
  historical: FileText,
  comparative: Columns3,
  visual: Camera,
  scholarly: BookOpen,
};

const chipLevel: Record<Level, ConfidenceLevel> = { high: "High", medium: "Medium", low: "Low" };

function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function EvidenceBoard({ data, presetKind }: { data: EvidencePageData; presetKind?: SourceKind }) {
  const { setEvidencePins, setEvidenceGroup, setEvidenceView, evidenceView } = useWorkspace();
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(Boolean(presetKind));
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [prefillElements, setPrefillElements] = useState<string[]>([]);

  useEffect(() => {
    setEvidenceGroup(data.groupName);
    setEvidencePins(
      data.elements.map((element) => ({
        id: element.id,
        name: element.name,
        planX: element.planX,
        planY: element.planY,
        confidence: element.confidence,
        sources: element.sourceCount,
      })),
    );
  }, [data, setEvidenceGroup, setEvidencePins]);

  function show(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="flex flex-col gap-5 pt-6">
      <div>
        <h1 className="text-[40px] font-light leading-[48px] text-text-1">Evidence</h1>
        <p className="mt-1 text-[15px] leading-6 text-text-2">
          {evidenceView === "interpretations"
            ? "Where sources disagree, record each reading rather than choosing silently."
            : evidenceView === "confidence"
              ? "Confidence is set per element, not per site."
              : "Support your reconstruction with traceable sources."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-[13px]" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={evidenceView === tab.id}
              className={evidenceView === tab.id ? "border-b-2 border-text-1 pb-1 font-medium" : "pb-1 text-text-2"}
              onClick={() => setEvidenceView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {evidenceView === "sources" ? (
          <Button size="Small" label="+ Add evidence" onClick={() => { setPrefillElements([]); setAdding(true); }} />
        ) : null}
        {evidenceView === "questions" ? <NewQuestion data={data} /> : null}
      </div>
      {evidenceView === "sources" ? (
        <Sources
          data={data}
          onLink={setLinkFor}
          onAddFor={(elementId) => {
            setPrefillElements([elementId]);
            setAdding(true);
          }}
          onResolve={(id) => void resolveQuestion({ siteId: data.siteId, id }).then((saved) => saved.ok && show("Question resolved"))}
        />
      ) : null}
      {evidenceView === "questions" ? <Questions data={data} onAddFor={(id) => { setPrefillElements([id]); setAdding(true); setEvidenceView("sources"); }} /> : null}
      {evidenceView === "interpretations" ? <Interpretations data={data} /> : null}
      {evidenceView === "confidence" ? <Confidence data={data} /> : null}
      <AddEvidence
        open={adding}
        data={data}
        presetKind={presetKind}
        elementIds={prefillElements}
        onOpenChange={setAdding}
        onSaved={() => show("Evidence added")}
      />
      <LinkModal data={data} evidenceId={linkFor} onClose={() => setLinkFor(null)} />
      <Toast message={toast ?? ""} open={Boolean(toast)} />
    </div>
  );
}

function Sources({
  data,
  onLink,
  onAddFor,
  onResolve,
}: {
  data: EvidencePageData;
  onLink: (id: string) => void;
  onAddFor: (elementId: string) => void;
  onResolve: (id: string) => void;
}) {
  const [filter, setFilter] = useState<SourceKind | "all">("all");
  const [sort, setSort] = useState("recent");
  const motionEnabled = useMotionEnabled();
  const counts = Object.fromEntries(
    (Object.keys(kindLabel) as SourceKind[]).map((kind) => [kind, data.sources.filter((source) => source.kind === kind).length]),
  ) as Record<SourceKind, number>;
  const visible = data.sources
    .filter((source) => filter === "all" || source.kind === filter)
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : b.createdAt.localeCompare(a.createdAt)));
  const open = data.questions.filter((question) => question.status === "open");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {([{ id: "all" as const, label: `All ${data.sources.length}` }, ...(Object.keys(kindLabel) as SourceKind[]).map((kind) => ({ id: kind, label: `${kindLabel[kind]} ${counts[kind]}` }))]).map((item) => {
          const selected = filter === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`${focusRing} relative h-9 rounded-pill px-3.5 text-[13px]`}>
              {selected ? (
                <motion.span layoutId={motionEnabled ? "evidence-filter" : undefined} className="absolute inset-0 rounded-pill bg-primary" transition={motionEnabled ? spring : { duration: 0 }} />
              ) : (
                <span className="absolute inset-0 rounded-pill bg-surface" />
              )}
              <span className={`relative ${selected ? "text-on-primary" : "text-text-2"}`}>{item.label}</span>
            </button>
          );
        })}
        <select aria-label="Sort sources" value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-pill bg-surface px-3 text-[13px] text-text-2 shadow-card">
          <option value="recent">Recent</option>
          <option value="title">Title</option>
        </select>
      </div>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Open questions</h2>
        <Card className="mt-3" padding="None">
          {open.length === 0 ? <p className="px-5 py-4 text-[15px] text-text-2">No open questions.</p> : null}
          {open.map((question) => (
            <div key={question.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
              <span className={`size-2 rounded-full ${question.level === "high" ? "bg-conf-high" : question.level === "medium" ? "bg-conf-medium" : "bg-conf-low"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-6">{question.question}</span>
                <span className="block text-[13px] leading-5 text-text-2">
                  {question.elementName ?? "Site"} · {question.sourceCount} source{question.sourceCount === 1 ? "" : "s"}
                </span>
              </span>
              {question.elementId ? (
                <button type="button" className="text-[13px] font-medium text-accent" onClick={() => onAddFor(question.elementId as string)}>
                  Add source
                </button>
              ) : null}
              <button type="button" className="text-[13px] font-medium text-accent" onClick={() => onResolve(question.id)}>
                Resolve
              </button>
            </div>
          ))}
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Sources</h2>
        {visible.map((source) => (
          <EvidenceCard key={source.id} source={source} onLink={() => onLink(source.id)} />
        ))}
      </section>
    </div>
  );
}

function EvidenceCard({ source, onLink }: { source: EvidenceSource; onLink: () => void }) {
  const Icon = kindIcon[source.kind];
  return (
    <Card>
      <div className="flex items-start gap-3">
        <IconTile>
          <Icon className="size-4" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-6">{source.title}</p>
          <p className="text-[13px] leading-5 text-text-2">
            {kindLabel[source.kind]}
            {source.dateLabel ? ` · ${source.dateLabel}` : ""} · Added by {source.addedBy}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {source.elements.map((element) => (
              <ChipNeutral key={element.id} label={element.name} />
            ))}
          </div>
        </div>
        <button type="button" className="flex items-center gap-2" onClick={onLink}>
          <span className="text-[13px] text-text-2">Supports:</span>
          <ChipConfidence level={chipLevel[source.strength]} />
        </button>
      </div>
    </Card>
  );
}

function LinkModal({ data, evidenceId, onClose }: { data: EvidencePageData; evidenceId: string | null; onClose: () => void }) {
  const source = data.sources.find((item) => item.id === evidenceId);
  return (
    <Modal open={Boolean(source)} onOpenChange={(open) => !open && onClose()} footer={false} step="Link elements" title={source?.title ?? "Link elements"} progress={false}>
      <div className="flex flex-wrap gap-2">
        {data.elements.map((element) => {
          const linked = source?.elements.some((item) => item.id === element.id) ?? false;
          return (
            <button
              key={element.id}
              type="button"
              aria-pressed={linked}
              onClick={() => {
                if (!source) return;
                const action = linked ? unlinkEvidence : linkEvidence;
                void action({ siteId: data.siteId, evidenceId: source.id, elementId: element.id });
              }}
              className={`${focusRing} h-8 rounded-pill px-3 text-[13px] ${linked ? "bg-primary text-on-primary" : "bg-surface-2 text-text-2"}`}
            >
              {element.name}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function AddEvidence({
  open,
  data,
  presetKind,
  elementIds,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  data: EvidencePageData;
  presetKind?: SourceKind;
  elementIds: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<SourceKind | null>(presetKind ?? null);
  const [title, setTitle] = useState("");
  const [citation, setCitation] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [strength, setStrength] = useState<Level>("medium");
  const [linked, setLinked] = useState<string[]>(elementIds);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const motionEnabled = useMotionEnabled();

  function reset(nextOpen: boolean) {
    if (nextOpen) {
      setStep(0);
      setKind(presetKind ?? null);
      setTitle("");
      setCitation("");
      setDateLabel("");
      setUrl("");
      setFile(null);
      setStrength("medium");
      setLinked(elementIds);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  const canContinue = step === 0 ? Boolean(kind) : title.trim().length >= 2;

  async function save() {
    if (!kind) return;
    setBusy(true);
    let storagePath: string | undefined;
    if (file) {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setBusy(false);
        setError("Sign in again before uploading.");
        return;
      }
      const safe = file.name.replace(/[^\w.-]+/g, "-");
      storagePath = `${data.siteId}/${crypto.randomUUID()}-${safe}`;
      const uploaded = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/assets/${storagePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.SUPABASE_ANON_KEY ?? "",
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!uploaded.ok) {
        setBusy(false);
        setError("The upload did not finish.");
        return;
      }
    }
    const saved = await createEvidence({
      siteId: data.siteId,
      kind,
      title,
      citation,
      dateLabel,
      url,
      strength,
      elementIds: linked,
      storagePath,
      filename: file?.name,
      mime: file?.type,
      bytes: file?.size,
    });
    setBusy(false);
    if (!saved.ok) setError(saved.error);
    else {
      onOpenChange(false);
      onSaved();
    }
  }

  return (
    <Modal open={open} onOpenChange={reset} footer={false} step={`Step ${step + 1} of 3`} title="Add evidence" progress={false}>
      <div className="mb-4 h-1 overflow-hidden rounded-bar bg-surface-2" role="progressbar" aria-valuenow={(step + 1) * 33}>
        <motion.div className="h-full bg-accent" animate={{ width: `${((step + 1) / 3) * 100}%` }} transition={motionEnabled ? spring : { duration: 0 }} />
      </div>
      {step === 0 ? (
        <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-3">
          {(Object.keys(kindLabel) as SourceKind[]).map((item) => {
            const Icon = kindIcon[item];
            return (
              <TileOption
                key={item}
                label={tileName[item]}
                state={kind === item ? "Selected" : "Default"}
                icon={<Icon className="size-4" />}
                onSelect={() => setKind(item)}
              />
            );
          })}
        </div>
      ) : null}
      {step === 1 ? (
        <div className="flex flex-col gap-3">
          <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Field label="Source / citation" value={citation} onChange={(event) => setCitation(event.target.value)} />
          <Field label="Date" value={dateLabel} onChange={(event) => setDateLabel(event.target.value)} />
          <label className="rounded-card border border-dashed border-border px-4 py-6 text-center text-[13px] leading-5 text-text-2">
            {file ? file.name : "Choose a file, or paste a link below"}
            <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <Field label="URL" value={url} onChange={(event) => setUrl(event.target.value)} />
        </div>
      ) : null}
      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {data.elements.map((element) => {
              const on = linked.includes(element.id);
              return (
                <button
                  key={element.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setLinked((current) => (on ? current.filter((id) => id !== element.id) : [...current, element.id]))}
                  className={`${focusRing} h-8 rounded-pill px-3 text-[13px] ${on ? "bg-primary text-on-primary" : "bg-surface-2 text-text-2"}`}
                >
                  {element.name}
                </button>
              );
            })}
          </div>
          <Segmented
            layoutId="source-strength"
            value={strength}
            onValueChange={(value) => setStrength(value as Level)}
            items={[
              { value: "high", label: "High", tone: "Selected-High" },
              { value: "medium", label: "Medium", tone: "Selected-Medium" },
              { value: "low", label: "Low", tone: "Selected-Low" },
            ]}
          />
          <p className="text-[13px] leading-5 text-text-2">This is the strength of the source, not the confidence of the element.</p>
        </div>
      ) : null}
      {error ? <Notice kind="Error" message={error} className="mt-3 w-full" /> : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="Secondary" size="Small" label={step === 0 ? "Cancel" : "Back"} onClick={() => (step === 0 ? onOpenChange(false) : setStep((value) => value - 1))} />
        <Button
          size="Small"
          label={step === 2 ? "Save evidence" : "Continue"}
          state={!canContinue || busy ? "Disabled" : "Default"}
          disabled={!canContinue || busy}
          onClick={() => (step === 2 ? void save() : setStep((value) => value + 1))}
        />
      </div>
    </Modal>
  );
}

function Questions({ data, onAddFor }: { data: EvidencePageData; onAddFor: (elementId: string) => void }) {
  const open = data.questions.filter((question) => question.status === "open");
  const resolved = data.questions.filter((question) => question.status === "resolved");
  const [showResolved, setShowResolved] = useState(false);
  const [notes, setNotes] = useState(data.privateNotes);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Open {open.length}</h2>
      {open.map((question) => (
        <Card key={question.id}>
          <div className="flex items-start justify-between gap-3">
            <ChipConfidence level={chipLevel[question.level]} />
            {question.elementName ? <ChipNeutral label={question.elementName} /> : null}
          </div>
          <p className="mt-3 text-[18px] font-medium leading-[26px]">{question.question}</p>
          {question.context ? <p className="mt-1 text-[13px] leading-5 text-text-2">{question.context}</p> : null}
          <p className="mt-2 text-[13px] leading-5 text-text-3">
            Raised by {question.raisedBy} · {when(question.createdAt)}
          </p>
          <div className="mt-3 flex gap-4">
            {question.elementId ? (
              <button type="button" className="text-[13px] font-medium text-accent" onClick={() => onAddFor(question.elementId as string)}>
                Add source
              </button>
            ) : null}
            <button type="button" className="text-[13px] font-medium text-accent" onClick={() => void resolveQuestion({ siteId: data.siteId, id: question.id })}>
              Mark resolved
            </button>
          </div>
        </Card>
      ))}
      <button type="button" className="text-left text-[13px] text-text-2" onClick={() => setShowResolved((value) => !value)}>
        Resolved {resolved.length}
      </button>
      {showResolved
        ? resolved.map((question) => (
            <Card key={question.id} className="opacity-70">
              <p className="text-[15px] leading-6">{question.question}</p>
            </Card>
          ))
        : null}
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Notes</h2>
        <Card className="mt-3">
          <Field kind="Textarea" label="Private notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <p className="mt-2 text-[13px] leading-5 text-text-3">Notes are private to collaborators and never shown to visitors.</p>
          <div className="mt-3">
            <Button size="Small" label="Save notes" onClick={() => void savePrivateNotes({ siteId: data.siteId, notes })} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function NewQuestion({ data }: { data: EvidencePageData }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [elementId, setElementId] = useState(data.elements[0]?.id ?? "");
  const [level, setLevel] = useState<Level>("medium");
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button size="Small" label="+ New question" onClick={() => setOpen(true)} />
      <Modal open={open} onOpenChange={setOpen} footer={false} step="Question" title="New question" progress={false}>
        <div className="flex flex-col gap-3">
          <Field label="Question" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <Field kind="Textarea" label="Context" value={context} onChange={(event) => setContext(event.target.value)} />
          <Field
            kind="Select"
            label="Element"
            value={elementId}
            onChange={(event) => setElementId(event.target.value)}
            options={data.elements.map((element) => ({ value: element.id, label: element.name }))}
          />
          <Segmented
            layoutId="question-level"
            value={level}
            onValueChange={(value) => setLevel(value as Level)}
            items={[
              { value: "high", label: "High", tone: "Selected-High" },
              { value: "medium", label: "Medium", tone: "Selected-Medium" },
              { value: "low", label: "Low", tone: "Selected-Low" },
            ]}
          />
          {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
          <Button
            size="Small"
            label="Save question"
            state={question.trim().length < 4 ? "Disabled" : "Default"}
            disabled={question.trim().length < 4}
            onClick={() => {
              void createQuestion({
                siteId: data.siteId,
                elementId: elementId || null,
                question,
                context,
                level,
              }).then((saved) => {
                if (!saved.ok) setError(saved.error);
                else setOpen(false);
              });
            }}
          />
        </div>
      </Modal>
    </>
  );
}

function Interpretations({ data }: { data: EvidencePageData }) {
  const [elementId, setElementId] = useState(data.interpretations[0]?.elementId ?? data.elements[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [confidence, setConfidence] = useState<Level>("medium");
  const cards = data.interpretations.filter((item) => item.elementId === elementId).slice(0, 3);
  const element = data.elements.find((item) => item.id === elementId);
  const thread = data.comments.filter((comment) => comment.targetId === elementId && !comment.parentId);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Element</p>
            <div className="mt-1 flex items-center gap-2">
              <select aria-label="Element" value={elementId} onChange={(event) => setElementId(event.target.value)} className="bg-transparent text-[18px] font-medium leading-[26px]">
                {data.elements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {element ? <ChipConfidence level={chipLevel[element.confidence]} /> : null}
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 min-[720px]:grid-cols-2">
        {cards.map((card, index) => (
          <Card key={card.id} className={card.selected ? "ring-2 ring-accent" : ""}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Interpretation {String.fromCharCode(65 + index)}</p>
              <ChipConfidence level={chipLevel[card.confidence]} />
            </div>
            <p className="mt-2 text-[15px] font-medium leading-6">{card.label}</p>
            {card.summary ? <p className="mt-2 text-[13px] leading-5 text-text-2">{card.summary}</p> : null}
            {card.evidenceTitles.length ? (
              <p className="mt-2 text-[13px] leading-5 text-text-2">Supported by {card.evidenceTitles.join(", ")}</p>
            ) : null}
            <button
              type="button"
              className="mt-3 text-[13px] font-medium text-accent"
              onClick={() => {
                void selectInterpretation({ siteId: data.siteId, id: card.id }).then((saved) => {
                  setNotice(saved.ok ? null : saved.error === "HIGH_NEEDS_EVIDENCE" ? "High confidence needs at least one linked source." : saved.error);
                });
              }}
            >
              {card.selected ? "Used in reconstruction" : "Use in reconstruction"}
            </button>
          </Card>
        ))}
        {cards.length < 3 ? (
          <Card className="border border-dashed border-border shadow-none">
            <Field label="Reading" value={label} onChange={(event) => setLabel(event.target.value)} />
            <div className="mt-2">
              <Field kind="Textarea" label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
            </div>
            <div className="mt-3">
              <Button
                size="Small"
                label="Add interpretation"
                state={label.trim().length < 2 ? "Disabled" : "Default"}
                disabled={label.trim().length < 2}
                onClick={() => {
                  void createInterpretation({ siteId: data.siteId, elementId, label, summary, confidence }).then((saved) => {
                    if (saved.ok) {
                      setLabel("");
                      setSummary("");
                    } else setNotice(saved.error);
                  });
                }}
              />
            </div>
            <div className="mt-3">
              <Segmented
                layoutId="reading-confidence"
                value={confidence}
                onValueChange={(value) => setConfidence(value as Level)}
                items={[
                  { value: "high", label: "High", tone: "Selected-High" },
                  { value: "medium", label: "Medium", tone: "Selected-Medium" },
                  { value: "low", label: "Low", tone: "Selected-Low" },
                ]}
              />
            </div>
          </Card>
        ) : null}
      </div>
      {notice ? <Notice kind={notice.includes("linked source") ? "Warning" : "Error"} message={notice} className="w-full" /> : null}
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Expert commentary</h2>
        <Card className="mt-3">
          <CommentThread siteId={data.siteId} elementId={elementId} comments={thread} />
        </Card>
        <p className="mt-2 text-[13px] leading-5 text-text-3">
          Visitors see the selected interpretation with its confidence. Alternatives can be shown under How do we know?
        </p>
      </section>
    </div>
  );
}

function CommentThread({
  siteId,
  elementId,
  comments,
}: {
  siteId: string;
  elementId: string;
  comments: EvidencePageData["comments"];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${siteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `site_id=eq.${siteId}` }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, siteId]);
  return (
    <div>
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 border-b border-border py-3 last:border-0">
          <Avatar initials={comment.initials.slice(0, 2)} size="24" />
          <p className="text-[15px] leading-6">
            <span className="font-medium">{comment.authorName}</span> {comment.body}
          </p>
        </div>
      ))}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void addComment({ siteId, elementId, body }).then((saved) => {
            if (saved.ok) setBody("");
          });
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Reply to thread"
          aria-label="Reply to thread"
          className="h-10 flex-1 rounded-card bg-surface-2 px-3 text-[15px] outline-none"
        />
        <Button
          size="Small"
          label="Send"
          onClick={() => {
            void addComment({ siteId, elementId, body }).then((saved) => {
              if (saved.ok) setBody("");
            });
          }}
        />
      </form>
    </div>
  );
}

function Confidence({ data }: { data: EvidencePageData }) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const element of data.elements) counts[element.confidence] += 1;
  const kinds = Object.keys(kindLabel) as SourceKind[];
  const [rules, setRules] = useState(data.settings);
  const [sort, setSort] = useState<"name" | "confidence">("name");
  const rows = [...data.elements].sort((a, b) =>
    sort === "confidence" ? a.confidence.localeCompare(b.confidence) : a.name.localeCompare(b.name),
  );
  function save(next: typeof rules) {
    setRules(next);
    void saveEvidenceSettings({ siteId: data.siteId, ...next });
  }
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <ConfidenceBar counts={counts} className="w-full" />
        <p className="mt-2 text-[13px] leading-5 text-text-2">How this is shown to visitors: Well supported · Likely · Uncertain</p>
      </Card>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">By element</h2>
        <Card className="mt-3 overflow-x-auto" padding="None">
          <table className="w-full text-left text-[13px] leading-5">
            <thead className="text-text-3">
              <tr>
                <th className="px-5 py-3 font-medium">Element</th>
                <th className="px-3 py-3 font-medium">
                  <button type="button" onClick={() => setSort((value) => (value === "confidence" ? "name" : "confidence"))}>
                    Confidence
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">Sources</th>
                <th className="px-3 py-3 font-medium">Assumptions</th>
                <th className="px-3 py-3 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((element) => (
                <ElementRow key={element.id} element={element} warn={rules.warnNoEvidence} showAssumptions={rules.showAssumptions} />
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">By evidence type</h2>
        <Card className="mt-3">
          {kinds.map((kind) => {
            const count = data.sources.filter((source) => source.kind === kind).length;
            const max = Math.max(1, ...kinds.map((item) => data.sources.filter((source) => source.kind === item).length));
            return (
              <div key={kind} className="mb-2 grid grid-cols-[140px_1fr] items-center gap-3 last:mb-0">
                <span className="text-[13px] text-text-2">
                  {kindLabel[kind]} {count}
                </span>
                <span className="h-2 overflow-hidden rounded-bar bg-surface-2">
                  <span className="block h-full bg-conf-high" style={{ width: `${(count / max) * 100}%` }} />
                </span>
              </div>
            );
          })}
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Rules</h2>
        <Card className="mt-3">
          <Rule label="Require at least one source before High" on={rules.requireSourceForHigh} onChange={(value) => save({ ...rules, requireSourceForHigh: value })} />
          <Rule label="Warn when an element has no evidence" on={rules.warnNoEvidence} onChange={(value) => save({ ...rules, warnNoEvidence: value })} />
          <Rule label="Show assumptions to visitors" on={rules.showAssumptions} onChange={(value) => save({ ...rules, showAssumptions: value })} />
        </Card>
      </section>
    </div>
  );
}

function ElementRow({ element, warn, showAssumptions }: { element: EvidenceElement; warn: boolean; showAssumptions: boolean }) {
  return (
    <tr className="border-t border-border">
      <td className="px-5 py-3">
        {element.name}
        {warn && element.sourceCount === 0 ? <span className="mt-1 block text-conf-low">No evidence linked yet</span> : null}
      </td>
      <td className="px-3 py-3">
        <ChipConfidence level={chipLevel[element.confidence]} />
      </td>
      <td className="px-3 py-3">{element.sourceCount}</td>
      <td className="px-3 py-3">{showAssumptions ? element.assumptions.length : "—"}</td>
      <td className="px-3 py-3">{element.reviewed ? <Check className="size-4 text-conf-high" aria-label="Reviewed" /> : "—"}</td>
    </tr>
  );
}

function Rule({ label, on, onChange }: { label: string; on: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-[15px] leading-6">{label}</span>
      <Toggle label={label} state={on} onStateChange={onChange} />
    </div>
  );
}
