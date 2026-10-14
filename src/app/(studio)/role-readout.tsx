"use client";

import { useRole } from "@/lib/auth/use-role";

export function RoleReadout() {
  const { role, isLoading } = useRole();
  return (
    <p className="mt-4 text-[13px] text-text-3">
      {isLoading ? "Loading role" : `Current role: ${role ?? "none"}`}
    </p>
  );
}
