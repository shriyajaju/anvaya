"use client";

import { UploadDropzone } from "@/components/studio/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { survivalText, type DocumentData, type StudioAsset } from "@/lib/studio/records";
import { addMeasurement, deleteMeasurement, saveCondition, saveMetadata } from "@/server/content";
import { motion } from "framer-motion";
import { Box, ImageIcon } from "lucide-react";
import { useState } from "react";

const tabs = [
  { id: "condition", label: "Condition" },
  { id: "photos", label: "Photos & 3D" },
  { id: "records", label: "Drawings, measurements, inscriptions" },
  { id: "metadata", label: "Metadata" },
] as const;

type Tab = (typeof tabs)[number]["id"];

export function DocumentBoard({ data }: { data: DocumentData }) {
  const [tab, setTab] = useState<Tab>("condition");
  const motionEnabled = useMotionEnabled();
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="text-[40px] font-light leading-[48px] text-text-1">Document</h1>
        <p className="mt-1 text-[15px] leading-6 text-text-2">What physically exists at the site today.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`${focusRing} relative h-9 rounded-pill px-3.5 text-[13px] font-medium leading-5`}
            >
              {selected ? (
                <motion.span
                  layoutId={motionEnabled ? "document-tab" : undefined}
                  className="absolute inset-0 rounded-pill bg-primary"
                  transition={motionEnabled ? spring : { duration: 0 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-pill bg-surface-2" />
              )}
              <span className={`relative ${selected ? "text-on-primary" : "text-text-2"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
      {tab === "condition" ? <ConditionTab data={data} /> : null}
      {tab === "photos" ? <PhotosTab data={data} /> : null}
      {tab === "records" ? <RecordsTab data={data} /> : null}
      {tab === "metadata" ? <MetadataTab data={data} /> : null}
    </div>
  );
}

function ConditionTab({ data }: { data: DocumentData }) {
  const [state, setState] = useState(data.condition.state);
  const [notes, setNotes] = useState(data.condition.notes);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(data.elements.map((element) => [element.id, element.score])),
  );
  const [error, setError] = useState<string | null>(null);
  const photos = data.assets.filter((asset) => asset.kind === "photo");

  async function persist(nextScores = scores, nextState = state, nextNotes = notes) {
    const saved = await saveCondition({
      siteId: data.siteId,
      slug: data.slug,
      state: nextState,
      notes: nextNotes,
      survival: nextScores,
    });
    setError(saved.ok ? null : saved.error);
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Current condition</h2>
        <Card className="mt-3">
          <Segmented
            layoutId="condition-state"
            value={state}
            onValueChange={(value) => {
              const next = value as "good" | "fair" | "poor";
              setState(next);
              void persist(scores, next, notes);
            }}
            items={[
              { value: "good", label: "Good", tone: "Selected-High" },
              { value: "fair", label: "Fair", tone: "Selected-Medium" },
              { value: "poor", label: "Poor", tone: "Selected-Low" },
            ]}
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => void persist()}
            className="mt-4 min-h-[72px] w-full rounded-card bg-surface-2 px-4 py-3 text-[15px] leading-6 text-text-1 outline-none"
            aria-label="Condition notes"
          />
          <p className="mt-3 text-[13px] leading-5 text-text-3">
            {data.condition.surveyedAt ? `Last surveyed ${data.condition.surveyedAt}` : "Not surveyed yet"}
          </p>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Survival by element</h2>
        <Card className="mt-3" padding="None">
          {data.elements.map((element) => (
            <div key={element.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
              <span className="w-36 shrink-0 text-[15px] leading-6">{element.name}</span>
              <span className="flex flex-1 gap-1" role="radiogroup" aria-label={`${element.name} survival`}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    aria-label={`${score} of 5`}
                    aria-checked={scores[element.id] === score}
                    role="radio"
                    onClick={() => {
                      const next = { ...scores, [element.id]: score };
                      setScores(next);
                      void persist(next);
                    }}
                    className={`h-2 w-6 rounded-sm ${score <= (scores[element.id] ?? 0) ? "bg-text-1" : "bg-surface-2"}`}
                  />
                ))}
              </span>
              <span className="w-28 text-right text-[13px] leading-5 text-text-2">
                {survivalText(scores[element.id] ?? 0)}
              </span>
            </div>
          ))}
          <p className="px-5 py-3 text-[13px] leading-5 text-text-3">Survival informs confidence but does not set it.</p>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Condition photos</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
          {photos.map((photo) => (
            <Thumb key={photo.id} asset={photo} />
          ))}
        </div>
        <div className="mt-3">
          <UploadDropzone siteId={data.siteId} slug={data.slug} kind="photo" label="Add a condition photo" hint="JPEG or PNG" />
        </div>
      </section>
      {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
    </div>
  );
}

function PhotosTab({ data }: { data: DocumentData }) {
  const [picked, setPicked] = useState<StudioAsset | null>(data.assets.find((asset) => asset.kind === "photo" || asset.kind === "model") ?? null);
  const [evidenceFor, setEvidenceFor] = useState<StudioAsset | null>(null);
  const media = data.assets.filter((asset) => asset.kind === "photo" || asset.kind === "model");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
        {media.map((asset) => (
          <button key={asset.id} type="button" onClick={() => setPicked(asset)} className="text-left">
            <Thumb asset={asset} selected={picked?.id === asset.id} />
          </button>
        ))}
      </div>
      <UploadDropzone siteId={data.siteId} slug={data.slug} kind="photo" />
      {picked ? (
        <Card>
          <p className="text-[15px] leading-6">{picked.filename}</p>
          <p className="mt-1 text-[13px] leading-5 text-text-2">{picked.caption ?? picked.kind}</p>
          <button
            type="button"
            className={`${focusRing} mt-3 text-[13px] font-medium text-accent`}
            onClick={() => setEvidenceFor(picked)}
          >
            Use as evidence
          </button>
        </Card>
      ) : null}
      <Modal
        open={Boolean(evidenceFor)}
        onOpenChange={(open) => {
          if (!open) setEvidenceFor(null);
        }}
        onContinue={() => setEvidenceFor(null)}
        step="Visual source"
        title="Add evidence"
        progress={false}
        continueLabel="Close"
      >
        <Notice
          kind="Info"
          className="mt-4 w-full"
          message={`${evidenceFor?.filename ?? "This file"} will be filed as a visual source. The add-evidence form arrives with the Evidence step.`}
        />
      </Modal>
    </div>
  );
}

function Thumb({ asset, selected = false }: { asset: StudioAsset; selected?: boolean }) {
  const image = asset.url && asset.mime?.startsWith("image/");
  return (
    <span className="block">
      <span
        className={`flex aspect-square items-center justify-center overflow-hidden rounded-card bg-surface-2 ${selected ? "ring-2 ring-text-1" : ""}`}
      >
        {image ? (
          // Signed storage URLs are temporary and not known to the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url ?? ""} alt={asset.caption ?? asset.filename} className="size-full object-cover" />
        ) : asset.kind === "model" ? (
          <Box aria-hidden className="size-6 text-text-3" />
        ) : (
          <ImageIcon aria-hidden className="size-6 text-text-3" />
        )}
      </span>
      <span className="mt-1 block truncate text-[13px] leading-5 text-text-2">{asset.filename}</span>
    </span>
  );
}

function RecordsTab({ data }: { data: DocumentData }) {
  const drawings = data.assets.filter((asset) => asset.kind === "drawing" || asset.kind === "document");
  const [dimension, setDimension] = useState("");
  const [value, setValue] = useState("");
  const [unit] = useState("m");
  const [method, setMethod] = useState("");
  const [elementId, setElementId] = useState(data.elements[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Drawings & plans</h2>
        <Card className="mt-3" padding="None">
          {drawings.length === 0 ? (
            <p className="px-5 py-4 text-[15px] leading-6 text-text-2">No drawings yet.</p>
          ) : (
            drawings.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
                <span className="min-w-0 flex-1 text-[15px] leading-6">{asset.caption ?? asset.filename}</span>
              </div>
            ))
          )}
        </Card>
        <div className="mt-3">
          <UploadDropzone
            siteId={data.siteId}
            slug={data.slug}
            kind="drawing"
            label="Drop a drawing or scan"
            hint="PDF, PNG, or SVG"
          />
        </div>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Measurements</h2>
        <Card className="mt-3 overflow-x-auto" padding="None">
          <table className="w-full text-left text-[13px] leading-5">
            <thead className="text-text-3">
              <tr>
                <th className="px-5 py-3 font-medium">Element</th>
                <th className="px-3 py-3 font-medium">Dimension</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.measurements.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-5 py-3">{row.elementName}</td>
                  <td className="px-3 py-3">{row.dimension}</td>
                  <td className="px-3 py-3">
                    {row.value ?? "—"} {row.unit ?? ""}
                  </td>
                  <td className="px-3 py-3">{row.method ?? "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className="text-text-2"
                      onClick={() => void deleteMeasurement({ siteId: data.siteId, slug: data.slug, id: row.id })}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className="grid gap-3 border-t border-border p-5 min-[720px]:grid-cols-5"
            onSubmit={(event) => event.preventDefault()}
          >
            <Field
              kind="Select"
              label="Element"
              surface="Flat"
              value={elementId}
              onChange={(event) => setElementId(event.target.value)}
              options={data.elements.map((element) => ({ value: element.id, label: element.name }))}
            />
            <Field label="Dimension" surface="Flat" value={dimension} onChange={(event) => setDimension(event.target.value)} />
            <Field label="Value" surface="Flat" value={value} onChange={(event) => setValue(event.target.value)} />
            <Field label="Method" surface="Flat" value={method} onChange={(event) => setMethod(event.target.value)} />
            <div className="flex items-end">
              <Button
                size="Small"
                label="Add measurement"
                onClick={() => {
                  void addMeasurement({
                    siteId: data.siteId,
                    slug: data.slug,
                    elementId: elementId || null,
                    dimension,
                    value: value === "" ? null : Number(value),
                    unit,
                    method,
                  }).then((saved) => {
                    if (!saved.ok) setError(saved.error);
                    else {
                      setDimension("");
                      setValue("");
                      setMethod("");
                      setError(null);
                    }
                  });
                }}
              />
            </div>
          </form>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Inscriptions</h2>
        <Card className="mt-3">
          <p className="text-[15px] leading-6 text-text-2">
            No inscriptions are recorded for this site. A drawing or scan can be added above and captioned as an inscription.
          </p>
        </Card>
      </section>
      {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
    </div>
  );
}

function MetadataTab({ data }: { data: DocumentData }) {
  const [name, setName] = useState(data.name);
  const [siteType, setSiteType] = useState(data.siteType ?? "");
  const [location, setLocation] = useState(data.location ?? "");
  const [description, setDescription] = useState(data.description ?? "");
  const [managedBy, setManagedBy] = useState(data.managedBy ?? "");
  const [licence, setLicence] = useState(data.licence ?? "");
  const [archiveIndex, setArchiveIndex] = useState(data.archiveIndex);
  const [error, setError] = useState<string | null>(null);

  async function save(nextIndex = archiveIndex) {
    const saved = await saveMetadata({
      siteId: data.siteId,
      slug: data.slug,
      name,
      siteType,
      location,
      description,
      managedBy,
      licence,
      archiveIndex: nextIndex,
    });
    setError(saved.ok ? null : saved.error);
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Identity</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Official name" value={name} onChange={(event) => setName(event.target.value)} />
          <Field label="Site type" value={siteType} onChange={(event) => setSiteType(event.target.value)} />
          <Field label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <Field kind="Textarea" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Field label="Managing authority" value={managedBy} onChange={(event) => setManagedBy(event.target.value)} />
          <Field label="Data licence" value={licence} onChange={(event) => setLicence(event.target.value)} />
        </div>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Preservation</h2>
        <Card className="mt-3">
          <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Persistent identifier</p>
          <p className="mt-1 text-[15px] leading-6">anvaya:site:{data.slug}</p>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-[15px] leading-6">Include in public archive index</span>
            <Toggle
              label="Include in public archive index"
              state={archiveIndex}
              onStateChange={(next) => {
                setArchiveIndex(next);
                void save(next);
              }}
            />
          </div>
        </Card>
      </section>
      {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
      <Button label="Save metadata" onClick={() => void save()} />
    </form>
  );
}
