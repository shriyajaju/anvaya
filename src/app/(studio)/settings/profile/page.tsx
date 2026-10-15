import { ProfileForm } from "@/components/studio/settings-forms";
import { requireRole } from "@/lib/auth/session";

export default async function ProfilePage() {
  const session = await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <h1 className="text-[32px] font-light leading-10">Profile</h1>
      <ProfileForm name={session.profile.name} title={session.profile.title ?? ""} email={session.email ?? ""} />
    </div>
  );
}
