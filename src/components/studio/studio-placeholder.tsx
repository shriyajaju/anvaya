import { PlaceholderCards } from "@/components/studio/placeholder-cards";

const PAGES: Record<string, { title: string; note: string }> = {
  sites: { title: "Sites", note: "Sites you can open in the workspace." },
  assets: { title: "Assets", note: "Models, photographs, and documents for this organisation." },
  "review-queue": { title: "Review queue", note: "Reviews waiting for someone other than their author." },
  archive: { title: "Archive", note: "Published versions across your sites." },
  analytics: { title: "Analytics", note: "Visitor events and feedback." },
  settings: { title: "Settings", note: "Profile, members, and site rules." },
  profile: { title: "Profile", note: "Your name and title, as shown in the account menu." },
};

export function StudioPlaceholder({ page }: { page: keyof typeof PAGES }) {
  const copy = PAGES[page];
  return (
    <div className="px-6 py-10">
      <PlaceholderCards title={copy.title} note={copy.note} />
    </div>
  );
}
