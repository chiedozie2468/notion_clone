import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireOrgMember } from "./auth";

export const PLAN_LIMIT_CODE = "PLAN_LIMIT_EXCEEDED";

type DbCtx = QueryCtx | MutationCtx;

export type PlanLimits = {
  maxWorkspaces: number | null;
  maxDocuments: number | null;
};

const FREE_PLAN_SLUGS = new Set(["free_org", "free", "free_user"]);

export function resolvePlanSlug(slug: string | undefined): string {
  if (!slug || slug.trim() === "") {
    return "free_org";
  }
  return slug;
}

export function getPlanLimits(planSlug: string | undefined): PlanLimits {
  const slug = resolvePlanSlug(planSlug);
  if (FREE_PLAN_SLUGS.has(slug)) {
    return { maxWorkspaces: 3, maxDocuments: 10 };
  }
  return { maxWorkspaces: null, maxDocuments: null };
}

export function isPaidPlan(planSlug: string | undefined): boolean {
  const limits = getPlanLimits(planSlug);
  return limits.maxWorkspaces === null && limits.maxDocuments === null;
}

async function countActiveWorkspaces(
  ctx: DbCtx,
  organizationId: Id<"organizations">,
): Promise<number> {
  const workspaces = await ctx.db
    .query("workspaces")
    .withIndex("by_organization_id", (q) =>
      q.eq("organizationId", organizationId),
    )
    .collect();
  return workspaces.filter((w) => !w.deletedAt).length;
}

async function countActiveDocuments(
  ctx: DbCtx,
  organizationId: Id<"organizations">,
): Promise<number> {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_organization_id", (q) =>
      q.eq("organizationId", organizationId),
    )
    .collect();
  return documents.filter((d) => !d.deletedAt).length;
}

export async function getOrgUsage(
  ctx: DbCtx,
  organization: Doc<"organizations">,
) {
  const limits = getPlanLimits(organization.billingPlanSlug);
  const workspaceCount = await countActiveWorkspaces(ctx, organization._id);
  const documentCount = await countActiveDocuments(ctx, organization._id);

  return {
    planSlug: resolvePlanSlug(organization.billingPlanSlug),
    billingStatus: organization.billingStatus ?? null,
    workspaceCount,
    documentCount,
    maxWorkspaces: limits.maxWorkspaces,
    maxDocuments: limits.maxDocuments,
    canCreateWorkspace:
      limits.maxWorkspaces === null || workspaceCount < limits.maxWorkspaces,
    canCreateDocument:
      limits.maxDocuments === null || documentCount < limits.maxDocuments,
  };
}

export async function assertCanCreateWorkspace(
  ctx: DbCtx,
  organization: Doc<"organizations">,
) {
  const usage = await getOrgUsage(ctx, organization);
  if (!usage.canCreateWorkspace && usage.maxWorkspaces !== null) {
    throw new ConvexError({
      code: PLAN_LIMIT_CODE,
      resource: "workspaces",
      limit: usage.maxWorkspaces,
      planSlug: usage.planSlug,
    });
  }
}

export async function assertCanCreateDocument(
  ctx: DbCtx,
  organization: Doc<"organizations">,
) {
  const usage = await getOrgUsage(ctx, organization);
  if (!usage.canCreateDocument && usage.maxDocuments !== null) {
    throw new ConvexError({
      code: PLAN_LIMIT_CODE,
      resource: "documents",
      limit: usage.maxDocuments,
      planSlug: usage.planSlug,
    });
  }
}

/* =========================
   PUBLIC API ENDPOINTS
========================= */

export const getPlanUsage = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    // Bypasses the MutationCtx vs QueryCtx constraint cleanly for ESLint
    const { organization } = await requireOrgMember(
      ctx as unknown as MutationCtx, 
      args.clerkOrgId
    );
    
    return await getOrgUsage(ctx, organization);
  },
});