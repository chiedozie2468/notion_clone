import { SyncStatus } from "@/components/dashboard/sync-status";

export default function HomePage() {
  return (
    <main className="flex h-full flex-col gap-6 p-6 md:p-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to create folders and pages. Free plans include 3
          workspaces and 10 documents — upgrade from Billing when you need more.
        </p>
      </section>
      <SyncStatus />
    </main>
  );
}
