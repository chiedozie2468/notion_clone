import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, type QueryCtx, mutation, query } from "./_generated/server";
import { assertCanCreateDocument } from "./lib/billing";
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
  coverImage: v.union(v.string(), v.null()),
  coverImageStorageId: v.union(v.id("_storage"), v.null()),
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
    // Cast ctx safely to avoid ESLint 'any' restrictions
    const { organization, workspace } = await requireWorkspaceInOrg(
      ctx as unknown as MutationCtx,
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
        coverImage: d.coverImage ?? null,
        coverImageStorageId: d.coverImageStorageId ?? null,
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
    // Cast ctx safely to avoid ESLint 'any' restrictions
    const { organization } = await requireOrgMember(ctx as unknown as MutationCtx, args.clerkOrgId);
    const document = await ctx.db.get(args.documentId);

    if (
      !document ||
      document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      return null;
    }

    let coverImage = document.coverImage ?? null;
    if (document.coverImageStorageId) {
      coverImage =
        (await ctx.storage.getUrl(document.coverImageStorageId)) ?? coverImage;
    }

    return {
      _id: document._id,
      parentId: document.parentId ?? null,
      type: document.type,
      title: document.title,
      icon: document.icon ?? null,
      coverImage,
      coverImageStorageId: document.coverImageStorageId ?? null,
      isArchived: document.isArchived,
      updatedAt: document.updatedAt,
    };
  },
});

export const updateAppearance = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
    icon: v.optional(v.union(v.string(), v.null())),
    coverImageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
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

    const appearance: {
      icon?: string;
      coverImage?: string;
      coverImageStorageId?: Id<"_storage">;
    } = {};

    if (args.icon !== undefined) {
      appearance.icon = args.icon ?? undefined;
    }

    if (args.coverImageStorageId !== undefined) {
      if (args.coverImageStorageId === null) {
        appearance.coverImageStorageId = undefined;
        appearance.coverImage = undefined;
      } else {
        appearance.coverImageStorageId = args.coverImageStorageId;
        appearance.coverImage =
          (await ctx.storage.getUrl(args.coverImageStorageId)) ?? undefined;
      }
    }

    await ctx.db.patch(document._id, {
      updatedAt: now(),
      ...appearance,
    });
    return null;
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

    await assertCanCreateDocument(ctx, organization);

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

const breadcrumbItem = v.object({
  _id: v.id("documents"),
  title: v.string(),
  type: v.union(v.literal("folder"), v.literal("page")),
  icon: v.union(v.string(), v.null()),
});

const searchResult = v.object({
  _id: v.id("documents"),
  title: v.string(),
  type: v.union(v.literal("folder"), v.literal("page")),
  icon: v.union(v.string(), v.null()),
  workspaceId: v.union(v.id("workspaces"), v.null()),
  parentId: v.union(v.id("documents"), v.null()),
});

const trashItem = v.object({
  _id: v.id("documents"),
  title: v.string(),
  type: v.union(v.literal("folder"), v.literal("page")),
  icon: v.union(v.string(), v.null()),
  deletedAt: v.number(),
  workspaceId: v.union(v.id("workspaces"), v.null()),
});

export const search = query({
  args: {
    clerkOrgId: v.string(),
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  returns: v.array(searchResult),
  handler: async (ctx, args) => {
    // Cast ctx safely to avoid ESLint 'any' restrictions
    const { organization, workspace } = await requireWorkspaceInOrg(
      ctx as unknown as MutationCtx,
      args.clerkOrgId,
      args.workspaceId,
    );

    const term = args.query.trim();
    if (!term) {
      return [];
    }

    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", term).eq("clerkOrgId", args.clerkOrgId).eq("workspaceId", workspace._id),
      )
      .take(20);

    return results
      .filter(
        (d) =>
          !d.deletedAt &&
          !d.isArchived &&
          d.organizationId === organization._id,
      )
      .map((d) => ({
        _id: d._id,
        title: d.title,
        type: d.type,
        icon: d.icon ?? null,
        workspaceId: d.workspaceId ?? null,
        parentId: d.parentId ?? null,
      }));
  },
});

export const getBreadcrumb = query({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.array(breadcrumbItem),
  handler: async (ctx, args) => {
    // Cast ctx safely to avoid ESLint 'any' restrictions
    const { organization } = await requireOrgMember(ctx as unknown as MutationCtx, args.clerkOrgId);

    const trail: Array<{
      _id: Id<"documents">;
      title: string;
      type: "folder" | "page";
      icon: string | null;
    }> = [];

    let current = await ctx.db.get(args.documentId);
    if (
      !current ||
      current.deletedAt ||
      current.organizationId !== organization._id
    ) {
      return [];
    }

    const visited = new Set<string>();
    while (current) {
      if (visited.has(current._id)) {
        break;
      }
      visited.add(current._id);

      trail.unshift({
        _id: current._id,
        title: current.title,
        type: current.type,
        icon: current.icon ?? null,
      });

      if (!current.parentId) {
        break;
      }
      current = await ctx.db.get(current.parentId);
      if (
        !current ||
        current.deletedAt ||
        current.organizationId !== organization._id
      ) {
        break;
      }
    }

    return trail;
  },
});

export const listTrash = query({
  args: {
    clerkOrgId: v.string(),
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(trashItem),
  handler: async (ctx, args) => {
    // Cast ctx safely to avoid ESLint 'any' restrictions
    const { organization, workspace } = await requireWorkspaceInOrg(
      ctx as unknown as MutationCtx,
      args.clerkOrgId,
      args.workspaceId,
    );

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_id", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .take(100);

    return documents
      .filter(
        (d) =>
          d.deletedAt &&
          d.organizationId === organization._id,
      )
      .map((d) => ({
        _id: d._id,
        title: d.title,
        type: d.type,
        icon: d.icon ?? null,
        deletedAt: d.deletedAt!,
        workspaceId: d.workspaceId ?? null,
      }))
      .sort((a, b) => b.deletedAt - a.deletedAt);
  },
});

export const moveToTrash = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
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

    const timestamp = now();
    await ctx.db.patch(document._id, {
      deletedAt: timestamp,
      updatedAt: timestamp,
    });

    const favorites = await ctx.db
      .query("documentFavorites")
      .withIndex("by_document_and_user", (q) => q.eq("documentId", document._id))
      .take(50);
    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    return null;
  },
});

export const restoreFromTrash = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
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
      !document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      throw new Error("Document not found in trash");
    }

    await ctx.db.patch(document._id, {
      deletedAt: undefined,
      updatedAt: now(),
    });
    return null;
  },
});

export const permanentlyDelete = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
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
      !document.deletedAt ||
      document.organizationId !== organization._id
    ) {
      throw new Error("Document not found in trash");
    }

    const favorites = await ctx.db
      .query("documentFavorites")
      .withIndex("by_document_and_user", (q) => q.eq("documentId", document._id))
      .take(50);
    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    await ctx.db.delete(document._id);
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