"use client";

import { focusRing } from "@/components/ui/motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/members", label: "Members & roles" },
  { href: "/settings/site", label: "Site rules" },
  { href: "/settings", label: "Preferences" },
  { href: "/settings/export", label: "Export" },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="flex w-[220px] shrink-0 flex-col gap-1 rounded-card bg-surface p-3">
      {links.map((link) => {
        const active = link.href === "/settings" ? path === "/settings" : path.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={`${focusRing} rounded-button px-3 py-2 text-[15px] ${active ? "bg-primary text-on-primary" : "text-text-2"}`}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
