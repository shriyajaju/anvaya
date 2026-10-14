"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChipConfidence } from "@/components/ui/chip";
import { levelLabel, type ChecklistItem, type ReviewComment, type ReviewDiff, type ReviewItemStatus } from "@/lib/studio/review";
import { createClient } from "@/lib/supabase/browser";
import { replyToItem, resolveComment } from "@/server/reviews";
import { Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DiffRows({ rows }: { rows: ReviewDiff[] }) {
  if (rows.length === 0) return <p className="text-[13px] leading-5 text-text-2">Nothing has changed since the published version.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <li key={`${row.type}-${row.elementId ?? row.storyId ?? index}`} className="flex flex-wrap items-center gap-2 text-[13px] leading-5">
          <span className={`size-1.5 rounded-full ${row.type === "confidence_changed" ? "bg-conf-medium" : "bg-conf-high"}`} />
          <span>
            {row.type === "confidence_changed" ? `Confidence changed · ${row.name}` : null}
            {row.type === "source_added" ? `Source added · ${row.sourceTitle ?? "Source"} → ${row.name}` : null}
            {row.type === "added" ? `Element added · ${row.name}` : null}
            {row.type === "removed" ? `Element removed · ${row.name}` : null}
            {row.type === "story_published" ? `Story to review · ${row.name}` : null}
          </span>
          {levelLabel(row.from) && levelLabel(row.to) ? (
            <>
              <ChipConfidence level={levelLabel(row.from)!} />
              <span className="text-text-3">→</span>
              <ChipConfidence level={levelLabel(row.to)!} />
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-[14px] leading-5 last:border-0">
          <span className="inline-flex items-center gap-2">
            <Check aria-hidden className="size-4 text-conf-high" />
            {item.label}
          </span>
          {item.missing > 0 ? (
            <span className="inline-flex items-center gap-1 text-[13px] text-conf-medium">
              <Clock aria-hidden className="size-3.5" />
              {item.missing} missing
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ItemStatus({ status }: { status: ReviewItemStatus }) {
  const label = status === "changes" ? "Changes requested" : status === "approved" ? "Approved" : "Waiting";
  const tone =
    status === "changes"
      ? "bg-conf-medium-bg text-conf-medium"
      : status === "approved"
        ? "bg-conf-high-bg text-conf-high"
        : "bg-review-bg text-review";
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] ${tone}`}>
      {status === "approved" ? <Check aria-hidden className="size-3" /> : <Clock aria-hidden className="size-3" />}
      {label}
    </span>
  );
}

export function ItemThread({
  siteId,
  itemId,
  comments,
}: {
  siteId: string;
  itemId: string;
  comments: ReviewComment[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${siteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `site_id=eq.${siteId}` }, () => router.refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, siteId]);
  return (
    <div className="mt-3 rounded-card bg-surface-2 p-3">
      {comments.map((comment) => (
        <div key={comment.id} className="mb-3">
          <p className="text-[13px] text-text-2">
            <Avatar initials={comment.initials.slice(0, 2)} size="24" /> {comment.authorName}
            {comment.resolved ? " · Resolved" : ""}
          </p>
          <p className="mt-1 text-[15px] leading-6">{comment.body}</p>
          {comment.resolved ? null : (
            <button type="button" className="mt-1 text-[13px] text-accent" onClick={() => void resolveComment({ siteId, commentId: comment.id })}>
              Resolve
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Reply..."
          aria-label="Reply"
          className="h-10 flex-1 rounded-card bg-surface px-3 text-[14px] outline-none"
        />
        <Button
          type="Secondary"
          size="Small"
          label="Reply"
          disabled={!body.trim()}
          onClick={() => {
            void replyToItem({ siteId, itemId, body }).then((saved) => {
              if (saved.ok) setBody("");
            });
          }}
        />
      </div>
    </div>
  );
}

export function ItemProgress({ approved, changes, total }: { approved: number; changes: number; total: number }) {
  const waiting = Math.max(0, total - approved - changes);
  const sum = Math.max(total, 1);
  return (
    <div className="mt-3 flex h-1.5 overflow-hidden rounded-bar bg-surface-2" role="progressbar" aria-valuenow={approved} aria-valuemax={total}>
      <span className="bg-conf-high" style={{ width: `${(approved / sum) * 100}%` }} />
      <span className="bg-conf-medium" style={{ width: `${(changes / sum) * 100}%` }} />
      <span className="bg-border" style={{ width: `${(waiting / sum) * 100}%` }} />
    </div>
  );
}
