import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertDocumentRead,
  assertDocumentWrite,
} from "./lib/documentAccess";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({
  checkRead: async (ctx, id) => {
    await assertDocumentRead(ctx as unknown as QueryCtx, id);
  },
  checkWrite: async (ctx, id) => {
    await assertDocumentWrite(ctx as unknown as MutationCtx, id);
  },
});
