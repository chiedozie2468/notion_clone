"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentMeta = {
  _id: Id<"documents">;
  title: string;
  icon: string | null;
  coverImage: string | null;
};

export function DocumentHeader({ document }: { document: DocumentMeta }) {
  const { organization } = useOrganization();
  const clerkOrgId = organization?.id;
  const [title, setTitle] = useState(document.title);
  const [icon, setIcon] = useState(document.icon ?? "");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const rename = useMutation(api.documents.rename);
  const updateAppearance = useMutation(api.documents.updateAppearance);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  if (!clerkOrgId) {
    return null;
  }

  return (
    <header className="space-y-4 border-b border-border pb-6">
      {document.coverImage ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg md:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={document.coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3"
            onClick={() => {
              void updateAppearance({
                clerkOrgId,
                documentId: document._id,
                coverImageStorageId: null,
              });
            }}
          >
            Remove cover
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => coverInputRef.current?.click()}
        >
          <ImageIcon className="size-4" />
          Add cover
        </Button>
      )}

      <Input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) {
            return;
          }
          void (async () => {
            const postUrl = await generateUploadUrl({
              clerkOrgId,
              documentId: document._id,
            });
            const result = await fetch(postUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });
            const { storageId } = (await result.json()) as {
              storageId: Id<"_storage">;
            };
            await updateAppearance({
              clerkOrgId,
              documentId: document._id,
              coverImageStorageId: storageId,
            });
          })();
        }}
      />

      <div className="flex items-start gap-3">
        <Input
          className="h-12 w-14 text-center text-2xl"
          value={icon}
          placeholder="📄"
          maxLength={4}
          onChange={(e) => setIcon(e.target.value)}
          onBlur={() => {
            const next = icon.trim();
            if (next !== (document.icon ?? "")) {
              void updateAppearance({
                clerkOrgId,
                documentId: document._id,
                icon: next || null,
              });
            }
          }}
          aria-label="Page icon"
        />
        <Input
          className="h-12 flex-1 border-none bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const next = title.trim();
            if (next && next !== document.title) {
              void rename({
                clerkOrgId,
                documentId: document._id,
                title: next,
              });
            }
          }}
        />
      </div>
    </header>
  );
}
