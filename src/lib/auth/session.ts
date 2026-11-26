import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ORG_COOKIE,
  type OrgRole,
  displayNameFromUser,
  initialsFromName,
} from "./account";

export type Membership = {
  orgId: string;
  name: string;
  slug: string;
  kind: string | null;
  role: OrgRole;
};

export type OrgSwitcherItem = Membership & { current: boolean };

export type AppSession = {
  userId: string;
  email: string | null;
  profile: {
    name: string;
    initials: string | null;
    title: string | null;
    avatarUrl: string | null;
  };
  organisations: Membership[];
  org: Membership | null;
  role: OrgRole | null;
};

type MemberRow = {
  role: OrgRole;
  organisations:
    | {
        id: string;
        name: string;
        slug: string;
        kind: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        kind: string | null;
      }[]
    | null;
};

function oneOrg(row: MemberRow["organisations"]) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const name = displayNameFromUser({
    email: user.email,
    metadata: user.user_metadata as Record<string, unknown> | null,
  });

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, name, initials, title, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      name,
      initials: initialsFromName(name),
    });
    // Race / RLS: continue and re-read; avoid crashing the whole Studio shell.
    if (insertError && insertError.code !== "23505") {
      console.error("profile insert", insertError.message);
    }
  }

  const { error: inviteError } = await supabase.rpc("accept_pending_invites");
  if (inviteError) {
    // Invites are best-effort — never hard-crash authenticated routes.
    console.error("accept_pending_invites", inviteError.message);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, initials, title, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("profile read", profileError.message);
    return null;
  }
  const resolvedProfile = profile ?? {
    name,
    initials: initialsFromName(name),
    title: null as string | null,
    avatar_url: null as string | null,
  };

  const { data: rows, error: memberError } = await supabase
    .from("org_members")
    .select("role, organisations(id, name, slug, kind)")
    .eq("user_id", user.id);
  if (memberError) {
    console.error("org_members", memberError.message);
    return null;
  }

  const organisations: Membership[] = (rows ?? []).flatMap((row) => {
    const org = oneOrg((row as MemberRow).organisations);
    if (!org) return [];
    return [
      {
        orgId: org.id,
        name: org.name,
        slug: org.slug,
        kind: org.kind,
        role: row.role as OrgRole,
      },
    ];
  });

  const cookieStore = await cookies();
  const requested = cookieStore.get(ORG_COOKIE)?.value;
  const org =
    organisations.find((item) => item.orgId === requested) ?? organisations[0] ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: {
      name: resolvedProfile.name,
      initials: resolvedProfile.initials,
      title: resolvedProfile.title,
      avatarUrl: resolvedProfile.avatar_url,
    },
    organisations,
    org,
    role: org?.role ?? null,
  };
}

export async function requireRole(roles: OrgRole[]): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.role || !roles.includes(session.role)) redirect("/");
  return session;
}

export async function listOrgSwitcherItems(): Promise<OrgSwitcherItem[]> {
  const session = await getSession();
  if (!session) return [];
  return session.organisations.map((item) => ({
    ...item,
    current: item.orgId === session.org?.orgId,
  }));
}
