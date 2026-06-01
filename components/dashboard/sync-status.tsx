"use client";

import { useOrganization } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SyncStatus() {
  return (
    <>
      <AuthLoading>
        <StatusCard title="Connecting" description="Loading Clerk and Convex session…" />
      </AuthLoading>
      <Unauthenticated>
        <StatusCard
          title="Not signed in"
          description="Sign in to sync your profile and organizations."
          variant="warning"
        />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedSyncStatus />
      </Authenticated>
    </>
  );
}

function AuthenticatedSyncStatus() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const user = useQuery(api.users.current);
  const organizations = useQuery(api.organizations.listForCurrentUser);
  const activeOrg = useQuery(
    api.organizations.getActiveForClerkOrg,
    organization?.id ? { clerkOrgId: organization.id } : "skip",
  );

  if (!orgLoaded || user === undefined || organizations === undefined) {
    return (
      <StatusCard title="Syncing" description="Loading workspace data from Convex…" />
    );
  }

  const orgCount = organizations.length;
  const activeSynced = organization?.id ? activeOrg !== null && activeOrg !== undefined : true;

  if (organization?.id && activeOrg === null) {
    return (
      <StatusCard
        title="Organization not synced"
        description="Activate the Clerk webhook pointing to your Convex /clerk-webhook URL, then refresh membership in Clerk."
        variant="warning"
      />
    );
  }

  return (
    <StatusCard
      title="Convex + Clerk connected"
      description={`${user?.email ?? "Signed in"} · ${orgCount} organization(s) in Convex${
        organization?.name ? ` · Active: ${organization.name}${activeSynced ? " (synced)" : ""}` : ""
      }`}
      variant="success"
    />
  );
}

function StatusCard({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description: string;
  variant?: "default" | "success" | "warning";
}) {
  const border =
    variant === "success"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : variant === "warning"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-border bg-card";

  return (
    <div className={`rounded-lg border p-4 ${border}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
