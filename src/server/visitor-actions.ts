"use server";

import { logEvent as writeEvent, saveFeedback as writeFeedback } from "@/server/visitor";

export async function logEvent(input: {
  siteId: string;
  versionId: string | null;
  type: string;
  elementId?: string | null;
  locationId?: string | null;
  sessionId: string;
}) {
  return writeEvent(input);
}

export async function saveFeedback(input: {
  siteId: string;
  versionId: string | null;
  understand: number;
  trust: number;
  comment?: string;
  page: string;
  sessionId: string;
}) {
  return writeFeedback(input);
}
