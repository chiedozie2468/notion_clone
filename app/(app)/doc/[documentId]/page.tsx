"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { CollaborativeEditor } from "@/components/editor/collaborative-editor";
import { DocumentHeader } from "@/components/editor/document-header";
import { DocumentBreadcrumbs } from "@/components/navigation/document-breadcrumbs";
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
          This is a folder. Open a child page from the sidebar.
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto p-6 md:p-10">
      <DocumentBreadcrumbs documentId={documentId} className="mb-4" />
      <DocumentHeader document={document} />
      <div className="mt-6 min-h-0 flex-1">
        <CollaborativeEditor documentId={documentId} />
      </div>
    </main>
  );
}
