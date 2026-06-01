"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useCallback, useState } from "react";

const storageKey = (clerkOrgId: string) => `notion_clone:workspace:${clerkOrgId}`;

function readFromStorage(clerkOrgId: string | undefined): Id<"workspaces"> | null {
  if (typeof window === "undefined" || !clerkOrgId) return null;
  const stored = localStorage.getItem(storageKey(clerkOrgId));
  return stored ? (stored as Id<"workspaces">) : null;
}

export function useWorkspaceStorage(clerkOrgId: string | undefined) {
  // Lazy init: reads localStorage once on mount, SSR-safe
  const [workspaceId, setWorkspaceIdState] = useState<Id<"workspaces"> | null>(
    () => readFromStorage(clerkOrgId),
  );

  // Track the previous clerkOrgId to detect changes between renders
  const [trackedOrgId, setTrackedOrgId] = useState(clerkOrgId);

  // Derived state pattern: update during render instead of in an effect
  if (trackedOrgId !== clerkOrgId) {
    setTrackedOrgId(clerkOrgId);
    setWorkspaceIdState(readFromStorage(clerkOrgId));
  }

  const setWorkspaceId = useCallback(
    (id: Id<"workspaces">) => {
      if (!clerkOrgId) return;
      localStorage.setItem(storageKey(clerkOrgId), id);
      setWorkspaceIdState(id);
    },
    [clerkOrgId],
  );

  return { workspaceId, setWorkspaceId };
}