"use client";

import { PricingTable, useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { UpgradeCallout } from "@/components/billing/upgrade-callout";

export default function BillingPage() {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;

  const usage = useQuery(
    api.billing.getUsage,
    clerkOrgId ? { clerkOrgId } : "skip",
  );

  if (!clerkOrgId) {
    return (
      <main className="p-6 md:p-10">
        <p className="text-sm text-muted-foreground">
          Select an organization to manage billing.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <div className="space-y-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to workspace
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Organization plans are billed per team. Enable Clerk Billing in your
          Clerk dashboard and create Organization plans (e.g. Free, Pro, Team)
          to match the limits below.
        </p>
      </div>

      {usage && !usage.isPaid && (
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="font-medium">Current usage</h2>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              Plan: <span className="text-foreground">{usage.planSlug}</span>
            </li>
            <li>
              Workspaces:{" "}
              <span className="text-foreground">
                {usage.workspaceCount}
                {usage.maxWorkspaces !== null
                  ? ` / ${usage.maxWorkspaces}`
                  : " (unlimited)"}
              </span>
            </li>
            <li>
              Documents:{" "}
              <span className="text-foreground">
                {usage.documentCount}
                {usage.maxDocuments !== null
                  ? ` / ${usage.maxDocuments}`
                  : " (unlimited)"}
              </span>
            </li>
          </ul>
        </section>
      )}

      {usage && !usage.canCreateDocument && usage.maxDocuments !== null && (
        <UpgradeCallout resource="documents" limit={usage.maxDocuments} />
      )}
      {usage &&
        !usage.canCreateWorkspace &&
        usage.maxWorkspaces !== null && (
          <UpgradeCallout
            resource="workspaces"
            limit={usage.maxWorkspaces}
          />
        )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Choose a plan</h2>
        <p className="text-sm text-muted-foreground">
          Recommended slugs for this app: <code>free_org</code> (3 workspaces,
          10 documents), <code>org:pro</code> or <code>pro</code> (unlimited),{" "}
          <code>org:team</code> or <code>team</code> (unlimited + seats).
        </p>
        <div className="min-h-[280px] rounded-lg border border-border bg-card p-4">
          <PricingTable for="organization" />
        </div>
      </section>

      <section className="text-sm text-muted-foreground">
        <p>
          After upgrading, subscribe to billing webhooks (
          <code>subscription.*</code>, <code>subscriptionItem.*</code>) on your
          Convex <code>/clerk-webhook</code> endpoint so limits unlock
          automatically.
        </p>
      </section>
    </main>
  );
}
