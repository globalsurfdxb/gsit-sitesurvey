import type { BlockDef } from "@/lib/types";

export interface BlockGroup {
  title?: string;
  blocks: BlockDef[];
}

/** Split a section's blocks into titled groups (each heading starts a new card). */
export function groupBlocks(blocks: BlockDef[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  let cur: BlockGroup = { blocks: [] };
  for (const b of blocks) {
    if (b.t === "heading") {
      if (cur.blocks.length) groups.push(cur);
      cur = { title: b.text, blocks: [] };
    } else cur.blocks.push(b);
  }
  if (cur.blocks.length) groups.push(cur);
  return groups;
}
