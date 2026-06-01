import { v } from "convex/values";
import { query } from "./_generated/server";

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      clerkUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
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

    if (!user || user.deletedAt) {
      return {
        clerkUserId: identity.subject,
        email: identity.email ?? "",
        name: identity.name,
        imageUrl: identity.pictureUrl,
      };
    }

    return {
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
    };
  },
});

// Unlike `current`, this returns null until the DB record actually exists.
// Used to gate components that depend on a fully synced user profile.
export const getMe = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      clerkUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();

    if (!user || user.deletedAt) return null;

    return {
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
    };
  },
});