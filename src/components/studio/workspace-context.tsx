"use client";

import type { EvidencePin, EvidenceView, SurvivalElement, TimelineData } from "@/lib/studio/records";
import { createContext, useContext, useState, type ReactNode } from "react";

export type TimelineView = "periods" | "changes";

type WorkspaceValue = {
  pins: SurvivalElement[];
  timeline: TimelineData;
  caption: string;
  timelineView: TimelineView;
  setTimelineView: (view: TimelineView) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  evidenceView: EvidenceView;
  setEvidenceView: (view: EvidenceView) => void;
  evidencePins: EvidencePin[];
  setEvidencePins: (pins: EvidencePin[]) => void;
  evidenceGroup: string;
  setEvidenceGroup: (name: string) => void;
  selectedPinId: string | null;
  setSelectedPinId: (id: string | null) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({
  pins,
  timeline,
  caption,
  children,
}: {
  pins: SurvivalElement[];
  timeline: TimelineData;
  caption: string;
  children: ReactNode;
}) {
  const [timelineView, setTimelineView] = useState<TimelineView>("periods");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(timeline.events[0]?.id ?? null);
  const [evidenceView, setEvidenceView] = useState<EvidenceView>("sources");
  const [evidencePins, setEvidencePins] = useState<EvidencePin[]>([]);
  const [evidenceGroup, setEvidenceGroup] = useState("Plan");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  return (
    <WorkspaceContext.Provider
      value={{
        pins,
        timeline,
        caption,
        timelineView,
        setTimelineView,
        selectedEventId,
        setSelectedEventId,
        evidenceView,
        setEvidenceView,
        evidencePins,
        setEvidencePins,
        evidenceGroup,
        setEvidenceGroup,
        selectedPinId,
        setSelectedPinId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace data is only available inside a site.");
  return value;
}

