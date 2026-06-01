"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { getPlanLimitPayload } from "@/lib/plan-limit-error";

export function usePlanLimitHandler() {
  const router = useRouter();

  return useCallback(
    (error: unknown, onLimit?: (resource: "workspaces" | "documents") => void) => {
      const payload = getPlanLimitPayload(error);
      if (!payload) {
        return false;
      }

      onLimit?.(payload.resource);

      const label =
        payload.resource === "workspaces" ? "workspaces" : "documents";
      const upgrade = window.confirm(
        `You've reached the Free plan limit of ${payload.limit} ${label}. Open billing to upgrade?`,
      );
      if (upgrade) {
        router.push("/billing");
      }
      return true;
    },
    [router],
  );
}
