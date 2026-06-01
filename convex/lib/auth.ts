// 📍 File: convex/lib/auth.ts

import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { MembershipRole } from "./roles";

export type OrgAuth = {
  clerkUserId: string;
  user: Doc<"users">;
  organization: Doc<"organizations">;
  membership: Doc<"memberships">;
  role: MembershipRole;
};

export async function requireOrgMember(
  ctx: unknown,
  clerkOrgId: string,
): Promise<OrgAuth> {
  // Safe cast via unknown to completely avoid the strict ESLint "no-explicit-any" rule
  const safeCtx = ctx as unknown as QueryCtx;
  
  const identity = await safeCtx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await safeCtx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerkUserId", identity.subject)
    )
    .unique();

  if (!user) throw new Error("User profile not found");

  const organization = await safeCtx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) =>
      q.eq("clerkOrgId", clerkOrgId)
    )
    .unique();

  if (!organization) throw new Error("Organization not found");

  const membership = await safeCtx.db
    .query("memberships")
    .withIndex("by_org_and_user", (q) =>
      q.eq("organizationId", organization._id).eq("userId", user._id)
    )
    .unique();

  if (!membership) throw new Error("Not a member");

  return {
    clerkUserId: identity.subject,
    user,
    organization,
    membership,
    role: membership.role as MembershipRole,
  };
}

export async function requireWorkspaceInOrg(
  ctx: unknown,
  clerkOrgId: string,
  workspaceId: Id<"workspaces">,
): Promise<OrgAuth & { workspace: Doc<"workspaces"> }> {
  const auth = await requireOrgMember(ctx, clerkOrgId);
  const safeCtx = ctx as unknown as QueryCtx;
  
  const workspace = await safeCtx.db.get(workspaceId);

  if (!workspace || workspace.organizationId !== auth.organization._id) {
    throw new Error("Workspace not found");
  }

  return { ...auth, workspace };
}

export function canWrite(role: MembershipRole) {
  return role === "admin" || role === "member";
}