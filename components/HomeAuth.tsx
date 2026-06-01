"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";

export default function HomeAuth() {
  return (
    <div className="mb-8 w-full rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <AuthLoading>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connecting Clerk and Convex…
        </p>
      </AuthLoading>
      <Unauthenticated>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Redirecting to sign in…
        </p>
      </Unauthenticated>
      <Authenticated>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <UserButton />
          <ConvexAuthStatus />
        </div>
      </Authenticated>
    </div>
  );
}

function ConvexAuthStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const identity = useQuery(api.users.current);

  if (isLoading) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Validating session with Convex…
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400">
        Clerk is signed in, but Convex has not accepted the token yet. Activate
        the Convex integration in Clerk, then sign out and sign in again.
      </p>
    );
  }

  if (identity === undefined) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Convex connected — loading profile…
      </p>
    );
  }

  if (identity === null) {
    return (
      <p className="text-sm text-red-700 dark:text-red-400">
        Convex is running but rejected the session token. Check{" "}
        <code className="text-xs">CLERK_FRONTEND_API_URL</code> and the Clerk
        Convex integration.
      </p>
    );
  }

  return (
    <p className="text-sm text-emerald-700 dark:text-emerald-400">
      Convex + Clerk: {identity.name ?? identity.email ?? identity.subject}
    </p>
  );
}
