import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { MembershipRole } from "./roles";

type AuthCtx = QueryCtx | MutationCtx;

export type OrgAuth = {
  clerkUserId: string;
  user: Doc<"users">;
  organization: Doc<"organizations">;
  membership: Doc<"memberships">;
  role: MembershipRole;
};

export async function requireAuth(ctx: AuthCtx): Promise<{
  clerkUserId: string;
  user: Doc<"users">;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerkUserId", identity.subject),
    )
    .unique();

  if (!user || user.deletedAt) {
    throw new Error("User profile not found");
  }

  return { clerkUserId: identity.subject, user };
}

export async function requireOrgMember(
  ctx: AuthCtx,
  clerkOrgId: string,
): Promise<OrgAuth> {
  const { clerkUserId, user } = await requireAuth(ctx);

  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique();

  if (!organization || organization.deletedAt) {
    throw new Error("Organization not found");
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_and_user", (q) =>
      q.eq("organizationId", organization._id).eq("userId", user._id),
    )
    .unique();

  if (!membership || membership.deletedAt) {
    throw new Error("Not a member of this organization");
  }

  return {
    clerkUserId,
    user,
    organization,
    membership,
    role: membership.role,
  };
}

export function canWrite(role: MembershipRole): boolean {
  return role === "admin" || role === "member";
}

export async function requireWorkspaceInOrg(
  ctx: AuthCtx,
  clerkOrgId: string,
  workspaceId: Id<"workspaces">,
): Promise<OrgAuth & { workspace: Doc<"workspaces"> }> {
  const auth = await requireOrgMember(ctx, clerkOrgId);
  const workspace = await ctx.db.get(workspaceId);

  if (
    !workspace ||
    workspace.deletedAt ||
    workspace.organizationId !== auth.organization._id
  ) {
    throw new Error("Workspace not found");
  }

  return { ...auth, workspace };
}
