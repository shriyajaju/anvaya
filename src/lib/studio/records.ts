export type ActivityItem = {
  id: string;
  initials: string;
  body: string;
  at: string;
};

export type WorkflowRow = {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
  tone: "default" | "warn";
};

export type OverviewData = {
  name: string;
  status: string;
  siteType: string | null;
  location: string | null;
  version: string | null;
  publishedAt: string | null;
  counts: { elements: number; sources: number; stories: number; questions: number };
  confidence: { high: number; medium: number; low: number };
  uncertainty: string;
  workflow: WorkflowRow[];
  activity: ActivityItem[];
  caption: string;
};

export type SurvivalElement = {
  id: string;
  name: string;
  planX: number | null;
  planY: number | null;
  score: number;
};

export type StudioAsset = {
  id: string;
  kind: string;
  filename: string;
  caption: string | null;
  mime: string | null;
  takenOn: string | null;
  url: string | null;
};

export type MeasurementRow = {
  id: string;
  elementId: string | null;
  elementName: string;
  dimension: string;
  value: string | null;
  unit: string | null;
  method: string | null;
};

export type DocumentData = {
  siteId: string;
  slug: string;
  name: string;
  location: string | null;
  siteType: string | null;
  description: string | null;
  managedBy: string | null;
  licence: string | null;
  archiveIndex: boolean;
  condition: { state: "good" | "fair" | "poor"; notes: string; surveyedAt: string | null };
  elements: SurvivalElement[];
  assets: StudioAsset[];
  measurements: MeasurementRow[];
};

export type PeriodRow = {
  id: string;
  name: string;
  yearFrom: number | null;
  yearTo: number | null;
};

export type EventRow = {
  id: string;
  periodId: string | null;
  title: string;
  year: number | null;
  approx: boolean;
  kind: string | null;
  description: string | null;
  elementIds: string[];
};

export type TimelineData = {
  siteId: string;
  slug: string;
  reconstructionYear: number | null;
  periods: PeriodRow[];
  events: EventRow[];
  elements: { id: string; name: string }[];
};

const survivalLabel: Record<number, string> = {
  1: "Missing",
  2: "Traces only",
  3: "Partial",
  4: "Largely intact",
  5: "Intact",
};

export function survivalText(score: number) {
  return survivalLabel[score] ?? "Not recorded";
}

export function era(year: number) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

export function yearLabel(year: number | null, approx = false) {
  if (year === null) return "Date unknown";
  return approx ? `c. ${era(year)}` : era(year);
}

export type EvidencePin = {
  id: string;
  name: string;
  planX: number | null;
  planY: number | null;
  confidence: "high" | "medium" | "low";
  sources: number;
};

export type EvidenceView = "sources" | "questions" | "interpretations" | "confidence";

export function activityLine(item: ActivityItem) {
  const then = new Date(item.at).getTime();
  const hours = Math.max(0, Math.round((Date.now() - then) / 36e5));
  const when = hours < 1 ? "just now" : hours < 24 ? `${hours} h ago` : hours < 48 ? "1 day ago" : `${Math.round(hours / 24)} days ago`;
  return `${item.body} · ${when}`;
}
