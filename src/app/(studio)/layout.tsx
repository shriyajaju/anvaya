import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const path = (await headers()).get("x-pathname") ?? "";
  if (session && session.organisations.length === 0 && path !== "/onboarding") {
    redirect("/onboarding");
  }
  return children;
}
