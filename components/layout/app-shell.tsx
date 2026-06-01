import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
