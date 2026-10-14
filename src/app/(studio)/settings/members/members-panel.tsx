"use client";

import { INVITE_ROLES, type OrgRole } from "@/lib/auth/account";
import { cancelInvite, inviteMember, removeMember } from "@/server/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type MemberRow = {
  userId: string;
  name: string;
  initials: string | null;
  title: string | null;
  avatarUrl: string | null;
  role: OrgRole;
};

export type InviteRow = {
  id: string;
  email: string;
  role: OrgRole;
};

function RolePill({ role }: { role: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-pill border border-border bg-surface-2 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">
      {role}
    </span>
  );
}

function Avatar({
  name,
  initials,
  avatarUrl,
}: {
  name: string;
  initials: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="size-10 rounded-pill object-cover" />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-10 items-center justify-center rounded-pill bg-surface-2 text-[13px] font-medium text-text-1"
    >
      {initials || name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function MembersPanel({
  orgName,
  canManage,
  currentUserId,
  members,
  invites,
  error,
}: {
  orgName: string;
  canManage: boolean;
  currentUserId: string;
  members: MemberRow[];
  invites: InviteRow[];
  error?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(error ?? null);

  return (
    <section className="mx-auto w-full max-w-[640px] rounded-card border border-border bg-surface p-8 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">{orgName}</p>
      <h1 className="pt-2 text-[32px] font-light leading-10 text-text-1">Members</h1>

      <ul className="divide-y divide-border pt-6">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 py-3">
            <Avatar name={member.name} initials={member.initials} avatarUrl={member.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-text-1">{member.name}</p>
              {member.title ? <p className="truncate text-[13px] text-text-3">{member.title}</p> : null}
            </div>
            <RolePill role={member.role} />
            {canManage && member.userId !== currentUserId ? (
              <form action={removeMember}>
                <input type="hidden" name="userId" value={member.userId} />
                <button type="submit" className="text-[13px] text-text-2">
                  Remove
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      {invites.length > 0 ? (
        <div className="pt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">
            Pending
          </h2>
          <ul className="divide-y divide-border pt-2">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 py-3">
                <Avatar name={invite.email} initials={null} avatarUrl={null} />
                <p className="min-w-0 flex-1 truncate text-[15px]">{invite.email}</p>
                <RolePill role={invite.role} />
                <form action={cancelInvite}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="text-[13px] text-text-2">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <form
          className="flex flex-col gap-3 pt-8 sm:flex-row sm:items-end"
          action={async (formData) => {
            setFormError(null);
            setMessage(null);
            const result = await inviteMember(formData);
            if (!result.ok) {
              setFormError(result.error);
              return;
            }
            setMessage("Invite sent.");
            router.refresh();
          }}
        >
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              placeholder="name@organisation.org"
              className="h-12 rounded-button border border-border bg-surface px-3 text-[15px] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
              Role
            </span>
            <select
              name="role"
              defaultValue="creator"
              className="h-12 rounded-button border border-border bg-surface px-3 text-[15px]"
            >
              {INVITE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-12 rounded-button bg-primary px-5 text-[12px] font-semibold tracking-[0.1em] text-on-primary"
          >
            INVITE
          </button>
        </form>
      ) : null}

      {formError ? (
        <p className="pt-3 text-[13px] text-conf-low" role="alert">
          {formError}
        </p>
      ) : null}
      {message ? <p className="pt-3 text-[13px] text-accent">{message}</p> : null}
    </section>
  );
}
