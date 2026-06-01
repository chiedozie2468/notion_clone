"use client";

import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
import { DocumentTree } from "@/components/sidebar/document-tree";
import { FavoritesList } from "@/components/sidebar/favorites-list";
import { TrashList } from "@/components/sidebar/trash-list";

export function AppSidebar() {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border py-3">
        <p className="px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <div className="mt-2">
          <WorkspaceSwitcher />
        </div>
      </div>
      <FavoritesList />
      <div className="flex min-h-0 flex-1 flex-col pt-3">
        <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pages
        </p>
        <DocumentTree />
      </div>
      <TrashList />
    </aside>
  );
}
