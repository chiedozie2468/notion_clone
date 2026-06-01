"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { FileText, Folder, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function FavoritesList() {
  const params = useParams();
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;

  const favorites = useQuery(
    api.favorites.list,
    clerkOrgId ? { clerkOrgId } : "skip",
  );

  const activeDocumentId =
    typeof params.documentId === "string"
      ? (params.documentId as Id<"documents">)
      : undefined;

  if (!clerkOrgId) {
    return null;
  }

  return (
    <div className="border-b border-border px-2 pb-3">
      <p className="flex items-center gap-1.5 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Star className="size-3.5" />
        Favorites
      </p>
      {favorites === undefined ? (
        <p className="px-2 text-xs text-muted-foreground">Loading…</p>
      ) : favorites.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">
          Star pages to pin them here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {favorites.map((item) => {
            const href =
              item.type === "page" ? `/doc/${item.documentId}` : undefined;
            const isActive = activeDocumentId === item.documentId;

            return (
              <li key={item._id}>
                {href ? (
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                      isActive && "bg-accent",
                    )}
                  >
                    <ItemIcon item={item} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                    <ItemIcon item={item} />
                    <span className="truncate">{item.title}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
