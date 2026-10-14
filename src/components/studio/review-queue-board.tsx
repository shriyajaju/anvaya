"use client";

import { Checklist, DiffRows, ItemStatus } from "@/components/studio/review-shared";
import { PreviewPanel } from "@/components/studio/preview-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipConfidence, ChipStatus } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { levelLabel } from "@/lib/studio/review";
import type { ReviewView } from "@/server/review-data";
import { approveReview, requestChanges } from "@/server/reviews";
import Link from "next/link";
import { useState } from "react";

export function ReviewQueueBoard({
  reviews,
  userId,
  tokens,
}: {
  reviews: ReviewView[];
  userId: string;
  tokens: Record<string, string>;
}) {
  const waiting = reviews.filter((review) => review.status === "open" && review.submittedBy !== userId);
  const approved = reviews.filter((review) => review.status === "approved");
  const [tab, setTab] = useState<"waiting" | "approved">(waiting.length ? "waiting" : "approved");
  const list = tab === "waiting" ? waiting : approved;
  const active = list[0];
  const [itemId, setItemId] = useState(active?.items[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="px-6 pb-10 min-[1100px]:grid min-[1100px]:grid-cols-2 min-[1100px]:items-start min-[1100px]:gap-8">
      <div className="min-w-0 max-w-[640px]">
        <h1 className="text-[32px] font-normal leading-10 tracking-[-0.02em]">Review queue</h1>
        <p className="mt-1 text-[13px] leading-5 text-text-2">Reconstructions and stories waiting for your approval.</p>
        <div className="mt-4 flex gap-2">
          <Pill label="Waiting for me" count countValue={String(waiting.length)} state={tab === "waiting" ? "Selected" : "Default"} onClick={() => setTab("waiting")} />
          <Pill label="Approved" count countValue={String(approved.length)} state={tab === "approved" ? "Selected" : "Default"} onClick={() => setTab("approved")} />
        </div>
        {list.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing is waiting" body="When a creator submits a site, it will show up here for someone else to review." action={<span />} />
          </div>
        ) : active ? (
          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-medium leading-[26px]">
                  {active.siteName} — {active.items.length} items
                </h2>
                <p className="text-[13px] text-text-2">
                  Submitted by {active.submittedByName} · {active.submittedAt.slice(0, 10)}
                </p>
              </div>
              <ChipStatus state={active.status === "approved" ? "Approved" : "In review"} />
            </div>
            <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">What changed</h3>
            <DiffRows rows={active.diff} />
            <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Checklist</h3>
            <Checklist items={active.checklist} />
            <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Items</h3>
            <ul>
              {active.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-[14px] last:border-0">
                  <span>{item.name}</span>
                  <span className="inline-flex items-center gap-2">
                    <ItemStatus status={item.status} />
                    {levelLabel(item.confidence ?? undefined) ? <ChipConfidence level={levelLabel(item.confidence ?? undefined)!} /> : null}
                  </span>
                </li>
              ))}
            </ul>
            {tab === "waiting" ? (
              <>
                <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Comment for the creator</h3>
                <Field
                  kind="Select"
                  label="Item"
                  surface="Flat"
                  value={itemId}
                  options={active.items.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(event) => setItemId(event.target.value)}
                />
                <label className="mt-3 block text-[13px] text-text-2">
                  Comment
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Be specific: which claim, which source is missing."
                    className="mt-1 min-h-[88px] w-full rounded-card bg-surface-2 px-3 py-2 text-[15px] leading-6 text-text-1 outline-none"
                  />
                </label>
                {active.canApprove ? null : (
                  <Notice kind="Info" message="Creators cannot approve their own submissions." className="mt-3 w-full" />
                )}
                {error ? <Notice kind="Error" message={error} className="mt-3 w-full" /> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="Secondary"
                    size="Small"
                    label="Request changes"
                    disabled={!active.canApprove || !body.trim() || !itemId}
                    onClick={() => {
                      void requestChanges({ reviewId: active.id, itemId, body }).then((result) => {
                        if (!result.ok) setError(result.error === "CREATOR_CANNOT_APPROVE" ? "Creators cannot approve their own submissions." : result.error);
                        else setBody("");
                      });
                    }}
                  />
                  <Link href={`/s/${active.slug}/review`} className="inline-flex h-9 items-center rounded-button border border-border px-3.5 text-[13px] font-medium">
                    Open in workspace
                  </Link>
                  <Button
                    size="Small"
                    label="Approve"
                    disabled={!active.canApprove}
                    onClick={() => {
                      void approveReview({ reviewId: active.id }).then((result) => {
                        if (!result.ok) setError(result.error === "CREATOR_CANNOT_APPROVE" ? "Creators cannot approve their own submissions." : result.error);
                      });
                    }}
                  />
                </div>
              </>
            ) : null}
          </Card>
        ) : null}
      </div>
      {active ? (
        <div className="hidden min-[1100px]:block">
          <div className="sticky top-0 h-[calc(100vh-72px)] pb-6">
            <PreviewPanel
              slug={active.slug}
              name={active.siteName}
              location={active.location}
              revision={active.submittedAt}
              previewToken={tokens[active.slug] ?? ""}
              openLabel="in workspace"
              caption="Working-copy preview"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
