export const PLAN_LIMIT_CODE = "PLAN_LIMIT_EXCEEDED" as const;

export type PlanLimitPayload = {
  code: typeof PLAN_LIMIT_CODE;
  resource: "workspaces" | "documents";
  limit: number;
  planSlug?: string;
};

export function getPlanLimitPayload(error: unknown): PlanLimitPayload | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (
    data &&
    typeof data === "object" &&
    (data as PlanLimitPayload).code === PLAN_LIMIT_CODE
  ) {
    return data as PlanLimitPayload;
  }

  const message =
    error instanceof Error ? error.message : String(error);
  if (!message.includes(PLAN_LIMIT_CODE)) {
    return null;
  }

  const resource = message.includes("workspaces")
    ? "workspaces"
    : "documents";
  const limitMatch = message.match(/limit[:\s]+(\d+)/i);
  return {
    code: PLAN_LIMIT_CODE,
    resource,
    limit: limitMatch ? Number(limitMatch[1]) : 0,
  };
}
