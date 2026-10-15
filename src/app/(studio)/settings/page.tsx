import { PreferencesForm } from "@/components/studio/settings-forms";
import { requireRole } from "@/lib/auth/session";

export default async function SettingsHomePage() {
  await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <h1 className="text-[32px] font-light leading-10">Preferences</h1>
      <p className="text-[13px] text-text-2">Theme is saved on this browser. Visitor preview light changes the phone in Studio.</p>
      <PreferencesForm />
    </div>
  );
}
