import { AppHeader } from "@/components/layout/app-header";
import { SyncStatus } from "@/components/dashboard/sync-status";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 md:p-10">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Phase 1 scaffold — Clerk authentication with Convex org sync. Create or
            switch an organization to verify webhook mirroring in the Convex
            dashboard.
          </p>
        </section>
        <SyncStatus />
        <section className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Phase 1 complete when:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>You can sign in with Clerk</li>
            <li>An organization appears under Data → organizations in Convex</li>
            <li>Your membership appears under Data → memberships</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
