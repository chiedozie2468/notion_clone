"use client";

import {
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchDialog } from "@/components/search/search-dialog";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">Notion Clone</span>
        <SearchDialog />
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/"
          afterLeaveOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
        />
      </div>
      <div className="flex items-center gap-2">
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Billing
          </Button>
        </Link>
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
