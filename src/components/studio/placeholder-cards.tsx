import { Card } from "@/components/ui/card";

export function PlaceholderCards({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h1 className="text-[32px] font-light leading-10">{title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-text-2">{note}</p>
      </Card>
      <Card sectionLabel="Coming next">
        <p className="text-[15px] leading-6 text-text-2">This step is a placeholder in the studio shell.</p>
      </Card>
    </div>
  );
}
