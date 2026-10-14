export type ReviewStatus = "open" | "changes_requested" | "approved" | "withdrawn";
export type ReviewItemStatus = "waiting" | "approved" | "changes";

export type ReviewDiff = {
  type: "added" | "removed" | "confidence_changed" | "source_added" | "story_published";
  elementId?: string;
  evidenceId?: string;
  storyId?: string;
  name: string;
  from?: string;
  to?: string;
  sourceTitle?: string;
};

export type ChecklistItem = { label: string; missing: number };

export type ReviewComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  initials: string;
  body: string;
  resolved: boolean;
  createdAt: string;
};

export function levelLabel(value: string | undefined) {
  if (value === "high") return "High" as const;
  if (value === "medium") return "Medium" as const;
  if (value === "low") return "Low" as const;
  return null;
}
