"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export function PlanUsageBanner() {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;

  const usage = useQuery(
    api.billing.getUsage,
    clerkOrgId ? { clerkOrgId } : "skip",
  );

  if (!clerkOrgId || !usage || usage.isPaid) {
    return null;
  }

  const workspaceLabel =
    usage.maxWorkspaces !== null
      ? `${usage.workspaceCount} / ${usage.maxWorkspaces} workspaces`
      : null;
  const documentLabel =
    usage.maxDocuments !== null
      ? `${usage.documentCount} / ${usage.maxDocuments} documents`
      : null;

  const atLimit = !usage.canCreateWorkspace || !usage.canCreateDocument;

  return (
    <div
      className={
        atLimit
          ? "border-b border-amber-500/30 bg-amber-500/10 px-4 py-2"
          : "border-b border-border bg-muted/40 px-4 py-2"
      }
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Free plan</span>
          {workspaceLabel && documentLabel
            ? ` · ${workspaceLabel} · ${documentLabel}`
            : null}
          {atLimit ? " · Limit reached" : null}
        </p>
        <Link href="/billing">
          <Button size="sm" variant={atLimit ? "default" : "outline"}>
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}
