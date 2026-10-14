import { PlaceholderCards } from "@/components/studio/placeholder-cards";
import { SITE_STEPS, WIDE_STEPS, isSiteStep } from "@/lib/studio/steps";
import { notFound } from "next/navigation";

export default async function SiteStepPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string; step: string }>;
}>) {
  const { step } = await params;
  if (!isSiteStep(step)) notFound();
  const label = SITE_STEPS.find((item) => item.id === step)?.label ?? step;
  const wide = WIDE_STEPS.includes(step);
  return (
    <PlaceholderCards
      title={label}
      note={
        wide
          ? "This step uses the wide workspace. The preview panel returns on the other steps."
          : "Placeholder for this step. The live visitor preview is on the right."
      }
    />
  );
}
