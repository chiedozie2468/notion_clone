"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";

const storageKey = (clerkOrgId: string) => `notion_clone:workspace:${clerkOrgId}`;

export function useWorkspaceStorage(clerkOrgId: string | undefined) {
  const [workspaceId, setWorkspaceIdState] = useState<Id<"workspaces"> | null>(
    null,
  );

  useEffect(() => {
    if (!clerkOrgId) {
      setWorkspaceIdState(null);
      return;
    }
    const stored = localStorage.getItem(storageKey(clerkOrgId));
    if (stored) {
      setWorkspaceIdState(stored as Id<"workspaces">);
    }
  }, [clerkOrgId]);

  const setWorkspaceId = useCallback(
    (id: Id<"workspaces">) => {
      if (!clerkOrgId) {
        return;
      }
      localStorage.setItem(storageKey(clerkOrgId), id);
      setWorkspaceIdState(id);
    },
    [clerkOrgId],
  );

  return { workspaceId, setWorkspaceId };
}
