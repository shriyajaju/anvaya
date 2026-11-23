"use client";

import { Notice } from "@/components/ui/notice";
import { focusRing } from "@/components/ui/motion";
import type { ReviewView } from "@/server/review-data";
import { approveReview, requestChanges } from "@/server/reviews";
import type { ReviewDiff } from "@/lib/studio/review";
import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const COVERS: Record<string, string> = {
  "ajanta-cave-1": "/seed-reconstructions/ajanta-cave-1/source-photo.jpg",
  kanheri: "/site-covers/kanheri.png",
  vasai: "/site-covers/vasai.png",
  elephanta: "/site-covers/elephanta.png",
  kondana: "/site-covers/kondana.png",
  mahakali: "/site-covers/mahakali.png",
  sopara: "/site-covers/sopara.png",
};

type Tab = "waiting" | "changes" | "approved" | "all";

export function ReviewQueueBoard({
  reviews,
  userId,
  tokens,
}: {
  reviews: ReviewView[];
  userId: string;
  tokens: Record<string, string>;
}) {
  const router = useRouter();
  const waiting = reviews.filter((review) => review.status === "open" && review.submittedBy !== userId);
  const changes = reviews.filter((review) => review.status === "changes_requested");
  const approved = reviews.filter((review) => review.status === "approved");
  const [tab, setTab] = useState<Tab>(waiting.length ? "waiting" : changes.length ? "changes" : approved.length ? "approved" : "all");
  const [oldestFirst, setOldestFirst] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [itemId, setItemId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "changes" | null>(null);

  const visible = useMemo(() => {
    const source = tab === "waiting" ? waiting : tab === "changes" ? changes : tab === "approved" ? approved : reviews;
    return [...source].sort((a, b) => {
      const delta = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return oldestFirst ? delta : -delta;
    });
  }, [approved, changes, oldestFirst, reviews, tab, waiting]);

  const selected = visible.find((review) => review.id === openId) ?? visible[0] ?? null;
  const workspace = selected ? `/s/${selected.slug}/review` : "/sites";

  function choose(review: ReviewView) {
    setOpenId(review.id);
    setItemId(review.items.find((item) => item.status !== "approved")?.id ?? review.items[0]?.id ?? "");
    setError(null);
    setBody("");
  }

  return (
    <div className="grid min-h-full items-start gap-6 px-6 py-8 min-[1100px]:grid-cols-[minmax(0,608px)_minmax(280px,1fr)] min-[1100px]:px-2">
      <div className="min-w-0">
        <h1 className="text-[40px] font-light leading-[1.12] tracking-[-0.8px] text-text-1">Review queue</h1>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-text-2">Reconstructions and stories waiting for your approval.</p>
        <div className="mt-3.5 flex h-[42px] items-center justify-between gap-3 border-b border-border">
          <div className="flex h-full items-center gap-[18px] text-[12px]">
            <FilterTab label="Waiting for me" count={waiting.length} selected={tab === "waiting"} onClick={() => setTab("waiting")} />
            <FilterTab label={`Changes requested ${changes.length}`} selected={tab === "changes"} onClick={() => setTab("changes")} />
            <FilterTab label={`Approved ${approved.length}`} selected={tab === "approved"} onClick={() => setTab("approved")} />
            <FilterTab label="All" selected={tab === "all"} onClick={() => setTab("all")} />
          </div>
          <button
            type="button"
            onClick={() => setOldestFirst((value) => !value)}
            className="inline-flex h-[30px] items-center gap-1 rounded-pill border border-border bg-surface px-[11px] text-[11px] font-medium text-text-2"
          >
            {oldestFirst ? "Oldest first" : "Newest first"}
            <ChevronDown aria-hidden className="size-[11px]" />
          </button>
        </div>

        <p className="pb-2.5 pt-[18px] text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">
          {tab === "waiting" ? "Waiting for me" : tab === "changes" ? "Changes requested" : tab === "approved" ? "Approved" : "All"}
        </p>

        {visible.length === 0 ? (
          <p className="rounded-card border border-border bg-surface px-4 py-6 text-[13px] leading-5 text-text-2">
            {tab === "waiting"
              ? "Nothing is waiting for your approval. Open reviews you submitted stay with the reviewer."
              : "Nothing in this list."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((review) => (
              <QueueCard
                key={review.id}
                review={review}
                open={selected?.id === review.id}
                onOpen={() => choose(review)}
                userId={userId}
                body={body}
                setBody={setBody}
                itemId={selected?.id === review.id ? itemId : ""}
                setItemId={setItemId}
                error={selected?.id === review.id ? error : null}
                pending={selected?.id === review.id ? pending : null}
                workspace={`/s/${review.slug}/review`}
                onRequest={(target) => {
                  if (!target) {
                    setError("This review has no items to comment on.");
                    return;
                  }
                  setPending("changes");
                  setError(null);
                  void requestChanges({ reviewId: review.id, itemId: target, body }).then((result) => {
                    setPending(null);
                    if (!result.ok) setError(messageFor(result.error));
                    else {
                      setBody("");
                      router.refresh();
                    }
                  });
                }}
                onApprove={() => {
                  setPending("approve");
                  setError(null);
                  void approveReview({ reviewId: review.id }).then((result) => {
                    setPending(null);
                    if (!result.ok) setError(messageFor(result.error));
                    else router.refresh();
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Preview review={selected} workspace={workspace} ready={Boolean(selected && tokens[selected.slug])} />
    </div>
  );
}

function QueueCard({
  review,
  open,
  onOpen,
  userId,
  body,
  setBody,
  itemId,
  setItemId,
  error,
  pending,
  workspace,
  onRequest,
  onApprove,
}: {
  review: ReviewView;
  open: boolean;
  onOpen: () => void;
  userId: string;
  body: string;
  setBody: (value: string) => void;
  itemId: string;
  setItemId: (value: string) => void;
  error: string | null;
  pending: "approve" | "changes" | null;
  workspace: string;
  onRequest: (itemId: string) => void;
  onApprove: () => void;
}) {
  const own = review.submittedBy === userId;
  const actionable = !own && review.canApprove && (review.status === "open" || review.status === "changes_requested");
  const confidence = confidenceLabel(review);
  const activeItem = review.items.some((item) => item.id === itemId)
    ? itemId
    : (review.items.find((item) => item.status === "changes")?.id ??
      review.items.find((item) => item.status === "waiting")?.id ??
      review.items[0]?.id ??
      "");
  return (
    <article className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-[78px] w-full items-center gap-3 px-3 text-left ${open ? "border-b border-l-[3px] border-b-border border-l-[#4e78c4] bg-surface-2" : ""}`}
      >
        <img src={coverFor(review)} alt="" className="size-14 shrink-0 rounded-[8px] object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-[1.25] text-text-1">{titleFor(review)}</span>
          <span className="block text-[11px] text-text-2">
            Submitted by {review.submittedByName} · {formatWhen(review.submittedAt)}
          </span>
        </span>
        <span className="flex flex-col items-end gap-[5px]">
          <StatusPill status={review.status} />
          {confidence ? <ConfidencePill label={confidence} /> : null}
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3 p-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">What changed</p>
            <ul className="mt-[7px] flex flex-col gap-[5px]">
              {changeLines(review).map((line) => (
                <li key={line} className="flex items-center gap-[9px] text-[12px] leading-[1.35] text-text-1">
                  <span className="size-[5px] shrink-0 rounded-full bg-text-1" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-px bg-border" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Checklist</p>
            <ul className="mt-2 flex flex-col gap-[7px]">
              {review.checklist.map((check) => (
                <li key={check.label} className="flex items-start gap-2.5">
                  <span className={`mt-px flex size-4 items-center justify-center rounded-[4px] border ${check.missing === 0 ? "border-[#111] bg-[#111] text-white" : "border-border bg-surface"}`}>
                    {check.missing === 0 ? <Check className="size-2.5" /> : null}
                  </span>
                  <span>
                    <span className="block text-[12px] text-text-1">{check.label}</span>
                    {check.missing > 0 ? <span className="block text-[11px] text-[#c47a2c]">{check.missing} missing</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {review.items.some((item) => item.comments.length) ? (
            <ul className="flex flex-col gap-2">
              {review.items.flatMap((item) =>
                item.comments.map((comment) => (
                  <li key={comment.id} className="rounded-[10px] bg-surface-2 px-3 py-2 text-[12px] leading-[1.4] text-text-1">
                    <span className="font-medium">{comment.authorName}</span>
                    <span className="text-text-2"> · {item.name}</span>
                    <span className="mt-1 block">{comment.body}</span>
                  </li>
                )),
              )}
            </ul>
          ) : null}
          {actionable ? (
            <>
              {review.items.length > 1 ? (
                <label className="flex flex-col gap-1 text-[11px] text-text-2">
                  Comment on
                  <select
                    value={activeItem}
                    onChange={(event) => setItemId(event.target.value)}
                    className="h-9 rounded-[10px] border border-border bg-surface px-2 text-[13px] text-text-1"
                  >
                    {review.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Add a comment for the creator..."
                className="min-h-[72px] w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-text-1 outline-none placeholder:text-text-3"
              />
            </>
          ) : null}
          {error ? <Notice kind="Error" message={error} /> : null}
          {own && (review.status === "open" || review.status === "changes_requested") ? (
            <Notice kind="Info" message="Creators cannot approve their own submissions. A reviewer responds from this queue." />
          ) : null}
          {review.status === "approved" && review.decidedByName ? (
            <p className="text-[12px] text-text-2">Approved by {review.decidedByName}.</p>
          ) : null}
          <div className="flex items-center gap-2">
            {actionable ? (
              <button
                type="button"
                disabled={!body.trim() || !activeItem || pending !== null}
                className={`${focusRing} inline-flex h-9 items-center rounded-button border border-border bg-surface px-3.5 text-[10px] font-semibold tracking-[0.9px] text-text-1 disabled:opacity-40`}
                onClick={() => onRequest(activeItem)}
              >
                {pending === "changes" ? "SENDING" : "REQUEST CHANGES"}
              </button>
            ) : null}
            <Link href={workspace} className={`${focusRing} inline-flex h-9 items-center rounded-button border border-border bg-surface px-3.5 text-[10px] font-semibold tracking-[0.9px] text-text-1`}>
              OPEN IN WORKSPACE
            </Link>
            {actionable ? (
              <>
                <span className="flex-1" />
                <button
                  type="button"
                  disabled={pending !== null}
                  className={`${focusRing} inline-flex h-9 items-center rounded-button bg-[#111] px-[18px] text-[10px] font-semibold tracking-[0.9px] text-white disabled:opacity-40`}
                  onClick={onApprove}
                >
                  {pending === "approve" ? "APPROVING" : "APPROVE"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Preview({ review, workspace, ready }: { review: ReviewView | null; workspace: string; ready: boolean }) {
  const confidence = review ? confidenceLabel(review) : null;
  const item = review?.items[0];
  return (
    <aside className="relative hidden min-h-[640px] overflow-hidden rounded-[20px] min-[1100px]:block">
      <img src="/review/preview.png" alt="" className="absolute inset-[-24px] size-[calc(100%+48px)] object-cover blur-[6px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(56,42,34,0.36)] via-[rgba(155,115,85,0.26)] to-[rgba(36,29,25,0.5)]" />
      <div className="relative flex items-center justify-between px-6 pt-6">
        <span className="inline-flex h-9 items-center rounded-pill bg-white/90 px-3.5 text-[11px] font-medium text-[#111]">
          {review ? `anvaya.site/${review.slug}` : "anvaya.site"}
        </span>
        <Link href={workspace} className={`${focusRing} inline-flex h-10 items-center rounded-button bg-[#111] px-[18px] text-[10px] font-semibold tracking-[0.9px] text-white`}>
          OPEN IN WORKSPACE
        </Link>
      </div>
      <div className="relative mx-auto mt-10 flex h-[506px] w-[234px] flex-col overflow-hidden rounded-[24px] border border-white/40 bg-[#171715] shadow-[0_18px_48px_-8px_rgba(17,17,17,0.09)]">
        <div className="flex h-6 items-center justify-between px-3.5 text-[7px] font-semibold text-[#f3f0e9]">
          <span>9:41</span>
          <span>LTE</span>
        </div>
        <div className="flex h-9 items-center justify-between px-3.5">
          <span className="text-[7px] font-semibold tracking-[0.7px] text-[#f3f0e9]">ANVAYA</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[8px] text-[#f3f0e9]">≡</span>
        </div>
        <div className="relative h-[300px]">
          <img src="/review/camera.png" alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
          <span className="absolute left-3 top-3 inline-flex h-[22px] items-center gap-1 rounded-pill bg-[#171715]/80 px-2 text-[7px] font-semibold tracking-[0.56px] text-[#f3f0e9]">
            <span className="size-[5px] rounded-full bg-[#f0c77a]" />
            AR PREVIEW
          </span>
          <span className="absolute left-1/2 top-[190px] -translate-x-1/2 rounded-pill bg-[#171715]/80 px-2 py-1 text-[7px] font-semibold tracking-[0.49px] text-[#f0c77a]">
            INTERPRETIVE OVERLAY
          </span>
          <p className="absolute bottom-3 left-3 text-[7px] text-white/70">Move to compare with the cave</p>
        </div>
        <div className="flex flex-col gap-1.5 px-3.5 pb-2 pt-2.5">
          <p className="text-[7px] font-semibold uppercase tracking-[0.56px] text-[#a6a39d]">
            {review ? `${review.siteName}${review.location ? ` · ${review.location}` : ""}` : "Select a review"}
          </p>
          <p className="font-visitor text-[18px] leading-[1.08] text-[#f3f0e9]">{item?.name ?? review?.siteName ?? "Review"}</p>
          <span className="mt-1 inline-flex h-[22px] w-fit items-center rounded-pill bg-[rgba(165,110,28,0.2)] px-2 text-[8px] font-medium text-[#f0c77a]">
            {confidence ?? (review ? statusText(review.status) : "In review")}
          </span>
          <p className="text-[7.5px] leading-[1.35] text-[#a6a39d]">
            Interpretive reconstruction based on linked evidence; form is presented as a review hypothesis.
          </p>
        </div>
        <div className="mt-auto flex h-4 items-center justify-center">
          <span className="h-[3px] w-[54px] rounded-pill bg-white/40" />
        </div>
      </div>
      <span className="sr-only">{ready ? "preview ready" : ""}</span>
    </aside>
  );
}

function FilterTab({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-full items-center gap-1.5 border-b-2 text-[12px] ${selected ? "border-text-1 font-medium text-text-1" : "border-transparent font-normal text-text-2"}`}
    >
      {label}
      {count != null ? (
        <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-on-primary">{count}</span>
      ) : null}
    </button>
  );
}

function StatusPill({ status }: { status: ReviewView["status"] }) {
  const tone =
    status === "approved"
      ? "bg-[#eaf2eb] text-[#47704e]"
      : status === "changes_requested"
        ? "bg-[#f8eedc] text-[#a56e1c]"
        : "bg-[#edf3fc] text-[#4e78c4]";
  return <span className={`inline-flex h-6 items-center rounded-pill px-[9px] text-[11px] font-medium ${tone}`}>{statusText(status)}</span>;
}

function ConfidencePill({ label }: { label: string }) {
  const high = label.startsWith("High");
  return (
    <span className={`inline-flex h-6 items-center rounded-pill px-[9px] text-[11px] font-medium ${high ? "bg-[#eaf2eb] text-[#47704e]" : "bg-[#f8eedc] text-[#a56e1c]"}`}>
      {label}
    </span>
  );
}

function statusText(status: ReviewView["status"]) {
  if (status === "approved") return "Approved";
  if (status === "changes_requested") return "Changes requested";
  if (status === "withdrawn") return "Withdrawn";
  return "In Review";
}

function titleFor(review: ReviewView) {
  const names = review.items.map((item) => (item.targetType === "story" ? `‘${item.name}’` : item.name));
  if (names.length === 0) return review.siteName;
  return `${review.siteName} — ${names.join(", ")}`;
}

function coverFor(review: ReviewView) {
  if (review.items.length > 0 && review.items.every((item) => item.targetType === "story")) return "/review/story.png";
  return COVERS[review.slug] ?? "/seed-reconstructions/ajanta-cave-1/source-photo.jpg";
}

function confidenceLabel(review: ReviewView) {
  const level = review.items.find((item) => item.confidence)?.confidence;
  if (level === "high") return "High confidence";
  if (level === "medium") return "Medium confidence";
  if (level === "low") return "Low confidence";
  return null;
}

function changeLines(review: ReviewView) {
  if (review.diff.length === 0) {
    if (review.items.length === 0) return ["No item changes recorded"];
    return review.items.map((item) => `${item.targetType === "story" ? "Story" : "Element"} · ${item.name}`);
  }
  return review.diff.map(diffLine);
}

function diffLine(row: ReviewDiff) {
  if (row.type === "confidence_changed") return `Confidence · ${row.name}${row.to ? ` set to ${row.to}` : ""}`;
  if (row.type === "source_added") return `Source linked · ${row.sourceTitle ?? "Source"} → ${row.name}`;
  if (row.type === "story_published") return `Story · ${row.name}`;
  if (row.type === "removed") return `Removed · ${row.name}`;
  return `Added · ${row.name}`;
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

function messageFor(error: string) {
  if (error === "CREATOR_CANNOT_APPROVE") return "A creator cannot approve their own review.";
  return error;
}
