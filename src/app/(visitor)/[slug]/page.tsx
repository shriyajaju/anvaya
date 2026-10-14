import { VisitorPreview } from "@/components/visitor/visitor-preview";
import { loadVisitorView } from "@/server/studio";
import { notFound } from "next/navigation";

export default async function VisitorSitePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}>) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const view = await loadVisitorView(slug, preview ?? null);
  if (!view) notFound();
  return (
    <main data-theme="dark">
      <VisitorPreview name={view.name} location={view.location} preview={view.preview} />
    </main>
  );
}
