import { and, desc, eq } from "drizzle-orm";
import db from "../db";
import { memory_block_entries, memory_blocks } from "../db/schema";
import * as yaml from "js-yaml";

type MemoryBlock = {
  id: number;
  name: string;
  description: string;
  mutable: boolean;
  entries: Entry[];
};

type Entry = {
  id: number;
  block_id: number;
  label: string;
  value: string;
  added_by: string | null;
  created_at: Date | null;
};

export class MemoryHandler {
  did: string;
  blocks: MemoryBlockHandler[];

  constructor(did: string, blocks: MemoryBlockHandler[]) {
    this.did = did;
    this.blocks = blocks;
  }

  static async getBlocks(did: string) {
    const blocks = await db
      .select({
        id: memory_blocks.id,
        name: memory_blocks.name,
        description: memory_blocks.description,
        mutable: memory_blocks.mutable,
      })
      .from(memory_blocks)
      .where(eq(memory_blocks.did, did));

    const hydratedBlocks = [];

    for (const block of blocks) {
      const entries = await db
        .select()
        .from(memory_block_entries)
        .where(eq(memory_block_entries.block_id, block.id))
        .orderBy(desc(memory_block_entries.id))
        .limit(15);

      hydratedBlocks.push({
        ...block,
        entries,
      });
    }

    if (hydratedBlocks.length == 0) {
      const [newBlock] = await db
        .insert(memory_blocks)
        .values([
          {
            did,
            name: "memory",
            description: "User memory",
            mutable: false,
          },
        ])
        .returning();

      hydratedBlocks.push({
        ...newBlock,
        entries: [],
      });
    }

    return hydratedBlocks.map(
      (block) =>
        new MemoryBlockHandler(
          block as MemoryBlock,
        ),
    );
  }

  public parseBlocks() {
    return this.blocks.map((handler) => ({
      name: handler.block.name,
      description: handler.block.description,
      entries: handler.block.entries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        added_by: entry.added_by || "nobody",
      })),
    }));
  }
}

export class MemoryBlockHandler {
  block: MemoryBlock;

  constructor(block: MemoryBlock) {
    this.block = block;
  }

  public async createEntry(label: string, value: string) {
    const [entry] = await db
      .insert(memory_block_entries)
      .values([
        {
          block_id: this.block.id,
          label,
          value,
        },
      ])
      .returning();

    if (!entry) {
      return {
        added_to_memory: false,
      };
    }

    this.block.entries.push(entry);

    return {
      added_to_memory: true,
    };
  }
}
