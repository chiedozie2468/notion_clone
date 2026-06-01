import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canWrite, requireOrgMember } from "./auth";

type Ctx = QueryCtx | MutationCtx;

export async function getPageDocument(ctx: Ctx, documentId: string) {
  const id = documentId as Id<"documents">;
  const document = await ctx.db.get(id);

  if (!document || document.deletedAt) {
    throw new Error("Document not found");
  }

  if (document.type !== "page") {
    throw new Error("Only pages have collaborative content");
  }

  return document;
}

export async function assertDocumentRead(ctx: Ctx, documentId: string) {
  const document = await getPageDocument(ctx, documentId);
  await requireOrgMember(ctx, document.clerkOrgId);
  return document;
}

export async function assertDocumentWrite(
  ctx: Ctx,
  documentId: string,
) {
  const document = await getPageDocument(ctx, documentId);
  const { role } = await requireOrgMember(ctx, document.clerkOrgId);
  if (!canWrite(role)) {
    throw new Error("Insufficient permissions");
  }
  return document;
}
