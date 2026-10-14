"use client";

import type { SurvivalElement, TimelineData } from "@/lib/studio/records";
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
  return (
    <WorkspaceContext.Provider
      value={{ pins, timeline, caption, timelineView, setTimelineView, selectedEventId, setSelectedEventId }}
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

