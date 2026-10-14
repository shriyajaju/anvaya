"use client";

import { Avatar } from "@/components/ui/avatar";
import { ConfidenceBar, ProgressBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, ChipNeutral, ChipStatus } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Modal, ModalBody } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { Row } from "@/components/ui/row";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { TileOption } from "@/components/ui/tile-option";
import { ToastDemo } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { TooltipExample } from "@/components/ui/tooltip";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";

function Specimen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

function Column({ theme }: { theme: "light" | "dark" }) {
  const [on, setOn] = useState(true);
  const [segment, setSegment] = useState("high");
  const [tile, setTile] = useState("document");
  return (
    <div data-theme={theme} className="min-h-screen bg-page p-8 text-text-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{theme}</p>
      <h1 className="mt-2 text-[32px] font-light leading-10">Kitchen sink</h1>

      <Specimen title="Button">
        <Button label="Publish" />
        <Button type="Secondary" label="Cancel" />
        <Button type="Ghost" label="Button label" />
        <Button size="Small" label="Save" />
        <Button state="Disabled" label="Disabled" />
        <Button iconOnly aria-label="Add" iconLeft={<Plus className="size-4" />} />
      </Specimen>

      <Specimen title="Chip">
        <ChipConfidence level="High" audience="Studio" />
        <ChipConfidence level="Medium" audience="Studio" />
        <ChipConfidence level="Low" audience="Studio" />
        <ChipConfidence level="High" audience="Visitor" />
        <ChipConfidence level="Medium" audience="Visitor" />
        <ChipConfidence level="Low" audience="Visitor" />
        <ChipConfidence level="High" glass help />
        <ChipConfidence level="Medium" audience="Visitor" glass />
        <ChipStatus state="Draft" />
        <ChipStatus state="In review" />
        <ChipStatus state="Published" />
        <ChipStatus state="Archived" />
        <ChipNeutral label="Group" />
        <ChipNeutral label="3" />
      </Specimen>

      <Specimen title="Pill">
        <Pill label="Label" />
        <Pill label="Label" state="Selected" />
        <Pill label="Label" size="XS" />
        <Pill label="Kanheri" switcher />
        <Pill label="Sources" count countValue="28" />
      </Specimen>

      <Specimen title="Field">
        <div className="w-80">
          <Field label="Label" defaultValue="Kanheri Caves" />
        </div>
        <div className="w-80">
          <Field label="Label" surface="Flat" placeholder="Placeholder" />
        </div>
        <div className="w-80">
          <Field kind="Textarea" label="Note" defaultValue="Placeholder note" />
        </div>
        <div className="w-80">
          <Field
            kind="Select"
            label="Kind"
            options={[
              { value: "physical", label: "Physical" },
              { value: "historical", label: "Historical" },
            ]}
            defaultValue="physical"
          />
        </div>
        <div className="w-80">
          <Field label="Label" state="Error" error="A source is required" defaultValue="Kanheri Caves" />
        </div>
      </Specimen>

      <Specimen title="Card, row, icon tile">
        <Card sectionLabel="Section" className="w-80">
          <p className="text-[15px] leading-6">Card body</p>
        </Card>
        <Card padding="Tight" className="w-80">
          <p className="text-[15px] leading-6">Tight</p>
        </Card>
        <div className="w-full max-w-[600px]">
          <Row title="North wall" meta="Architectural" dot="High" trailing={<ChipConfidence level="High" />} />
          <Row title="Roof" meta="Inferred" dot="Medium" />
          <Row title="Frieze" dot="Low" divider={false} />
        </div>
        <IconTile>
          <FileText className="size-5" />
        </IconTile>
        <IconTile size="32">
          <FileText className="size-4" />
        </IconTile>
      </Specimen>

      <Specimen title="Toggle and segmented">
        <Toggle label="Require a source" state={on} onStateChange={setOn} />
        <Segmented
          layoutId={`segment-${theme}`}
          value={segment}
          onValueChange={setSegment}
          items={[
            { value: "all", label: "All", tone: "Selected" },
            { value: "high", label: "High", tone: "Selected-High" },
            { value: "medium", label: "Medium", tone: "Selected-Medium" },
            { value: "low", label: "Low", tone: "Selected-Low" },
          ]}
        />
      </Specimen>

      <Specimen title="Avatar and bars">
        <Avatar initials="AI" size="24" />
        <Avatar initials="RM" size="32" ring />
        <Avatar initials="SR" size="40" />
        <ConfidenceBar proportion="3:1:1" />
        <ConfidenceBar proportion="7:3:2" legend={false} />
        <ProgressBar percent={65} />
      </Specimen>

      <Specimen title="Notice">
        <Notice kind="Warning" message="High confidence needs a linked source." />
        <Notice kind="Error" message="This write was refused." />
        <Notice kind="Info" message="A reviewer has been asked." />
      </Specimen>

      <Specimen title="Tile, modal, toast, tooltip">
        <TileOption
          label="Historical document"
          icon={<FileText className="size-5" />}
          state={tile === "document" ? "Selected" : "Default"}
          onSelect={() => setTile("document")}
        />
        <TileOption
          label="Photograph"
          icon={<FileText className="size-5" />}
          state={tile === "photo" ? "Selected" : "Default"}
          onSelect={() => setTile("photo")}
        />
        <Modal trigger={<Button label="Open modal" />} />
        <div className="w-[480px] rounded-modal bg-surface p-8 shadow-float">
          <ModalBody title="Describe the source" step="Step 2 of 3 · Describe the source" progress percent={66}>
            Add fields or supporting content here.
          </ModalBody>
        </div>
        <ToastDemo />
        <TooltipExample />
      </Specimen>

      <Specimen title="Skeleton and empty">
        <Skeleton className="h-12 w-80" />
        <div className="w-full">
          <EmptyState title="No sources yet" body="Link a source before marking an element well supported." />
        </div>
      </Specimen>
    </div>
  );
}

export default function KitchenSinkPage() {
  return (
    <main className="grid min-h-screen grid-cols-2">
      <Column theme="light" />
      <Column theme="dark" />
    </main>
  );
}
