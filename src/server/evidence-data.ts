import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SourceKind = "physical" | "archaeological" | "historical" | "comparative" | "visual" | "scholarly";
export type Level = "high" | "medium" | "low";

export type EvidenceSource = {
  id: string;
  kind: SourceKind;
  title: string;
  citation: string | null;
  dateLabel: string | null;
  strength: Level;
  url: string | null;
  addedBy: string;
  createdAt: string;
  elements: { id: string; name: string }[];
};

export type EvidenceQuestion = {
  id: string;
  elementId: string | null;
  elementName: string | null;
  question: string;
  context: string | null;
  status: "open" | "resolved";
  level: Level;
  raisedBy: string;
  createdAt: string;
  sourceCount: number;
};

export type InterpretationCard = {
  id: string;
  elementId: string;
  label: string;
  summary: string | null;
  confidence: Level;
  selected: boolean;
  evidenceTitles: string[];
};

export type EvidenceElement = {
  id: string;
  name: string;
  confidence: Level;
  assumptions: string[];
  planX: number | null;
  planY: number | null;
  sourceCount: number;
  reviewed: boolean;
};

export type EvidenceComment = {
  id: string;
  targetId: string;
  parentId: string | null;
  body: string;
  authorName: string;
  initials: string;
  createdAt: string;
};

export type EvidencePageData = {
  siteId: string;
  slug: string;
  groupName: string;
  sources: EvidenceSource[];
  questions: EvidenceQuestion[];
  interpretations: InterpretationCard[];
  elements: EvidenceElement[];
  comments: EvidenceComment[];
  settings: { requireSourceForHigh: boolean; warnNoEvidence: boolean; showAssumptions: boolean };
  privateNotes: string;
};

export async function evidenceForSite(siteId: string, slug: string): Promise<EvidencePageData> {
  const supabase = await createClient();
  const [site, elements, evidence, links, questions, interpretations, comments, profiles, reviews] = await Promise.all([
    supabase.from("sites").select("settings").eq("id", siteId).single(),
    supabase.from("elements").select("id, name, kind, confidence, assumptions, plan_x, plan_y, sort, parent_id").eq("site_id", siteId).order("sort"),
    supabase.from("evidence").select("id, kind, title, citation, date_label, strength, url, added_by, created_at").eq("site_id", siteId).order("created_at", { ascending: false }),
    supabase.from("element_evidence").select("element_id, evidence_id"),
    supabase.from("questions").select("id, element_id, question, context, status, level, raised_by, created_at").eq("site_id", siteId).order("created_at"),
    supabase.from("interpretations").select("id, element_id, label, summary, confidence, selected, evidence_ids").eq("site_id", siteId),
    supabase.from("comments").select("id, target_id, parent_id, body, author, created_at").eq("site_id", siteId).eq("target_type", "element").order("created_at"),
    supabase.from("profiles").select("id, name, initials"),
    supabase.from("reviews").select("id").eq("site_id", siteId).eq("status", "approved"),
  ]);
  for (const result of [site, elements, evidence, links, questions, interpretations, comments, profiles, reviews]) {
    if (result.error) throw new Error(result.error.message);
  }

  const reviewIds = (reviews.data ?? []).map((row) => row.id);
  const reviewed = new Set<string>();
  if (reviewIds.length) {
    const items = await supabase
      .from("review_items")
      .select("target_id")
      .in("review_id", reviewIds)
      .eq("target_type", "element")
      .eq("status", "approved");
    if (items.error) throw new Error(items.error.message);
    for (const item of items.data ?? []) reviewed.add(item.target_id);
  }

  const people = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const elementRows = elements.data ?? [];
  const names = new Map(elementRows.map((row) => [row.id, row.name]));
  const linkRows = links.data ?? [];
  const sourcesFor = (elementId: string) => linkRows.filter((row) => row.element_id === elementId).length;
  const group = elementRows.find((row) => row.kind === "group");
  const settings = (site.data?.settings ?? {}) as {
    requireSourceForHigh?: boolean;
    warnNoEvidence?: boolean;
    showAssumptions?: boolean;
    privateNotes?: string;
  };

  return {
    siteId,
    slug,
    groupName: group?.name ?? "Plan",
    sources: (evidence.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind as SourceKind,
      title: row.title,
      citation: row.citation,
      dateLabel: row.date_label,
      strength: row.strength as Level,
      url: row.url,
      addedBy: people.get(row.added_by ?? "")?.name ?? "Someone",
      createdAt: row.created_at,
      elements: linkRows
        .filter((link) => link.evidence_id === row.id)
        .map((link) => ({ id: link.element_id, name: names.get(link.element_id) ?? "Element" })),
    })),
    questions: (questions.data ?? []).map((row) => ({
      id: row.id,
      elementId: row.element_id,
      elementName: row.element_id ? names.get(row.element_id) ?? null : null,
      question: row.question,
      context: row.context,
      status: row.status as "open" | "resolved",
      level: row.level as Level,
      raisedBy: people.get(row.raised_by ?? "")?.name ?? "Someone",
      createdAt: row.created_at,
      sourceCount: row.element_id ? sourcesFor(row.element_id) : 0,
    })),
    interpretations: (interpretations.data ?? []).map((row) => ({
      id: row.id,
      elementId: row.element_id,
      label: row.label,
      summary: row.summary,
      confidence: row.confidence as Level,
      selected: row.selected,
      evidenceTitles: (row.evidence_ids ?? [])
        .map((id: string) => (evidence.data ?? []).find((item) => item.id === id)?.title)
        .filter((title: string | undefined): title is string => Boolean(title)),
    })),
    elements: elementRows
      .filter((row) => row.kind !== "group")
      .map((row) => ({
        id: row.id,
        name: row.name,
        confidence: row.confidence as Level,
        assumptions: row.assumptions ?? [],
        planX: row.plan_x,
        planY: row.plan_y,
        sourceCount: sourcesFor(row.id),
        reviewed: reviewed.has(row.id),
      })),
    comments: (comments.data ?? []).map((row) => {
      const person = people.get(row.author);
      return {
        id: row.id,
        targetId: row.target_id,
        parentId: row.parent_id,
        body: row.body,
        authorName: person?.name ?? "Someone",
        initials: person?.initials ?? "—",
        createdAt: row.created_at,
      };
    }),
    settings: {
      requireSourceForHigh: settings.requireSourceForHigh !== false,
      warnNoEvidence: settings.warnNoEvidence !== false,
      showAssumptions: settings.showAssumptions !== false,
    },
    privateNotes: settings.privateNotes ?? "",
  };
}
