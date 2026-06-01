"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStorage } from "@/hooks/use-workspace-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const { workspaceId, setWorkspaceId } = useWorkspaceStorage(clerkOrgId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const workspaces = useQuery(
    api.workspaces.listForOrg,
    clerkOrgId ? { clerkOrgId } : "skip",
  );
  const getOrCreateDefault = useMutation(api.workspaces.getOrCreateDefault);
  const createWorkspace = useMutation(api.workspaces.create);

  useEffect(() => {
    if (!clerkOrgId) {
      return;
    }
    void getOrCreateDefault({ clerkOrgId }).then((ws) => {
      if (!workspaceId) {
        setWorkspaceId(ws._id);
      }
    });
  }, [clerkOrgId, getOrCreateDefault, setWorkspaceId, workspaceId]);

  useEffect(() => {
    if (!workspaces || !clerkOrgId || workspaces.length === 0) {
      return;
    }
    const stillValid = workspaceId
      ? workspaces.some((w) => w._id === workspaceId)
      : false;
    if (!stillValid) {
      setWorkspaceId(workspaces[0]!._id);
    }
  }, [workspaces, workspaceId, clerkOrgId, setWorkspaceId]);

  if (!clerkOrgId) {
    return (
      <p className="px-2 text-xs text-muted-foreground">
        Select an organization to open a workspace.
      </p>
    );
  }

  const active = workspaces?.find((w) => w._id === workspaceId);

  return (
    <div className="space-y-2 px-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
        >
          <span className="truncate font-medium">
            {active?.name ?? "Loading workspace…"}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
        {open && workspaces && (
          <div className="absolute top-full z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                type="button"
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  ws._id === workspaceId && "bg-accent",
                )}
                onClick={() => {
                  setWorkspaceId(ws._id);
                  setOpen(false);
                }}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {creating ? (
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) {
              return;
            }
            void createWorkspace({ clerkOrgId, name }).then((ws) => {
              setWorkspaceId(ws._id);
              setNewName("");
              setCreating(false);
            });
          }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            autoFocus
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          New workspace
        </Button>
      )}
    </div>
  );
}
