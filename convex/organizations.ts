import { v } from "convex/values";
import { query } from "./_generated/server";
import { membershipRoleValidator } from "./lib/roles";

const organizationSummary = v.object({
  _id: v.id("organizations"),
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: membershipRoleValidator,
});

export const listForCurrentUser = query({
  args: {},
  returns: v.array(organizationSummary),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const results = [];
    for (const membership of memberships) {
      if (membership.deletedAt) {
        continue;
      }
      const organization = await ctx.db.get(membership.organizationId);
      if (!organization || organization.deletedAt) {
        continue;
      }
      results.push({
        _id: organization._id,
        clerkOrgId: organization.clerkOrgId,
        name: organization.name,
        slug: organization.slug,
        imageUrl: organization.imageUrl,
        role: membership.role,
      });
    }

    return results;
  },
});

export const getActiveForClerkOrg = query({
  args: { clerkOrgId: v.string() },
  returns: v.union(v.null(), organizationSummary),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();

    if (!user) {
      return null;
    }

    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!organization || organization.deletedAt) {
      return null;
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("organizationId", organization._id).eq("userId", user._id),
      )
      .unique();

    if (!membership || membership.deletedAt) {
      return null;
    }

    return {
      _id: organization._id,
      clerkOrgId: organization.clerkOrgId,
      name: organization.name,
      slug: organization.slug,
      imageUrl: organization.imageUrl,
      role: membership.role,
    };
  },
});
