"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { FileText, Folder, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStorage } from "@/hooks/use-workspace-storage";
import { cn } from "@/lib/utils";

export function TrashList() {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const { workspaceId } = useWorkspaceStorage(clerkOrgId);
  const [expanded, setExpanded] = useState(false);

  const trash = useQuery(
    api.documents.listTrash,
    clerkOrgId && workspaceId && expanded
      ? { clerkOrgId, workspaceId }
      : "skip",
  );

  const restore = useMutation(api.documents.restoreFromTrash);
  const permanentlyDelete = useMutation(api.documents.permanentlyDelete);

  if (!clerkOrgId || !workspaceId) {
    return null;
  }

  const count = trash?.length;

  return (
    <div className="border-t border-border px-2 pt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-accent"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-1.5">
          <Trash2 className="size-3.5" />
          Trash
        </span>
        {expanded && count !== undefined && (
          <span className="tabular-nums">{count}</span>
        )}
      </button>

      {expanded && (
        <div className="mt-1 max-h-48 overflow-y-auto">
          {trash === undefined ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>
          ) : trash.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Trash is empty.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {trash.map((item) => (
                <li
                  key={item._id}
                  className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-accent"
                >
                  <ItemIcon item={item} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.title}
                  </span>
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-background"
                      title="Restore"
                      onClick={() => {
                        void restore({
                          clerkOrgId,
                          documentId: item._id,
                        });
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded p-1 text-destructive hover:bg-background",
                      )}
                      title="Delete forever"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Permanently delete "${item.title}"? This cannot be undone.`,
                          )
                        ) {
                          void permanentlyDelete({
                            clerkOrgId,
                            documentId: item._id,
                          });
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ItemIcon({
  item,
}: {
  item: { type: "page" | "folder"; icon: string | null };
}) {
  if (item.icon) {
    return <span className="shrink-0 text-sm leading-none">{item.icon}</span>;
  }
  return item.type === "folder" ? (
    <Folder className="size-4 shrink-0 text-muted-foreground" />
  ) : (
    <FileText className="size-4 shrink-0 text-muted-foreground" />
  );
}
