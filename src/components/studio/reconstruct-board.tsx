"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, type ConfidenceLevel } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { TileOption } from "@/components/ui/tile-option";
import { Toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/browser";
import { linkEvidence, unlinkEvidence } from "@/server/evidence";
import { createElement, setConfidence, updateElement } from "@/server/reconstruct";
import type { ReconstructData, SceneElement, SceneTransform } from "@/server/reconstruct-data";
import { motion } from "framer-motion";
import { Box, Eye, EyeOff, MousePointer2, Move, RotateCw, Scaling, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, useState, type ReactNode } from "react";

const SceneBuilder = dynamic(() => import("@/components/three/scene-builder").then((mod) => mod.SceneBuilder), {
  ssr: false,
});

const chip: Record<SceneElement["confidence"], ConfidenceLevel> = { high: "High", medium: "Medium", low: "Low" };
const visitorWord = { high: "Well supported", medium: "Likely", low: "Uncertain" };
const kindLabel = { group: "Group", structure: "Structure", architectural: "Architectural detail", object: "Object" };

export function ReconstructBoard({ data }: { data: ReconstructData }) {
  const [selectedId, setSelectedId] = useState<string | null>(data.elements.find((element) => element.kind !== "group")?.id ?? null);
  const [mode, setMode] = useState<"translate" | "rotate" | "scale" | "orbit">("orbit");
  const [colours, setColours] = useState(true);
  const [thenNow, setThenNow] = useState<"then" | "now" | "compare">("now");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, SceneTransform>>({});
  const selected = data.elements.find((element) => element.id === selectedId) ?? null;
  const leaves = data.elements.filter((element) => element.kind !== "group");
  const missing = leaves.filter((element) => element.sources.length === 0).length;
  const elements = data.elements.map((element) =>
    overrides[element.id] ? { ...element, transform: overrides[element.id] } : element,
  );

  function toastMessage(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="grid h-[calc(100vh-7.5rem)] grid-cols-1 gap-4 pt-4 min-[1100px]:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="flex min-h-0 flex-col rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-medium leading-[26px]">Elements</h1>
          <button type="button" className={`${focusRing} text-[13px] font-medium text-accent`} onClick={() => setAdding(true)}>
            + Add
          </button>
        </div>
        <div className="mt-3">
          <span className="inline-flex h-9 items-center rounded-pill bg-surface-2 px-3 text-[13px] text-text-1">
            {data.periods[0]?.name ?? (data.year ? `${data.year} CE` : "Period")}
          </span>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {data.elements
            .filter((element) => !element.parentId)
            .map((element) => (
              <TreeNode
                key={element.id}
                element={element}
                elements={data.elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onVisible={(id, visible) => void updateElement({ siteId: data.siteId, id, visible })}
              />
            ))}
        </div>
        <p className="pt-3 text-[13px] leading-5 text-text-3">
          {leaves.length} elements · {missing} without evidence
        </p>
      </aside>
      <section className="relative min-h-[520px]">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <Segmented
            layoutId="then-now"
            value={thenNow}
            onValueChange={(value) => setThenNow(value as "then" | "now" | "compare")}
            items={[
              { value: "then", label: "Then" },
              { value: "now", label: "Now" },
              { value: "compare", label: "Compare" },
            ]}
          />
        </div>
        <Link
          href={selected ? `/${data.slug}/ar/${selected.id}?preview=${encodeURIComponent(data.previewToken)}` : `/${data.slug}?preview=${encodeURIComponent(data.previewToken)}`}
          className={`${focusRing} absolute right-3 top-3 z-10 inline-flex h-9 items-center rounded-button bg-surface px-3 text-[11px] font-medium uppercase tracking-[0.08em] shadow-card`}
        >
          AR preview
        </Link>
        <SceneBoundary>
          <SceneBuilder
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            mode={mode}
            colours={colours}
            thenNow={thenNow}
            onTransform={(id, transform) => {
              const previous = overrides[id] ?? data.elements.find((element) => element.id === id)?.transform ?? null;
              setOverrides((current) => ({ ...current, [id]: transform }));
              void updateElement({ siteId: data.siteId, id, transform }).then((saved) => {
                if (saved.ok) return;
                setOverrides((current) => {
                  const next = { ...current };
                  if (previous) next[id] = previous;
                  else delete next[id];
                  return next;
                });
                toastMessage("The move was not saved.");
              });
            }}
          />
        </SceneBoundary>
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-pill bg-surface px-2 py-1 shadow-float">
          <Tool label="Orbit" pressed={mode === "orbit"} onClick={() => setMode("orbit")}>
            <MousePointer2 className="size-4" />
          </Tool>
          <Tool label="Move" pressed={mode === "translate"} onClick={() => setMode("translate")}>
            <Move className="size-4" />
          </Tool>
          <Tool label="Rotate" pressed={mode === "rotate"} onClick={() => setMode("rotate")}>
            <RotateCw className="size-4" />
          </Tool>
          <Tool label="Scale" pressed={mode === "scale"} onClick={() => setMode("scale")}>
            <Scaling className="size-4" />
          </Tool>
          <button
            type="button"
            aria-pressed={colours}
            onClick={() => setColours((value) => !value)}
            className={`${focusRing} h-8 rounded-pill px-3 text-[12px] ${colours ? "bg-primary text-on-primary" : "text-text-2"}`}
          >
            Confidence colours
          </button>
        </div>
      </section>
      <Inspector data={data} element={selected} onToast={toastMessage} />
      <AddElement open={adding} data={data} onOpenChange={setAdding} />
      <Toast message={toast ?? ""} open={Boolean(toast)} />
    </div>
  );
}

function TreeNode({
  element,
  elements,
  selectedId,
  onSelect,
  onVisible,
  depth = 0,
}: {
  element: SceneElement;
  elements: SceneElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onVisible: (id: string, visible: boolean) => void;
  depth?: number;
}) {
  const children = elements.filter((item) => item.parentId === element.id);
  const selected = element.id === selectedId;
  return (
    <div>
      <div className={`flex items-center gap-2 rounded-button py-1.5 pr-1 ${selected ? "bg-surface-2" : ""}`} style={{ paddingLeft: 8 + depth * 16 }}>
        <button type="button" className="min-w-0 flex-1 truncate text-left text-[14px] leading-5" onClick={() => onSelect(element.id)}>
          {element.name}
        </button>
        {element.kind !== "group" ? <ChipConfidence level={chip[element.confidence]} /> : null}
        <button type="button" aria-label={element.visible ? `Hide ${element.name}` : `Show ${element.name}`} onClick={() => onVisible(element.id, !element.visible)}>
          {element.visible ? <Eye className="size-4 text-text-2" /> : <EyeOff className="size-4 text-text-3" />}
        </button>
      </div>
      {children.map((child) => (
        <TreeNode key={child.id} element={child} elements={elements} selectedId={selectedId} onSelect={onSelect} onVisible={onVisible} depth={depth + 1} />
      ))}
    </div>
  );
}

function Inspector({ data, element, onToast }: { data: ReconstructData; element: SceneElement | null; onToast: (message: string) => void }) {
  if (!element) return <Card className="text-[15px] text-text-2">Select an element.</Card>;
  return <InspectorForm key={element.id} data={data} element={element} onToast={onToast} />;
}

function InspectorForm({ data, element, onToast }: { data: ReconstructData; element: SceneElement; onToast: (message: string) => void }) {
  const [name, setName] = useState(element.name);
  const [rationale, setRationale] = useState(element.rationale);
  const [assumptions, setAssumptions] = useState(element.assumptions);
  const [draft, setDraft] = useState("");
  const [confidence, setLevel] = useState(element.confidence);
  const [notice, setNotice] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [linking, setLinking] = useState(false);
  const motionEnabled = useMotionEnabled();
  const groups = data.elements.filter((item) => item.kind === "group");

  return (
    <div className="min-h-0 overflow-auto rounded-card bg-surface p-4 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Element</p>
      <div className="mt-3 flex flex-col gap-3">
        <Field
          label="Name"
          surface="Flat"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void updateElement({ siteId: data.siteId, id: element.id, name })}
        />
        <Field
          kind="Select"
          label="Type"
          surface="Flat"
          value={element.kind}
          options={(Object.keys(kindLabel) as (keyof typeof kindLabel)[]).map((kind) => ({ value: kind, label: kindLabel[kind] }))}
          onChange={(event) => void updateElement({ siteId: data.siteId, id: element.id, kind: event.target.value as SceneElement["kind"] })}
        />
        <Field label="Period" surface="Flat" value={data.year ? `${data.year} CE` : data.periods[0]?.name ?? ""} readOnly />
        <Field
          kind="Select"
          label="Parent"
          surface="Flat"
          value={element.parentId ?? ""}
          options={[{ value: "", label: "None" }, ...groups.map((group) => ({ value: group.id, label: group.name }))]}
          onChange={(event) => void updateElement({ siteId: data.siteId, id: element.id, parentId: event.target.value || null })}
        />
      </div>
      <section className="mt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Confidence</h2>
        <motion.div animate={pulse && motionEnabled ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={spring} className="mt-2">
          <Segmented
            layoutId={`confidence-${element.id}`}
            value={confidence}
            onValueChange={(value) => {
              const next = value as SceneElement["confidence"];
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
                  onToast("Confidence was not changed.");
                  return;
                }
                setNotice(null);
                setPulse(true);
                window.setTimeout(() => setPulse(false), 400);
                onToast("Confidence updated");
              });
            }}
            items={[
              { value: "high", label: "High", tone: "Selected-High" },
              { value: "medium", label: "Medium", tone: "Selected-Medium" },
              { value: "low", label: "Low", tone: "Selected-Low" },
            ]}
          />
        </motion.div>
        {notice ? <Notice kind="Warning" message={notice} className="mt-3 w-full" /> : null}
        <label className="mt-3 block text-[13px] leading-5 text-text-2">
          Why this rating?
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            onBlur={() => void updateElement({ siteId: data.siteId, id: element.id, rationale })}
            className="mt-1 min-h-[88px] w-full rounded-card bg-surface-2 px-3 py-2 text-[15px] leading-6 text-text-1 outline-none"
          />
        </label>
        <p className="mt-1 text-[13px] leading-5 text-text-3">Shown to visitors as ‘{visitorWord[confidence]}’.</p>
      </section>
      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Evidence</h2>
          <button type="button" className="text-[13px] font-medium text-accent" onClick={() => setLinking(true)}>
            Link evidence
          </button>
        </div>
        <Card className="mt-2" padding="Tight">
          <p className="text-[13px] leading-5">{element.sources.length} source{element.sources.length === 1 ? "" : "s"} linked</p>
          {element.sources.length === 0 ? <Notice kind="Error" message="No evidence linked yet." className="mt-2 w-full" /> : null}
          {element.sources.map((source) => (
            <div key={source.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
              <span>
                <span className="block text-[14px] leading-5">{source.title}</span>
                <span className="block text-[12px] text-text-2">
                  {source.kind}
                  {source.dateLabel ? ` · ${source.dateLabel}` : ""}
                </span>
              </span>
              <button
                type="button"
                className="text-[13px] text-text-2"
                onClick={() => void unlinkEvidence({ siteId: data.siteId, evidenceId: source.id, elementId: element.id })}
              >
                Unlink
              </button>
            </div>
          ))}
        </Card>
      </section>
      <section className="mt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Assumptions</h2>
        <ul className="mt-2 flex flex-col gap-1 text-[14px] leading-5">
          {assumptions.map((item) => (
            <li key={item} className="flex items-center justify-between gap-2">
              <span>{item}</span>
              <button
                type="button"
                className="text-[13px] text-text-2"
                onClick={() => {
                  const next = assumptions.filter((entry) => entry !== item);
                  setAssumptions(next);
                  void updateElement({ siteId: data.siteId, id: element.id, assumptions: next });
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = [...assumptions, draft.trim()];
            setAssumptions(next);
            setDraft("");
            void updateElement({ siteId: data.siteId, id: element.id, assumptions: next });
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Add assumption"
            className="h-9 flex-1 rounded-card bg-surface-2 px-3 text-[14px] outline-none"
          />
          <Button
            size="Small"
            label="Add"
            state={draft.trim() ? "Default" : "Disabled"}
            disabled={!draft.trim()}
            onClick={() => {
              const next = [...assumptions, draft.trim()];
              setAssumptions(next);
              setDraft("");
              void updateElement({ siteId: data.siteId, id: element.id, assumptions: next });
            }}
          />
        </form>
      </section>
      <section className="mt-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">Visibility</h2>
        <div className="mt-2 flex items-center justify-between py-2">
          <span className="text-[15px]">Show in visitor experience</span>
          <Toggle label="Show in visitor experience" state={element.visible} onStateChange={(visible) => void updateElement({ siteId: data.siteId, id: element.id, visible })} />
        </div>
      </section>
      <Modal open={linking} onOpenChange={setLinking} footer={false} step="Evidence" title="Link evidence" progress={false}>
        <div className="flex flex-col gap-2">
          {data.sources.map((source) => {
            const linked = element.sources.some((item) => item.id === source.id);
            return (
              <button
                key={source.id}
                type="button"
                className={`${focusRing} rounded-card px-3 py-2 text-left text-[14px] ${linked ? "bg-primary text-on-primary" : "bg-surface-2"}`}
                onClick={() => {
                  const action = linked ? unlinkEvidence : linkEvidence;
                  void action({ siteId: data.siteId, evidenceId: source.id, elementId: element.id });
                }}
              >
                {source.title}
              </button>
            );
          })}
          <Link href={`/s/${data.slug}/evidence`} className="text-[13px] font-medium text-accent">
            Add a new source
          </Link>
        </div>
      </Modal>
    </div>
  );
}

function AddElement({ open, data, onOpenChange }: { open: boolean; data: ReconstructData; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<"structure" | "architectural" | "object">("structure");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(data.elements.find((element) => element.kind === "group")?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    let storagePath: string | undefined;
    if (file) {
      const supabase = createClient();
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
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
          "Content-Type": file.type || "model/gltf-binary",
        },
        body: file,
      });
      if (!uploaded.ok) {
        setError("The model upload did not finish.");
        return;
      }
    }
    const saved = await createElement({
      siteId: data.siteId,
      name,
      kind: file ? "architectural" : kind,
      parentId: parentId || null,
      storagePath,
      filename: file?.name,
      mime: file?.type,
      bytes: file?.size,
    });
    if (!saved.ok) setError(saved.error);
    else {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} footer={false} step={data.year ? `Cave · ${data.year} CE` : "Element"} title="Add an element" progress={false}>
      <div className="grid grid-cols-2 gap-3">
        <TileOption label="Structure" state={kind === "structure" && !file ? "Selected" : "Default"} icon={<Box className="size-4" />} onSelect={() => { setKind("structure"); setFile(null); }} />
        <TileOption label="Architectural detail" state={kind === "architectural" && !file ? "Selected" : "Default"} icon={<Box className="size-4" />} onSelect={() => { setKind("architectural"); setFile(null); }} />
        <TileOption label="Object" state={kind === "object" && !file ? "Selected" : "Default"} icon={<Box className="size-4" />} onSelect={() => { setKind("object"); setFile(null); }} />
        <label className={`flex min-h-[140px] cursor-pointer flex-col justify-between rounded-card border-2 p-4 ${file ? "border-text-1" : "border-border"}`}>
          <Upload className="size-4" />
          <span className="text-[15px] font-medium">{file ? file.name : "Upload GLB"}</span>
          <input type="file" accept=".glb,model/gltf-binary" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Field
          kind="Select"
          label="Parent element"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          options={data.elements.filter((element) => element.kind === "group").map((element) => ({ value: element.id, label: element.name }))}
        />
      </div>
      <Notice kind="Info" className="mt-4 w-full" message="New elements start as Low confidence until evidence is linked." />
      {error ? <Notice kind="Error" message={error} className="mt-3 w-full" /> : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="Secondary" size="Small" label="Cancel" onClick={() => onOpenChange(false)} />
        <Button size="Small" label="Add to scene" state={name.trim().length < 2 ? "Disabled" : "Default"} disabled={name.trim().length < 2} onClick={() => void save()} />
      </div>
    </Modal>
  );
}

function Tool({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className={`${focusRing} flex size-8 items-center justify-center rounded-full ${pressed ? "bg-primary text-on-primary" : "text-text-2"}`}>
      {children}
    </button>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <Notice kind="Warning" message="This browser could not start the 3D view." className="w-full" />;
    return this.props.children;
  }
}
