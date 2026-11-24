export const ORG_COOKIE = "anvaya-org";

export const ORG_ROLES = ["owner", "admin", "creator", "reviewer", "viewer"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const INVITE_ROLES = ["admin", "creator", "reviewer", "viewer"] as const;

export type InviteRole = (typeof INVITE_ROLES)[number];

export const ORGANISATION_KINDS = [
  "Archaeological body",
  "Museum / Trust",
  "University",
  "Independent researcher",
] as const;

export const DEV_ACCOUNTS = [
  { email: "a.iyer@anvaya.test", name: "A. Iyer" },
  { email: "r.mehta@anvaya.test", name: "R. Mehta" },
  { email: "s.rao@anvaya.test", name: "S. Rao" },
] as const;

/** Comma-separated emails in AUTH_ALLOWLIST that may use one-click studio sign-in in production. */
export function authAllowlist(): string[] {
  return (process.env.AUTH_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedEmail(email: string): boolean {
  return authAllowlist().includes(email.trim().toLowerCase());
}

export function canManageMembers(role: OrgRole | null): boolean {
  return role === "owner" || role === "admin";
}

const STUDIO_ROOTS = [
  "/sites",
  "/assets",
  "/review-queue",
  "/archive",
  "/analytics",
  "/settings",
  "/kitchen-sink",
  "/onboarding",
];

export function isStudioPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/s" || pathname.startsWith("/s/")) return true;
  return STUDIO_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

export function destinationAfterAuth(input: {
  memberships: number;
  next: string | null;
}): string {
  if (input.memberships === 0) return "/onboarding";
  if (
    input.next &&
    input.next.startsWith("/") &&
    !input.next.startsWith("//") &&
    isStudioPath(input.next) &&
    input.next !== "/onboarding"
  ) {
    return input.next;
  }
  return "/";
}

export function initialsFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "AN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "organisation";
}

export function displayNameFromUser(input: {
  email?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const metadata = input.metadata ?? {};
  const fromProvider = [metadata.full_name, metadata.name].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (typeof fromProvider === "string") return fromProvider.trim();
  const local = input.email?.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "Member";
}
