"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PlanUsageBanner } from "@/components/billing/plan-usage-banner";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.getMe);

  // undefined = still loading from Convex
  // null     = authenticated but DB record not synced yet
  // Both cases: hold the shell until the profile is ready
  if (user === undefined || user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <PlanUsageBanner />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}