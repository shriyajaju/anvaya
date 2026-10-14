import { canManageMembers, type OrgRole } from "@/lib/auth/account";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MembersPanel, type InviteRow, type MemberRow } from "./members-panel";

type MemberQuery = {
  user_id: string;
  role: OrgRole;
  profiles:
    | { name: string; initials: string | null; title: string | null; avatar_url: string | null }
    | { name: string; initials: string | null; title: string | null; avatar_url: string | null }[]
    | null;
};

function profileOf(row: MemberQuery["profiles"]) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRole(["owner", "admin"]);
  const params = await searchParams;
  const orgId = session.org?.orgId;
  if (!orgId || !session.org) return null;

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("org_members")
      .select("user_id, role, profiles(name, initials, title, avatar_url)")
      .eq("org_id", orgId),
    supabase.from("org_invites").select("id, email, role").eq("org_id", orgId),
  ]);

  const people: MemberRow[] = ((members ?? []) as MemberQuery[]).map((member) => {
    const profile = profileOf(member.profiles);
    return {
      userId: member.user_id,
      name: profile?.name ?? "Member",
      initials: profile?.initials ?? null,
      title: profile?.title ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: member.role,
    };
  });

  return (
    <main className="min-h-screen bg-page px-8 py-12">
      <MembersPanel
        orgName={session.org.name}
        canManage={canManageMembers(session.role)}
        currentUserId={session.userId}
        members={people}
        invites={(invites ?? []) as InviteRow[]}
        error={params.error}
      />
    </main>
  );
}
