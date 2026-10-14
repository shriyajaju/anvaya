"use client";

import { useWorkspace } from "@/components/studio/workspace-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Toggle } from "@/components/ui/toggle";
import { focusRing } from "@/components/ui/motion";
import { yearLabel, type EventRow } from "@/lib/studio/records";
import { deleteEvent, deletePeriod, saveEvent, savePeriod } from "@/server/content";
import { useState } from "react";

const kinds = ["Construction", "Use", "Damage", "Documentation", "Other"];

export function TimelineBoard() {
  const { timeline, timelineView, setTimelineView, selectedEventId, setSelectedEventId } = useWorkspace();
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);
  const [periodName, setPeriodName] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div>
        <h1 className="text-[32px] font-normal leading-none tracking-[-0.48px] text-text-1">Timeline</h1>
        <p className="mt-1.5 text-[11px] leading-5 text-text-2">
          {timelineView === "periods"
            ? "The history of this site, as far as we know it."
            : "How the physical site changed between periods."}
        </p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-4 text-[13px]">
          <button
            type="button"
            className={timelineView === "periods" ? "border-b-2 border-text-1 pb-1 font-medium" : "pb-1 text-text-2"}
            onClick={() => setTimelineView("periods")}
          >
            Periods & events
          </button>
          <button
            type="button"
            className={timelineView === "changes" ? "border-b-2 border-text-1 pb-1 font-medium" : "pb-1 text-text-2"}
            onClick={() => setTimelineView("changes")}
          >
            Site changes
          </button>
        </div>
        <Button
          size="Small"
          label="+ Add event"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      </div>
      {timelineView === "periods" ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">Periods</h2>
          {timeline.periods.map((period) => {
            const events = timeline.events.filter((event) => event.periodId === period.id);
            const selected = events.some((event) => event.id === selectedEventId);
            return (
              <Card key={period.id} className={selected ? "ring-2 ring-text-1" : ""}>
                <button type="button" className="w-full text-left" onClick={() => events[0] && setSelectedEventId(events[0].id)}>
                  <span className="mr-3 inline-block h-10 w-1.5 rounded-sm bg-text-3 align-middle" />
                  <span className="align-middle">
                    <span className="block text-[13px] font-medium leading-5">
                      {period.name}
                      {period.yearFrom !== null ? ` · ${yearLabel(period.yearFrom)} – ${yearLabel(period.yearTo)}` : ""}
                    </span>
                    <span className="block text-[10px] leading-4 text-text-3">
                      {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
                      {events.reduce((sum, event) => sum + event.elementIds.length, 0)} linked element
                      {events.reduce((sum, event) => sum + event.elementIds.length, 0) === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
                <div className="mt-2 flex gap-3 pl-5 text-[13px] text-text-2">
                  {events.map((event) => (
                    <button key={event.id} type="button" className={focusRing} onClick={() => { setEditing(event); setOpen(true); }}>
                      Edit {event.title}
                    </button>
                  ))}
                  <button type="button" onClick={() => void deletePeriod({ siteId: timeline.siteId, slug: timeline.slug, id: period.id })}>
                    Remove period
                  </button>
                </div>
              </Card>
            );
          })}
          <form className="mt-2 grid gap-2" onSubmit={(event) => event.preventDefault()}>
            <Field label="New period" value={periodName} onChange={(event) => setPeriodName(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="From" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} />
              <Field label="To" value={yearTo} onChange={(event) => setYearTo(event.target.value)} />
            </div>
            <Button
              size="Small"
              label="Add period"
              onClick={() => {
                void savePeriod({
                  siteId: timeline.siteId,
                  slug: timeline.slug,
                  name: periodName,
                  yearFrom: yearFrom === "" ? null : Number(yearFrom),
                  yearTo: yearTo === "" ? null : Number(yearTo),
                }).then((saved) => {
                  if (!saved.ok) setError(saved.error);
                  else setPeriodName("");
                });
              }}
            />
          </form>
        </section>
      ) : (
        <ol className="relative ml-2 border-l border-border">
          {timeline.periods.map((period) => (
            <li key={period.id} className="relative pb-4 pl-6">
              <span className="absolute -left-1 top-4 size-2 rounded-full bg-text-1" />
              <Card>
                <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">
                  {period.name}
                  {period.yearFrom !== null ? ` · ${yearLabel(period.yearFrom)} – ${yearLabel(period.yearTo)}` : ""}
                </p>
                {timeline.events
                  .filter((event) => event.periodId === period.id)
                  .map((event) => (
                    <div key={event.id} className="mt-3">
                      <p className="text-[15px] font-medium leading-6">{event.title}</p>
                      <p className="text-[13px] leading-5 text-text-2">{event.description}</p>
                    </div>
                  ))}
              </Card>
            </li>
          ))}
        </ol>
      )}
      {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
      <EventModal
        open={open}
        event={editing}
        onOpenChange={setOpen}
        onDelete={
          editing
            ? () => {
                void deleteEvent({ siteId: timeline.siteId, slug: timeline.slug, id: editing.id });
                setOpen(false);
              }
            : undefined
        }
      />
    </div>
  );
}

function EventModal({
  open,
  event,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  event: EventRow | null;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
}) {
  const { timeline } = useWorkspace();
  const [title, setTitle] = useState(event?.title ?? "");
  const [year, setYear] = useState(event?.year?.toString() ?? "");
  const [approx, setApprox] = useState(event?.approx ?? true);
  const [periodId, setPeriodId] = useState(event?.periodId ?? timeline.periods[0]?.id ?? "");
  const [kind, setKind] = useState(event?.kind ?? "Construction");
  const [description, setDescription] = useState(event?.description ?? "");
  const [elementIds, setElementIds] = useState<string[]>(event?.elementIds ?? []);
  const [error, setError] = useState<string | null>(null);

  return (
      <Modal
        footer={false}
        open={open}
        onOpenChange={(next) => {
        if (next) {
          setTitle(event?.title ?? "");
          setYear(event?.year?.toString() ?? "");
          setApprox(event?.approx ?? true);
          setPeriodId(event?.periodId ?? timeline.periods[0]?.id ?? "");
          setKind(event?.kind ?? "Construction");
          setDescription(event?.description ?? "");
          setElementIds(event?.elementIds ?? []);
          setError(null);
        }
        onOpenChange(next);
      }}
      step="Timeline"
      title={event ? "Edit event" : "Add an event"}
      progress={false}
    >
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(submit) => {
          submit.preventDefault();
          void saveEvent({
            siteId: timeline.siteId,
            slug: timeline.slug,
            id: event?.id,
            title,
            year: year === "" ? null : Number(year),
            approx,
            periodId: periodId || null,
            kind,
            description,
            elementIds,
          }).then((saved) => {
            if (!saved.ok) setError(saved.error);
            else onOpenChange(false);
          });
        }}
      >
        <Field label="Title" value={title} onChange={(input) => setTitle(input.target.value)} />
        <Field label="Year" value={year} onChange={(input) => setYear(input.target.value)} />
        <div className="flex items-center justify-between">
          <span className="text-[15px] leading-6">Approximate</span>
          <Toggle label="Approximate date" state={approx} onStateChange={setApprox} />
        </div>
        <Field
          kind="Select"
          label="Period"
          value={periodId}
          onChange={(input) => setPeriodId(input.target.value)}
          options={timeline.periods.map((period) => ({ value: period.id, label: period.name }))}
        />
        <Field kind="Textarea" label="Description" value={description} onChange={(input) => setDescription(input.target.value)} />
        <div className="flex flex-wrap gap-2">
          {kinds.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`${focusRing} h-8 rounded-pill px-3 text-[13px] ${kind === item ? "bg-primary text-on-primary" : "bg-surface-2 text-text-2"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <fieldset>
          <legend className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Linked elements</legend>
          <div className="mt-2 flex flex-col gap-1">
            {timeline.elements.map((element) => (
              <label key={element.id} className="flex items-center gap-2 text-[15px] leading-6">
                <input
                  type="checkbox"
                  checked={elementIds.includes(element.id)}
                  onChange={(input) =>
                    setElementIds((current) =>
                      input.target.checked ? [...current, element.id] : current.filter((id) => id !== element.id),
                    )
                  }
                />
                {element.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Notice
          kind="Warning"
          className="w-full"
          message={
            elementIds.length
              ? `${elementIds.length} linked. Events still need a source before they read as well supported.`
              : "0 linked — events without sources stay uncertain."
          }
        />
        {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
        <div className="flex justify-end gap-2">
          {onDelete ? <Button type="Ghost" size="Small" label="Delete" onClick={onDelete} /> : null}
          <Button
            size="Small"
            label={event ? "Save event" : "Add event"}
            onClick={() => {
              void saveEvent({
                siteId: timeline.siteId,
                slug: timeline.slug,
                id: event?.id,
                title,
                year: year === "" ? null : Number(year),
                approx,
                periodId: periodId || null,
                kind,
                description,
                elementIds,
              }).then((saved) => {
                if (!saved.ok) setError(saved.error);
                else onOpenChange(false);
              });
            }}
          />
        </div>
      </form>
    </Modal>
  );
}
