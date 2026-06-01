"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { FilePlus, FolderPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStorage } from "@/hooks/use-workspace-storage";
import { buildDocumentTree } from "@/lib/document-tree";
import { Button } from "@/components/ui/button";
import { DocumentTreeItem } from "@/components/sidebar/document-tree-item";

export function DocumentTree() {
  const router = useRouter();
  const params = useParams();
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const { workspaceId } = useWorkspaceStorage(clerkOrgId);

  const activeDocumentId =
    typeof params.documentId === "string"
      ? (params.documentId as Id<"documents">)
      : undefined;

  const nodes = useQuery(
    api.documents.listTree,
    clerkOrgId && workspaceId
      ? { clerkOrgId, workspaceId }
      : "skip",
  );

  const createDocument = useMutation(api.documents.create);

  if (!clerkOrgId || !workspaceId) {
    return null;
  }

  const tree = nodes ? buildDocumentTree(nodes) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-4">
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => {
            void createDocument({
              clerkOrgId,
              workspaceId,
              type: "page",
            }).then((id) => router.push(`/doc/${id}`));
          }}
        >
          <FilePlus className="size-4" />
          New page
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => {
            void createDocument({
              clerkOrgId,
              workspaceId,
              type: "folder",
            });
          }}
        >
          <FolderPlus className="size-4" />
          New folder
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {nodes === undefined ? (
          <p className="px-2 text-xs text-muted-foreground">Loading pages…</p>
        ) : tree.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            No pages yet. Create a page or folder to get started.
          </p>
        ) : (
          tree.map((node) => (
            <DocumentTreeItem
              key={node._id}
              node={node}
              clerkOrgId={clerkOrgId}
              workspaceId={workspaceId}
              depth={0}
              activeDocumentId={activeDocumentId}
            />
          ))
        )}
      </div>
    </div>
  );
}
