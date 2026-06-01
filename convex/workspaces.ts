import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canWrite, requireOrgMember, requireWorkspaceInOrg } from "./lib/auth";

const workspaceSummary = v.object({
  _id: v.id("workspaces"),
  name: v.string(),
  slug: v.string(),
});

const now = () => Date.now();

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

export const listForOrg = query({
  args: { clerkOrgId: v.string() },
  returns: v.array(workspaceSummary),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgMember(ctx, args.clerkOrgId);

    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    return workspaces
      .filter((w) => !w.deletedAt)
      .map((w) => ({ _id: w._id, name: w.name, slug: w.slug }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getOrCreateDefault = mutation({
  args: { clerkOrgId: v.string() },
  returns: workspaceSummary,
  handler: async (ctx, args) => {
    const { organization, role } = await requireOrgMember(ctx, args.clerkOrgId);

    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    const active = existing.filter((w) => !w.deletedAt);
    if (active.length > 0) {
      const preferred =
        active.find((w) => w.slug === "general") ?? active[0]!;
      return {
        _id: preferred._id,
        name: preferred.name,
        slug: preferred.slug,
      };
    }

    if (!canWrite(role)) {
      throw new Error("Insufficient permissions to create a workspace");
    }

    const timestamp = now();
    const name = "General";
    const slug = "general";
    const workspaceId = await ctx.db.insert("workspaces", {
      organizationId: organization._id,
      clerkOrgId: args.clerkOrgId,
      name,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { _id: workspaceId, name, slug };
  },
});

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
  },
  returns: workspaceSummary,
  handler: async (ctx, args) => {
    const { organization, role } = await requireOrgMember(ctx, args.clerkOrgId);
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    const baseSlug = slugify(args.name);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const conflict = await ctx.db
        .query("workspaces")
        .withIndex("by_org_and_slug", (q) =>
          q.eq("organizationId", organization._id).eq("slug", slug),
        )
        .unique();
      if (!conflict || conflict.deletedAt) {
        break;
      }
      slug = `${baseSlug}-${suffix++}`;
    }

    const timestamp = now();
    const workspaceId = await ctx.db.insert("workspaces", {
      organizationId: organization._id,
      clerkOrgId: args.clerkOrgId,
      name: args.name.trim(),
      slug,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { _id: workspaceId, name: args.name.trim(), slug };
  },
});

export const rename = mutation({
  args: {
    clerkOrgId: v.string(),
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { role, workspace } = await requireWorkspaceInOrg(
      ctx,
      args.clerkOrgId,
      args.workspaceId,
    );
    if (!canWrite(role)) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(workspace._id, {
      name: args.name.trim(),
      updatedAt: now(),
    });
    return null;
  },
});
