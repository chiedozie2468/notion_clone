"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  resource: "workspaces" | "documents";
  limit: number;
};

export function UpgradeCallout({ resource, limit }: Props) {
  const label = resource === "workspaces" ? "workspaces" : "documents";

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium">Free plan limit reached</p>
      <p className="mt-1 text-muted-foreground">
        Your organization can have up to {limit} {label} on the Free plan.
        Upgrade to Pro or Team for unlimited {label}.
      </p>
      <Link href="/billing" className="mt-3 inline-block">
        <Button size="sm">View plans</Button>
      </Link>
    </div>
  );
}
