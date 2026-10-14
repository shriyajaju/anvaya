"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrgRole } from "./account";

type RoleResponse = {
  role: OrgRole | null;
  orgId: string | null;
};

export function useRole() {
  const query = useQuery({
    queryKey: ["session", "role"],
    queryFn: async (): Promise<RoleResponse> => {
      const response = await fetch("/api/session");
      if (response.status === 401) return { role: null, orgId: null };
      if (!response.ok) throw new Error("Could not load the current role");
      return response.json() as Promise<RoleResponse>;
    },
  });

  return {
    role: query.data?.role ?? null,
    orgId: query.data?.orgId ?? null,
    isLoading: query.isLoading,
  };
}
