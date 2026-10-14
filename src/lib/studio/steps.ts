export const SITE_STEPS = [
  { id: "overview", label: "Overview" },
  { id: "document", label: "Document" },
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "reconstruct", label: "Reconstruct" },
  { id: "stories", label: "Stories" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
  { id: "archive", label: "Archive" },
] as const;

export type SiteStepId = (typeof SITE_STEPS)[number]["id"];

export const WIDE_STEPS: readonly SiteStepId[] = ["reconstruct"];

export function isSiteStep(value: string): value is SiteStepId {
  return SITE_STEPS.some((step) => step.id === value);
}

export type StepSignals = {
  hasIdentity: boolean;
  hasCondition: boolean;
  evidenceCount: number;
  timelineCount: number;
  elementCount: number;
  storyCount: number;
  reviewApproved: boolean;
  published: boolean;
  versionCount: number;
};

export function stepStatus(signals: StepSignals): Record<SiteStepId, boolean> {
  return {
    overview: signals.hasIdentity,
    document: signals.hasCondition,
    evidence: signals.evidenceCount > 0,
    timeline: signals.timelineCount > 0,
    reconstruct: signals.elementCount > 0,
    stories: signals.storyCount > 0,
    review: signals.reviewApproved,
    publish: signals.published,
    archive: signals.versionCount > 0,
  };
}
