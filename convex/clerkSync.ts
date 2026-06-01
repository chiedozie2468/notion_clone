import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { clerkRoleToMembershipRole } from "./lib/roles";

const now = () => Date.now();

export const upsertUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    const timestamp = now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: timestamp,
        deletedAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const softDeleteUser = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();
    if (!user) {
      return null;
    }
    await ctx.db.patch(user._id, { deletedAt: now(), updatedAt: now() });
    return null;
  },
});

export const upsertOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    const timestamp = now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        updatedAt: timestamp,
        deletedAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      imageUrl: args.imageUrl,
      billingPlanSlug: "free_org",
      billingStatus: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateOrganizationBilling = internalMutation({
  args: {
    clerkOrgId: v.string(),
    billingPlanSlug: v.string(),
    billingStatus: v.string(),
    billingSubscriptionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!organization) {
      console.warn(
        "Skipping billing update; organization missing",
        args.clerkOrgId,
      );
      return null;
    }

    await ctx.db.patch(organization._id, {
      billingPlanSlug: args.billingPlanSlug,
      billingStatus: args.billingStatus,
      billingSubscriptionId: args.billingSubscriptionId,
      updatedAt: now(),
    });
    return null;
  },
});

export const softDeleteOrganization = internalMutation({
  args: { clerkOrgId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (!org) {
      return null;
    }
    await ctx.db.patch(org._id, { deletedAt: now(), updatedAt: now() });
    return null;
  },
});

export const upsertMembership = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (!organization || !user) {
      console.warn(
        "Skipping membership upsert; org or user missing",
        args.clerkOrgId,
        args.clerkUserId,
      );
      return null;
    }

    const role = clerkRoleToMembershipRole(args.role);
    const timestamp = now();
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("organizationId", organization._id).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role,
        clerkOrgId: args.clerkOrgId,
        clerkUserId: args.clerkUserId,
        updatedAt: timestamp,
        deletedAt: undefined,
      });
      return null;
    }

    await ctx.db.insert("memberships", {
      clerkOrgId: args.clerkOrgId,
      clerkUserId: args.clerkUserId,
      organizationId: organization._id,
      userId: user._id,
      role,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return null;
  },
});

export const softDeleteMembership = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (!organization || !user) {
      return null;
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("organizationId", organization._id).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      return null;
    }

    await ctx.db.patch(membership._id, {
      deletedAt: now(),
      updatedAt: now(),
    });
    return null;
  },
});
