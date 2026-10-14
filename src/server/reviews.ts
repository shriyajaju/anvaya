"use server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ReviewDiff } from "@/lib/studio/review";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function member(siteId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, session: null, error: "Sign in again." as const };
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("slug, name, status, current_version_id").eq("id", siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!data) return { supabase: null, session: null, error: "Site not found." as const };
  return { supabase, session, site: data, error: null };
}

function refresh(slug: string) {
  revalidatePath(`/s/${slug}/review`);
  revalidatePath("/review-queue");
  revalidatePath(`/s/${slug}/overview`);
  return { ok: true as const };
}

async function notify(event: string, userIds: string[], siteName: string, slug: string) {
  const admin = createAdminClient();
  const to: string[] = [];
  for (const id of userIds) {
    const user = await admin.auth.admin.getUserById(id);
    const email = user.data.user?.email;
    if (email) to.push(email);
  }
  const payload = { event, to, siteName, slug };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || to.length === 0) {
    console.info("[review-email]", event, to.join(", "), slug);
    return;
  }
  try {
    const response = await fetch(`${url}/functions/v1/notify-review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) console.info("[review-email]", event, to.join(", "), slug);
  } catch {
    console.info("[review-email]", event, to.join(", "), slug);
  }
}

export async function submitReview(input: { siteId: string }) {
  const parsed = z.object({ siteId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "This review could not be submitted." };
  const gate = await member(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (gate.session.role === "reviewer" || gate.session.role === "viewer") {
    return { ok: false as const, error: "Only a creator can submit a review." };
  }
  const existing = await gate.supabase
    .from("reviews")
    .select("id")
    .eq("site_id", parsed.data.siteId)
    .in("status", ["open", "changes_requested"])
    .maybeSingle();
  if (existing.data) return { ok: false as const, error: "A review is already open." };
  const diff = await gate.supabase.rpc("diff_working", { p_site_id: parsed.data.siteId });
  if (diff.error) return { ok: false as const, error: diff.error.message };
  const rows = (diff.data ?? []) as ReviewDiff[] & Array<Record<string, string>>;
  const elementIds = new Set<string>();
  const storyIds = new Set<string>();
  for (const row of rows as Array<Record<string, string>>) {
    if (row.element_id) elementIds.add(row.element_id);
    if (row.story_id) storyIds.add(row.story_id);
  }
  const created = await gate.supabase
    .from("reviews")
    .insert({ site_id: parsed.data.siteId, status: "open", submitted_by: gate.session.userId })
    .select("id")
    .single();
  if (created.error || !created.data) return { ok: false as const, error: created.error?.message ?? "The review was not created." };
  const items = [
    ...[...elementIds].map((id) => ({ review_id: created.data.id, target_type: "element", target_id: id, status: "waiting" })),
    ...[...storyIds].map((id) => ({ review_id: created.data.id, target_type: "story", target_id: id, status: "waiting" })),
  ];
  if (items.length) {
    const inserted = await gate.supabase.from("review_items").insert(items);
    if (inserted.error) return { ok: false as const, error: inserted.error.message };
  }
  if (storyIds.size) {
    await gate.supabase.from("stories").update({ status: "in_review" }).in("id", [...storyIds]).eq("status", "draft");
  }
  const siteUpdate = await gate.supabase.from("sites").update({ status: "in_review" }).eq("id", parsed.data.siteId);
  if (siteUpdate.error) return { ok: false as const, error: siteUpdate.error.message };
  const reviewers = await gate.supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", gate.session.org!.orgId)
    .in("role", ["reviewer", "admin", "owner"]);
  const recipients = (reviewers.data ?? []).map((row) => row.user_id as string).filter((id) => id !== gate.session!.userId);
  await notify("submit", recipients, gate.site.name as string, gate.site.slug as string);
  return refresh(gate.site.slug as string);
}

export async function withdrawReview(input: { siteId: string; reviewId: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), reviewId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "This review could not be withdrawn." };
  const gate = await member(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("reviews").update({ status: "withdrawn" }).eq("id", parsed.data.reviewId).eq("site_id", parsed.data.siteId);
  if (error) return { ok: false as const, error: error.message };
  const next = gate.site.current_version_id ? "published" : "draft";
  await gate.supabase.from("sites").update({ status: next }).eq("id", parsed.data.siteId);
  return refresh(gate.site.slug as string);
}

export async function resubmitReview(input: { siteId: string; reviewId: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), reviewId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "This review could not be resubmitted." };
  const gate = await member(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const items = await gate.supabase.from("review_items").select("id").eq("review_id", parsed.data.reviewId);
  const ids = (items.data ?? []).map((item) => item.id as string);
  if (ids.length) {
    const comments = await gate.supabase.from("comments").select("resolved").eq("target_type", "review_item").in("target_id", ids);
    if ((comments.data ?? []).some((comment) => !comment.resolved)) {
      return { ok: false as const, error: "Resolve every comment before resubmitting." };
    }
  }
  const { error } = await gate.supabase
    .from("reviews")
    .update({ status: "open", decided_by: null, decided_at: null })
    .eq("id", parsed.data.reviewId)
    .eq("submitted_by", gate.session.userId);
  if (error) return { ok: false as const, error: error.message };
  await gate.supabase.from("review_items").update({ status: "waiting" }).eq("review_id", parsed.data.reviewId).eq("status", "changes");
  return refresh(gate.site.slug as string);
}

export async function replyToItem(input: { siteId: string; itemId: string; body: string; parentId?: string | null }) {
  const parsed = z
    .object({
      siteId: z.string().uuid(),
      itemId: z.string().uuid(),
      body: z.string().trim().min(1).max(1000),
      parentId: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Write a comment before sending." };
  const gate = await member(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("comments").insert({
    site_id: parsed.data.siteId,
    target_type: "review_item",
    target_id: parsed.data.itemId,
    author: gate.session.userId,
    body: parsed.data.body,
    parent_id: parsed.data.parentId ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.site.slug as string);
}

export async function resolveComment(input: { siteId: string; commentId: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), commentId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That comment could not be resolved." };
  const gate = await member(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("comments").update({ resolved: true }).eq("id", parsed.data.commentId).eq("site_id", parsed.data.siteId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.site.slug as string);
}

async function approver(reviewId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, session: null, error: "Sign in again." as const };
  const supabase = await createClient();
  const review = await supabase.from("reviews").select("id, site_id, submitted_by, status").eq("id", reviewId).maybeSingle();
  if (review.error || !review.data) return { supabase: null, session: null, error: "Review not found." as const };
  const site = await supabase.from("sites").select("slug, name").eq("id", review.data.site_id).eq("org_id", session.org.orgId).maybeSingle();
  if (!site.data) return { supabase: null, session: null, error: "Site not found." as const };
  const allowed = await supabase.rpc("can_approve", { p_review_id: reviewId });
  if (allowed.error) return { supabase: null, session: null, error: allowed.error.message };
  if (!allowed.data) return { supabase: null, session: null, error: "CREATOR_CANNOT_APPROVE" as const };
  return { supabase, session, review: review.data, site: site.data, error: null };
}

export async function requestChanges(input: { reviewId: string; itemId: string; body: string }) {
  const parsed = z
    .object({ reviewId: z.string().uuid(), itemId: z.string().uuid(), body: z.string().trim().min(1).max(1000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Write a comment before requesting changes." };
  const gate = await approver(parsed.data.reviewId);
  if (!gate.supabase || !gate.session || !gate.review) return { ok: false as const, error: gate.error };
  const comment = await gate.supabase.from("comments").insert({
    site_id: gate.review.site_id,
    target_type: "review_item",
    target_id: parsed.data.itemId,
    author: gate.session.userId,
    body: parsed.data.body,
  });
  if (comment.error) return { ok: false as const, error: comment.error.message };
  const item = await gate.supabase.from("review_items").update({ status: "changes" }).eq("id", parsed.data.itemId).eq("review_id", parsed.data.reviewId);
  if (item.error) return { ok: false as const, error: item.error.message };
  const review = await gate.supabase
    .from("reviews")
    .update({ status: "changes_requested", decided_by: gate.session.userId, decided_at: new Date().toISOString() })
    .eq("id", parsed.data.reviewId);
  if (review.error) return { ok: false as const, error: review.error.message };
  await notify("request_changes", [gate.review.submitted_by as string], gate.site.name as string, gate.site.slug as string);
  return refresh(gate.site.slug as string);
}

export async function approveReview(input: { reviewId: string }) {
  const parsed = z.object({ reviewId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "This review could not be approved." };
  const gate = await approver(parsed.data.reviewId);
  if (!gate.supabase || !gate.session || !gate.review) return { ok: false as const, error: gate.error };
  const signature = await gate.supabase.rpc("content_sig", { p_site_id: gate.review.site_id });
  if (signature.error) return { ok: false as const, error: signature.error.message };
  const review = await gate.supabase
    .from("reviews")
    .update({
      status: "approved",
      decided_by: gate.session.userId,
      decided_at: new Date().toISOString(),
      content_sig: signature.data,
    })
    .eq("id", parsed.data.reviewId);
  if (review.error) return { ok: false as const, error: review.error.message };
  await gate.supabase.from("review_items").update({ status: "approved" }).eq("review_id", parsed.data.reviewId);
  const stories = await gate.supabase.from("review_items").select("target_id").eq("review_id", parsed.data.reviewId).eq("target_type", "story");
  const storyIds = (stories.data ?? []).map((row) => row.target_id as string);
  if (storyIds.length) {
    const admin = createAdminClient();
    await admin.from("stories").update({ status: "approved" }).in("id", storyIds).neq("status", "published");
  }
  await notify("approve", [gate.review.submitted_by as string], gate.site.name as string, gate.site.slug as string);
  return refresh(gate.site.slug as string);
}
