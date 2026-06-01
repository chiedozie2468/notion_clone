"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { FileText, Folder, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStorage } from "@/hooks/use-workspace-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchDialog() {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const { workspaceId } = useWorkspaceStorage(clerkOrgId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useQuery(
    api.documents.search,
    clerkOrgId && workspaceId && query.trim().length > 0
      ? { clerkOrgId, workspaceId, query: query.trim() }
      : "skip",
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Close search"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search pages"
        className="fixed left-1/2 top-[12%] z-50 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-popover shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Search pages and folders…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground hover:bg-accent"
            onClick={close}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type to search in the current workspace.
            </p>
          ) : results === undefined ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item) => (
                <li key={item._id}>
                  {item.type === "page" ? (
                    <Link
                      href={`/doc/${item._id}`}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                      onClick={close}
                    >
                      <ResultIcon item={item} />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  ) : (
                    <div className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground">
                      <ResultIcon item={item} />
                      <span className="truncate">{item.title}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function ResultIcon({
  item,
}: {
  item: { type: "page" | "folder"; icon: string | null };
}) {
  if (item.icon) {
    return <span className="shrink-0 text-base leading-none">{item.icon}</span>;
  }
  return item.type === "folder" ? (
    <Folder className="size-4 shrink-0 text-muted-foreground" />
  ) : (
    <FileText className="size-4 shrink-0 text-muted-foreground" />
  );
}
