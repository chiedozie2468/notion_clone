"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type Props = {
  documentId: Id<"documents">;
  className?: string;
};

export function DocumentBreadcrumbs({ documentId, className }: Props) {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;

  const trail = useQuery(
    api.documents.getBreadcrumb,
    clerkOrgId ? { clerkOrgId, documentId } : "skip",
  );

  if (!clerkOrgId || trail === undefined || trail.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1 text-sm", className)}
    >
      <Link
        href="/"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Home
      </Link>
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        const href =
          item.type === "page" ? `/doc/${item._id}` : undefined;

        return (
          <span key={item._id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            {href && !isLast ? (
              <Link
                href={href}
                className="max-w-[12rem] truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.icon ? `${item.icon} ` : ""}
                {item.title}
              </Link>
            ) : (
              <span
                className={cn(
                  "max-w-[14rem] truncate",
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.icon ? `${item.icon} ` : ""}
                {item.title}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
