import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const membershipRole = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  memberships: defineTable({
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: membershipRole,
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_organization_id", ["organizationId"])
    .index("by_user_id", ["userId"])
    .index("by_org_and_user", ["organizationId", "userId"]),

  // Phase 2+ tables (schema defined early for stable migrations)
  workspaces: defineTable({
    organizationId: v.id("organizations"),
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_org_and_slug", ["organizationId", "slug"]),

  documents: defineTable({
    organizationId: v.id("organizations"),
    clerkOrgId: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    parentId: v.optional(v.id("documents")),
    type: v.union(v.literal("folder"), v.literal("page")),
    title: v.string(),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    isArchived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_parent_id", ["parentId"])
    .index("by_workspace_id", ["workspaceId"]),

  aiUsage: defineTable({
    clerkOrgId: v.string(),
    organizationId: v.id("organizations"),
    period: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_and_period", ["organizationId", "period"])
    .index("by_clerk_org_and_period", ["clerkOrgId", "period"]),
});
