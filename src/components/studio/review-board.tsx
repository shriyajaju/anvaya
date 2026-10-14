"use client";

import { Checklist, DiffRows, ItemProgress, ItemStatus, ItemThread } from "@/components/studio/review-shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipStatus } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import type { ReviewView } from "@/server/review-data";
import { resubmitReview, submitReview, withdrawReview } from "@/server/reviews";
import type { ChecklistItem, ReviewDiff } from "@/lib/studio/review";
import Link from "next/link";
import { useState } from "react";

export function ReviewBoard({
  siteId,
  slug,
  roleIsCreator,
  reviewerName,
  diff,
  checklist,
  review,
}: {
  siteId: string;
  slug: string;
  roleIsCreator: boolean;
  reviewerName: string | null;
  diff: ReviewDiff[];
  checklist: ChecklistItem[];
  review: ReviewView | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const unresolved = review?.items.reduce((sum, item) => sum + item.comments.filter((comment) => !comment.resolved).length, 0) ?? 0;
  const approved = review?.items.filter((item) => item.status === "approved").length ?? 0;
  const changes = review?.items.filter((item) => item.status === "changes").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[32px] font-normal leading-10 tracking-[-0.02em]">Review</h1>
        <p className="mt-1 text-[13px] leading-5 text-text-2">Before publishing, a reviewer checks evidence, confidence and claims.</p>
      </header>
      {roleIsCreator ? null : (
        <Notice kind="Info" message="This is the creator’s review. A reviewer responds from the review queue." className="w-full" />
      )}
      <Card>
        {review ? (
          <>
            <ChipStatus state={review.status === "changes_requested" ? "In review" : "In review"} />
            <h2 className="mt-3 text-[18px] font-medium leading-[26px]">
              {review.status === "changes_requested"
                ? `Changes requested by ${review.decidedByName ?? "the reviewer"}`
                : `Waiting for ${reviewerName ?? "a reviewer"}`}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-text-2">
              Submitted {review.submittedAt.slice(0, 10)} · {approved} of {review.items.length} items approved
            </p>
            <ItemProgress approved={approved} changes={changes} total={review.items.length} />
          </>
        ) : (
          <>
            <h2 className="text-[18px] font-medium leading-[26px]">Ready to submit</h2>
            <p className="mt-1 text-[13px] leading-5 text-text-2">These are the changes since the published version.</p>
            <div className="mt-3">
              <DiffRows rows={diff} />
            </div>
            <div className="mt-4">
              <Button
                size="Small"
                label="Submit for review"
                disabled={!roleIsCreator}
                onClick={() => {
                  void submitReview({ siteId }).then((result) => {
                    if (!result.ok) setError(result.error);
                  });
                }}
              />
            </div>
          </>
        )}
      </Card>
      {review ? (
        <section>
          <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Items in this review</h2>
          <div className="mt-3 flex flex-col gap-3">
            {review.items.map((item) => (
              <Card key={item.id} padding="Tight">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium leading-6">{item.targetType === "story" ? `‘${item.name}’ story` : item.name}</p>
                    <p className="text-[13px] text-text-2">{item.comments.length} comments</p>
                  </div>
                  <ItemStatus status={item.status} />
                </div>
                {item.comments.length || item.status === "changes" ? (
                  <ItemThread siteId={siteId} itemId={item.id} comments={item.comments} />
                ) : null}
                {item.targetType === "element" ? (
                  <Link href={`/s/${slug}/reconstruct`} className="mt-2 inline-block text-[13px] text-accent">
                    Fix in Reconstruct
                  </Link>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Checklist before resubmitting</h2>
        <Card className="mt-3">
          <Checklist items={checklist} />
        </Card>
      </section>
      {review ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="Secondary"
            size="Small"
            label="Withdraw"
            disabled={!roleIsCreator}
            onClick={() => {
              void withdrawReview({ siteId, reviewId: review.id }).then((result) => {
                if (!result.ok) setError(result.error);
              });
            }}
          />
          <Button
            size="Small"
            label="Resubmit for review"
            disabled={!roleIsCreator || review.status !== "changes_requested" || unresolved > 0}
            onClick={() => {
              void resubmitReview({ siteId, reviewId: review.id }).then((result) => {
                if (!result.ok) setError(result.error);
              });
            }}
          />
          {unresolved > 0 ? <p className="text-[13px] text-text-3">Resolve {unresolved} comment{unresolved === 1 ? "" : "s"} first</p> : null}
        </div>
      ) : null}
      {error ? <Notice kind="Error" message={error} className="w-full" /> : null}
    </div>
  );
}
