"use client";

import { useOrganization } from "@clerk/nextjs";
import { BlockNoteView } from "@blocknote/mantine";
import { useBlockNoteSync } from "@convex-dev/prosemirror-sync/blocknote";
import type { BlockNoteEditor } from "@blocknote/core";
import { useMutation } from "convex/react";
import { useEffect, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EMPTY_DOC } from "@/lib/editor";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

type Props = {
  documentId: Id<"documents">;
};

export function CollaborativeEditor({ documentId }: Props) {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getImageUrl = useMutation(api.files.getImageUrl);

  const editorOptions = useMemo(() => {
    if (!clerkOrgId) {
      return undefined;
    }
    const uploadFile = async (file: File) => {
      const postUrl = await generateUploadUrl({ clerkOrgId, documentId });
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };
      return await getImageUrl({ clerkOrgId, documentId, storageId });
    };
    return { uploadFile };
  }, [clerkOrgId, documentId, generateUploadUrl, getImageUrl]);

  const sync = useBlockNoteSync<BlockNoteEditor>(api.prosemirrorSync, documentId, {
    editorOptions,
  });

  useEffect(() => {
    if (sync.isLoading || sync.editor) {
      return;
    }
    void sync.create(EMPTY_DOC);
  }, [sync]);

  if (sync.isLoading) {
    return (
      <p className="py-8 text-sm text-muted-foreground">Loading editor…</p>
    );
  }

  if (!sync.editor) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Preparing document…
      </p>
    );
  }

  return (
    <div className="notion-editor min-h-[50vh] rounded-lg border border-border bg-background p-4">
      <BlockNoteView editor={sync.editor} />
    </div>
  );
}
