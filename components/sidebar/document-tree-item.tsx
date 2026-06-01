"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ChevronRight,
  FileText,
  Folder,
  MoreHorizontal,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { DocumentTreeNode } from "@/lib/document-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  node: DocumentTreeNode;
  clerkOrgId: string;
  workspaceId: Id<"workspaces">;
  depth: number;
  activeDocumentId?: Id<"documents">;
  favoriteIds: Set<Id<"documents">>;
  onCreateError: (error: unknown) => void;
};

export function DocumentTreeItem({
  node,
  clerkOrgId,
  workspaceId,
  depth,
  activeDocumentId,
  favoriteIds,
  onCreateError,
}: Props) {
  const isFavorited = favoriteIds.has(node._id);
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const createDocument = useMutation(api.documents.create);
  const renameDocument = useMutation(api.documents.rename);
  const moveDocument = useMutation(api.documents.move);
  const archiveDocument = useMutation(api.documents.setArchived);
  const moveToTrash = useMutation(api.documents.moveToTrash);
  const toggleFavorite = useMutation(api.favorites.toggle);

  const isFolder = node.type === "folder";
  const isActive = activeDocumentId === node._id;
  const href =
    node.type === "page" ? `/doc/${node._id}` : undefined;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-accent",
          isActive && "bg-accent",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isFolder ? (
          <button
            type="button"
            className="flex size-6 shrink-0 items-center justify-center"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        {isFolder ? (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        )}

        {renaming ? (
          <Input
            className="h-7 flex-1"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const next = title.trim();
              if (next && next !== node.title) {
                void renameDocument({
                  clerkOrgId,
                  documentId: node._id,
                  title: next,
                });
              }
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setTitle(node.title);
                setRenaming(false);
              }
            }}
          />
        ) : href ? (
          <Link
            href={href}
            className="min-w-0 flex-1 truncate py-1.5 text-left"
          >
            {node.title}
          </Link>
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate py-1.5 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            {node.title}
          </button>
        )}

        <button
          type="button"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-sm",
            isFavorited
              ? "text-amber-500 opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
          aria-label={isFavorited ? "Remove favorite" : "Add favorite"}
          onClick={() => {
            void toggleFavorite({ clerkOrgId, documentId: node._id });
          }}
        >
          <Star
            className={cn("size-3.5", isFavorited && "fill-current")}
          />
        </button>

        <div className="relative opacity-0 group-hover:opacity-100">
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-sm hover:bg-background"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Document actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 min-w-[10rem] rounded-md border border-border bg-popover p-1 text-xs shadow-md">
              <MenuButton
                label="Rename"
                onClick={() => {
                  setRenaming(true);
                  setMenuOpen(false);
                }}
              />
              {isFolder && (
                <>
                  <MenuButton
                    label="New page inside"
                    onClick={() => {
                      void createDocument({
                        clerkOrgId,
                        workspaceId,
                        parentId: node._id,
                        type: "page",
                      })
                        .then((id) => {
                          router.push(`/doc/${id}`);
                        })
                        .catch(onCreateError);
                      setMenuOpen(false);
                    }}
                  />
                  <MenuButton
                    label="New folder inside"
                    onClick={() => {
                      void createDocument({
                        clerkOrgId,
                        workspaceId,
                        parentId: node._id,
                        type: "folder",
                      }).catch(onCreateError);
                      setMenuOpen(false);
                    }}
                  />
                </>
              )}
              <MenuButton
                label="Move to root"
                onClick={() => {
                  void moveDocument({
                    clerkOrgId,
                    documentId: node._id,
                    parentId: null,
                  });
                  setMenuOpen(false);
                }}
              />
              <MenuButton
                label="Favorite"
                onClick={() => {
                  void toggleFavorite({ clerkOrgId, documentId: node._id });
                  setMenuOpen(false);
                }}
              />
              <MenuButton
                label="Archive"
                onClick={() => {
                  void archiveDocument({
                    clerkOrgId,
                    documentId: node._id,
                    isArchived: true,
                  });
                  setMenuOpen(false);
                }}
              />
              <MenuButton
                label="Move to trash"
                onClick={() => {
                  void moveToTrash({
                    clerkOrgId,
                    documentId: node._id,
                  }).then(() => {
                    if (activeDocumentId === node._id) {
                      router.push("/");
                    }
                  });
                  setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {isFolder && expanded && (
        <div>
          {node.children.map((child) => (
            <DocumentTreeItem
              key={child._id}
              node={child}
              clerkOrgId={clerkOrgId}
              workspaceId={workspaceId}
              depth={depth + 1}
              activeDocumentId={activeDocumentId}
              favoriteIds={favoriteIds}
              onCreateError={onCreateError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
