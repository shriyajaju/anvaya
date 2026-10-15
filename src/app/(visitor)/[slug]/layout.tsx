import { PwaClient } from "@/components/visitor/pwa-client";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1c1c1c",
};

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div data-theme="dark" className="min-h-screen bg-page text-text-1">
      <PwaClient slug={slug} />
      {children}
    </div>
  );
}
