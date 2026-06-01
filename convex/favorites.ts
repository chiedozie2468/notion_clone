import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./lib/auth";

const favoriteItem = v.object({
  _id: v.id("documentFavorites"),
  documentId: v.id("documents"),
  title: v.string(),
  icon: v.union(v.string(), v.null()),
  type: v.union(v.literal("folder"), v.literal("page")),
  workspaceId: v.union(v.id("workspaces"), v.null()),
});

export const list = query({
  args: {
    clerkOrgId: v.string(),
  },
  returns: v.array(favoriteItem),
  handler: async (ctx, args) => {
    const { organization, user } = await requireOrgMember(ctx, args.clerkOrgId);

    const favorites = await ctx.db
      .query("documentFavorites")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", organization._id),
      )
      .order("desc")
      .take(50);

    const items = [];
    for (const favorite of favorites) {
      const document = await ctx.db.get(favorite.documentId);
      if (
        !document ||
        document.deletedAt ||
        document.isArchived ||
        document.organizationId !== organization._id
      ) {
        continue;
      }
      items.push({
        _id: favorite._id,
        documentId: document._id,
        title: document.title,
        icon: document.icon ?? null,
        type: document.type,
        workspaceId: document.workspaceId ?? null,
      });
    }

    return items;
  },
});

export const toggle = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.object({
    favorited: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { organization, user } = await requireOrgMember(ctx, args.clerkOrgId);

    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      throw new Error("Document not found");
    }

    const existing = await ctx.db
      .query("documentFavorites")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", args.documentId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { favorited: false };
    }

    await ctx.db.insert("documentFavorites", {
      organizationId: organization._id,
      clerkOrgId: args.clerkOrgId,
      userId: user._id,
      documentId: args.documentId,
      workspaceId: document.workspaceId,
      createdAt: Date.now(),
    });

    return { favorited: true };
  },
});

export const listDocumentIds = query({
  args: {
    clerkOrgId: v.string(),
  },
  returns: v.array(v.id("documents")),
  handler: async (ctx, args) => {
    const { organization, user } = await requireOrgMember(ctx, args.clerkOrgId);

    const favorites = await ctx.db
      .query("documentFavorites")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", organization._id),
      )
      .take(100);

    return favorites.map((f) => f.documentId);
  },
});

export const isFavorited = query({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { organization, user } = await requireOrgMember(ctx, args.clerkOrgId);

    const existing = await ctx.db
      .query("documentFavorites")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", args.documentId).eq("userId", user._id),
      )
      .unique();

    if (!existing) {
      return false;
    }

    const document = await ctx.db.get(args.documentId);
    return (
      !!document &&
      !document.deletedAt &&
      document.organizationId === organization._id
    );
  },
});
