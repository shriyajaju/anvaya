export type VisitorLevel = "high" | "medium" | "low";

export type VisitorEvidence = {
  id: string;
  kind: string;
  title: string;
  citation: string | null;
  dateLabel: string | null;
  strength: VisitorLevel;
  note: string | null;
  url: string | null;
};

export type VisitorInterpretation = {
  id: string;
  label: string;
  summary: string;
  confidence: VisitorLevel;
  selected: boolean;
};

export type VisitorElement = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  confidence: VisitorLevel;
  rationale: string;
  assumptions: string[];
  visible: boolean;
  modelUrl: string | null;
  usdzUrl: string | null;
  evidence: VisitorEvidence[];
  interpretations: VisitorInterpretation[];
};

export type VisitorReconstructionRegion = {
  id: string;
  elementId: string;
  shape: { x: number; y: number }[];
};

export type VisitorReconstruction = {
  id: string;
  imageUrl: string | null;
  sourcePhotoUrl: string | null;
  sourcePhotoId: string | null;
  promptText: string | null;
  origin: "generated" | "uploaded";
  edgeGuideUrl: string | null;
  wireframeUrl: string | null;
  viewpointLabel: string | null;
  viewpointNote: string | null;
  regions: VisitorReconstructionRegion[];
} | null;

export type VisitorLocation = {
  id: string;
  name: string;
  planX: number;
  planY: number;
  primaryElementId: string | null;
  code: string;
};

export type VisitorStoryStep = {
  id: string;
  title: string;
  locationId: string | null;
  body: string;
  audioUrl: string | null;
  elementId: string | null;
  trigger: string;
  sort: number;
};

export type VisitorStory = {
  id: string;
  title: string;
  category: string | null;
  summary: string;
  durationS: number;
  steps: VisitorStoryStep[];
};

export type VisitorSnapshot = {
  preview: boolean;
  versionId: string | null;
  versionNumber: string | null;
  reviewerName: string | null;
  site: {
    id: string;
    slug: string;
    name: string;
    location: string | null;
    description: string | null;
    year: number | null;
    managedBy: string | null;
    licence: string | null;
  };
  settings: {
    showAssumptions: boolean;
    showAlternatives: boolean;
    collectFeedback: boolean;
  };
  periods: { id: string; name: string; yearFrom: number | null; yearTo: number | null }[];
  events: { id: string; title: string; year: number | null; description: string | null }[];
  locations: VisitorLocation[];
  elements: VisitorElement[];
  stories: VisitorStory[];
  reconstruction: VisitorReconstruction;
};

export function visitorLabel(level: VisitorLevel) {
  if (level === "high") return "Well supported";
  if (level === "medium") return "Likely";
  return "Uncertain";
}

export function placeName(name: string) {
  return name.replace(/^L\d+\s+/, "");
}

export function visitorQuery(query: { v?: string; preview?: string; camera?: string }) {
  const params = new URLSearchParams();
  if (query.preview) params.set("preview", query.preview);
  if (query.v) params.set("v", query.v);
  if (query.camera === "1" || query.camera === "true") params.set("camera", "1");
  const text = params.toString();
  return text ? `?${text}` : "";
}
