import { v } from "convex/values";

export const membershipRoleValidator = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);

export type MembershipRole = "admin" | "member" | "viewer";

/** Map Clerk org role strings to our canonical roles. */
export function clerkRoleToMembershipRole(
  clerkRole: string | undefined,
): MembershipRole {
  if (clerkRole === "org:admin" || clerkRole === "admin") {
    return "admin";
  }
  if (clerkRole === "org:guest" || clerkRole === "viewer") {
    return "viewer";
  }
  return "member";
}
