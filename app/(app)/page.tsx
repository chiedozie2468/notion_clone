import { SyncStatus } from "@/components/dashboard/sync-status";

export default function HomePage() {
  return (
    <main className="flex h-full flex-col gap-6 p-6 md:p-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to create folders and pages. Select a page to open it
          (editor arrives in Phase 3).
        </p>
      </section>
      <SyncStatus />
    </main>
  );
}
