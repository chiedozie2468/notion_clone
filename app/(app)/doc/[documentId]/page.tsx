"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function DocumentPage() {
  const params = useParams();
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const documentId = params.documentId as Id<"documents">;

  const document = useQuery(
    api.documents.get,
    clerkOrgId && documentId ? { clerkOrgId, documentId } : "skip",
  );

  if (!clerkOrgId) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Select an organization to view this page.
      </main>
    );
  }

  if (document === undefined) {
    return (
      <main className="p-6 text-sm text-muted-foreground">Loading…</main>
    );
  }

  if (document === null) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Page not found or you do not have access.
      </main>
    );
  }

  if (document.type === "folder") {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is a folder. Open a child page from the sidebar, or add pages
          inside this folder.
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{document.title}</h1>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">
        Collaborative BlockNote editor will be added in Phase 3. Content is
        stored via Convex prosemirror-sync.
      </p>
      <div className="mt-8 flex-1 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Editor placeholder
      </div>
    </main>
  );
}
