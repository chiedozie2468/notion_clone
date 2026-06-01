import { v } from "convex/values";
import { query } from "./_generated/server";
import { getOrgUsage, isPaidPlan, resolvePlanSlug } from "./lib/billing";
import { requireOrgMember } from "./lib/auth";

const usageValidator = v.object({
  planSlug: v.string(),
  billingStatus: v.union(v.string(), v.null()),
  workspaceCount: v.number(),
  documentCount: v.number(),
  maxWorkspaces: v.union(v.number(), v.null()),
  maxDocuments: v.union(v.number(), v.null()),
  canCreateWorkspace: v.boolean(),
  canCreateDocument: v.boolean(),
  isPaid: v.boolean(),
});

export const getUsage = query({
  args: { clerkOrgId: v.string() },
  returns: usageValidator,
  handler: async (ctx, args) => {
    const { organization } = await requireOrgMember(ctx, args.clerkOrgId);
    const usage = await getOrgUsage(ctx, organization);
    const planSlug = resolvePlanSlug(organization.billingPlanSlug);

    return {
      ...usage,
      isPaid: isPaidPlan(planSlug),
    };
  },
});
