import type { Id } from "@/convex/_generated/dataModel";

export type DocumentNode = {
  _id: Id<"documents">;
  parentId: Id<"documents"> | null;
  type: "folder" | "page";
  title: string;
  icon: string | null;
  isArchived: boolean;
  updatedAt: number;
};

export type DocumentTreeNode = DocumentNode & {
  children: DocumentTreeNode[];
};

export function buildDocumentTree(nodes: DocumentNode[]): DocumentTreeNode[] {
  const byId = new Map<Id<"documents">, DocumentTreeNode>();

  for (const node of nodes) {
    byId.set(node._id, { ...node, children: [] });
  }

  const roots: DocumentTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: DocumentTreeNode[]) => {
    list.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
    for (const item of list) {
      sortNodes(item.children);
    }
  };
  sortNodes(roots);

  return roots;
}
