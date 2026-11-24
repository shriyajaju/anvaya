"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEV_ACCOUNTS,
  INVITE_ROLES,
  ORG_COOKIE,
  ORGANISATION_KINDS,
  destinationAfterAuth,
  isAllowlistedEmail,
  slugify,
  type InviteRole,
  type OrgRole,
} from "@/lib/auth/account";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const organisationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(ORGANISATION_KINDS),
});

const inviteSchema = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(INVITE_ROLES),
});

const DEV_EMAILS = new Set<string>(DEV_ACCOUNTS.map((account) => account.email));

function studioUrl() {
  return process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3000";
}

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

async function setCurrentOrg(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email." };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${studioUrl()}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      shouldCreateUser: true,
    },
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${studioUrl()}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is unavailable")}`);
  }
  redirect(data.url);
}

async function signInWithAdminMagicLink(email: string, next: string | null = "/") {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data.properties?.hashed_token) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Could not sign in")}`);
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    redirect(`/login?error=${encodeURIComponent(verifyError.message)}`);
  }

  const session = await getSession();
  redirect(
    destinationAfterAuth({
      memberships: session?.organisations.length ?? 0,
      next: next ?? "/",
    }),
  );
}

export async function signInAsDev(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/login?error=Development%20sign-in%20is%20unavailable");
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!DEV_EMAILS.has(email)) {
    redirect("/login?error=Unknown%20development%20account");
  }
  await signInWithAdminMagicLink(email, safeNext(formData.get("next")) ?? "/");
}

/** One-click sign-in for AUTH_ALLOWLIST emails (production demo access). */
export async function signInAllowlisted(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isAllowlistedEmail(email)) {
    redirect("/login?error=This%20email%20is%20not%20allowlisted");
  }
  await signInWithAdminMagicLink(email, safeNext(formData.get("next")) ?? "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ORG_COOKIE);
  redirect("/login");
}

export async function switchOrganisation(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = session.organisations.find((item) => item.orgId === orgId);
  if (!membership) return;
  await setCurrentOrg(orgId);
  revalidatePath("/", "layout");
}

export async function createOrganisation(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.organisations.length > 0) redirect("/");

  const parsed = organisationSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    redirect("/onboarding?error=Enter%20an%20organisation%20name");
  }

  const supabase = await createClient();
  let slug = slugify(parsed.data.name);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data: existing } = await supabase
      .from("organisations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  const { data: org, error } = await supabase
    .from("organisations")
    .insert({ name: parsed.data.name, slug, kind: parsed.data.kind })
    .select("id")
    .single();
  if (error || !org) {
    redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "Could not create the organisation")}`);
  }

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: session.userId,
    role: "owner" satisfies OrgRole,
  });
  if (memberError) {
    redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
  }

  await setCurrentOrg(org.id);
  redirect("/");
}

export async function inviteMember(formData: FormData) {
  const session = await getSession();
  if (!session?.org || (session.role !== "owner" && session.role !== "admin")) {
    return { ok: false as const, error: "Only owners and admins can invite members." };
  }

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false as const, error: "Enter an email and a role." };

  const supabase = await createClient();
  const { error } = await supabase.from("org_invites").insert({
    org_id: session.org.orgId,
    email: parsed.data.email,
    role: parsed.data.role satisfies InviteRole,
    invited_by: session.userId,
  });
  if (error) {
    const message = error.code === "23505" ? "This email already has a pending invite." : error.message;
    return { ok: false as const, error: message };
  }

  const admin = createAdminClient();
  const { error: mailError } = await admin.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${studioUrl()}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  if (mailError) {
    await supabase
      .from("org_invites")
      .delete()
      .eq("org_id", session.org.orgId)
      .eq("email", parsed.data.email);
    return { ok: false as const, error: mailError.message };
  }

  return { ok: true as const };
}

export async function removeMember(formData: FormData) {
  const session = await getSession();
  if (!session?.org || (session.role !== "owner" && session.role !== "admin")) {
    redirect("/settings/members?error=Only%20owners%20and%20admins%20can%20remove%20members");
  }

  const userId = String(formData.get("userId") ?? "");
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", session.org.orgId);
  if (error || !members) {
    redirect(`/settings/members?error=${encodeURIComponent(error?.message ?? "Could not load members")}`);
  }

  const target = members.find((member) => member.user_id === userId);
  if (!target) redirect("/settings/members");
  if (target.role === "owner" && session.role !== "owner") {
    redirect("/settings/members?error=Only%20an%20owner%20can%20remove%20an%20owner");
  }
  const owners = members.filter((member) => member.role === "owner").length;
  if (target.role === "owner" && owners <= 1) {
    redirect("/settings/members?error=The%20organisation%20needs%20an%20owner");
  }

  const { error: deleteError } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", session.org.orgId)
    .eq("user_id", userId);
  if (deleteError) {
    redirect(`/settings/members?error=${encodeURIComponent(deleteError.message)}`);
  }
  redirect("/settings/members");
}

export async function cancelInvite(formData: FormData) {
  const session = await getSession();
  if (!session?.org || (session.role !== "owner" && session.role !== "admin")) {
    redirect("/settings/members");
  }
  const inviteId = String(formData.get("inviteId") ?? "");
  const supabase = await createClient();
  await supabase.from("org_invites").delete().eq("id", inviteId).eq("org_id", session.org.orgId);
  redirect("/settings/members");
}
