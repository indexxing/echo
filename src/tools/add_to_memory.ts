import { Type } from "@google/genai";
import { MemoryHandler } from "../utils/memory";
import z from "zod";

export const definition = {
  name: "add_to_memory",
  description: "Adds or updates an entry in a user's memory block.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      label: {
        type: Type.STRING,
        description: "The key or label for the memory entry.",
      },
      value: {
        type: Type.STRING,
        description: "The value to be stored.",
      },
      block: {
        type: Type.STRING,
        description: "The name of the memory block to add to. Defaults to 'memory'.",
      },
    },
    required: ["label", "value"],
  },
};

export const validator = z.object({
  label: z.string(),
  value: z.string(),
  block: z.string().optional().default("memory"),
});

export async function handler(
  args: z.infer<typeof validator>,
  did: string,
) {
  const userMemory = new MemoryHandler(
    did,
    await MemoryHandler.getBlocks(did),
  );

  const blockHandler = userMemory.getBlockByName(args.block);

  if (!blockHandler) {
    return {
      success: false,
      message: `Memory block with name '${args.block}' not found.`,
    };
  }

  await blockHandler.createEntry(args.label, args.value);

  return {
    success: true,
    message: `Entry with label '${args.label}' has been added to the '${args.block}' memory block.`,
  };
}
