"use client";

import { logEvent } from "@/server/visitor-actions";
import { useEffect } from "react";

export function VisitBeacon({
  siteId,
  versionId,
  type,
  elementId = null,
  locationId = null,
}: {
  siteId: string;
  versionId: string | null;
  type: string;
  elementId?: string | null;
  locationId?: string | null;
}) {
  useEffect(() => {
    const node = document.getElementById("visit-beacon");
    if (node?.closest("[data-phone-frame]")) return;
    const key = "anvaya-session";
    let sessionId = window.localStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.localStorage.setItem(key, sessionId);
    }
    void logEvent({ siteId, versionId, type, elementId, locationId, sessionId });
  }, [elementId, locationId, siteId, type, versionId]);
  return <span id="visit-beacon" hidden />;
}
