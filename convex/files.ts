import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertDocumentWrite } from "./lib/documentAccess";

export const generateUploadUrl = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const document = await assertDocumentWrite(ctx, args.documentId);
    if (document.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Organization mismatch");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = mutation({
  args: {
    clerkOrgId: v.string(),
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const document = await assertDocumentWrite(ctx, args.documentId);
    if (document.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Organization mismatch");
    }
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("File not found");
    }
    return url;
  },
});
