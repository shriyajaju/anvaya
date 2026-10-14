import { redirect } from "next/navigation";

export default async function SiteIndexPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  redirect(`/s/${slug}/overview`);
}
