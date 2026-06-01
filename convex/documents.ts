import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, type QueryCtx, mutation, query } from "./_generated/server";
import {
  canWrite,
  requireOrgMember,
  requireWorkspaceInOrg,
} from "./lib/auth";

const documentNode = v.object({
  _id: v.id("documents"),
  parentId: v.union(v.id("documents"), v.null()),
  type: v.union(v.literal("folder"), v.literal("page")),
  title: v.string(),
  icon: v.union(v.string(), v.null()),
  isArchived: v.boolean(),
  updatedAt: v.number(),
});

const now = () => Date.now();

type DbCtx = QueryCtx | MutationCtx;

async function getDocumentInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  organizationId: Id<"organizations">,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (
    !document ||
    document.deletedAt ||
    document.organizationId !== organizationId ||
    document.workspaceId !== workspaceId
  ) {
    throw new Error("Document not found");
  }
  return document;
}

async function isDescendant(
  ctx: DbCtx,
  ancestorId: Id<"documents">,
  nodeId: Id<"documents">,
): Promise<boolean> {
  let current = await ctx.db.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = await ctx.db.get(current.parentId);
  }
  return false;
}

export const listTree = query({
  args: {
    clerkOrgId: v.string(),
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(documentNode),
  handler: async (ctx, args) => {
    const { organization, workspace } = await requireWorkspaceInOrg(
      ctx,
      args.clerkOrgId,
      args.workspaceId,
    );

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    return documents
      .filter(
        (d) =>
          !d.deletedAt &&
          !d.isArchived &&
          d.organizationId === organization._id,
      )
      .map((d) => ({
        _id: d._id,
        parentId: d.parentId ?? null,
        type: d.type,
        title: d.title,
        icon: d.icon ?? null,
        isArchived: d.isArchived,
        updatedAt: d.updatedAt,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const get = query({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.union(v.null(), documentNode),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgMember(ctx, args.clerkOrgId);
    const document = await ctx.db.get(args.documentId);

    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      return null;
    }

    return {
      _id: document._id,
      parentId: document.parentId ?? null,
      type: document.type,
      title: document.title,
      icon: document.icon ?? null,
      isArchived: document.isArchived,
      updatedAt: document.updatedAt,
    };
  },
});

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("documents")),
    type: v.union(v.literal("folder"), v.literal("page")),
    title: v.optional(v.string()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const { organization, role, workspace } = await requireWorkspaceInOrg(
      ctx,
      args.clerkOrgId,
      args.workspaceId,
    );
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    if (args.parentId) {
      const parent = await getDocumentInWorkspace(
        ctx,
        workspace._id,
        organization._id,
        args.parentId,
      );
      if (parent.type !== "folder") {
        throw new Error("Parent must be a folder");
      }
    }

    const timestamp = now();
    const title =
      args.title?.trim() ||
      (args.type === "folder" ? "Untitled folder" : "Untitled");

    return await ctx.db.insert("documents", {
      organizationId: organization._id,
      clerkOrgId: args.clerkOrgId,
      workspaceId: workspace._id,
      parentId: args.parentId,
      type: args.type,
      title,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const rename = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization, role } = await requireOrgMember(ctx, args.clerkOrgId);
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      throw new Error("Document not found");
    }

    const title = args.title.trim();
    if (!title) {
      throw new Error("Title cannot be empty");
    }

    await ctx.db.patch(document._id, {
      title,
      updatedAt: now(),
    });
    return null;
  },
});

export const move = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
    parentId: v.union(v.id("documents"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization, role } = await requireOrgMember(ctx, args.clerkOrgId);
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id ||
      !document.workspaceId
    ) {
      throw new Error("Document not found");
    }

    if (args.parentId === document._id) {
      throw new Error("Cannot move a document into itself");
    }

    if (args.parentId) {
      const parent = await getDocumentInWorkspace(
        ctx,
        document.workspaceId,
        organization._id,
        args.parentId,
      );
      if (parent.type !== "folder") {
        throw new Error("Parent must be a folder");
      }
      if (await isDescendant(ctx, document._id, args.parentId)) {
        throw new Error("Cannot move a folder into its descendant");
      }
    }

    await ctx.db.patch(document._id, {
      parentId: args.parentId ?? undefined,
      updatedAt: now(),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
    isArchived: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization, role } = await requireOrgMember(ctx, args.clerkOrgId);
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    const document = await ctx.db.get(args.documentId);
    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(document._id, {
      isArchived: args.isArchived,
      updatedAt: now(),
    });
    return null;
  },
});
