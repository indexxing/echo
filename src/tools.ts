import * as create_blog_post from "./tools/create_blog_post";
import * as mute_thread from "./tools/mute_thread";
import * as create_post from "./tools/create_post";
import type { FunctionCall, GenerateContentConfig } from "@google/genai";
import type { infer as z_infer } from "zod";

const validation_mappings = {
  "create_post": create_post.validator,
  "create_blog_post": create_blog_post.validator,
  "mute_thread": mute_thread.validator,
} as const;

export const declarations = [
  {
    functionDeclarations: [
      create_post.definition,
      create_blog_post.definition,
      mute_thread.definition,
    ],
  },
];

type ToolName = keyof typeof validation_mappings;
export async function handler(call: FunctionCall & { name: ToolName }) {
  const parsedArgs = validation_mappings[call.name].parse(call.args);

  switch (call.name) {
    case "create_post":
      return await create_post.handler(
        parsedArgs as z_infer<typeof create_post.validator>,
      );
    case "create_blog_post":
      return await create_blog_post.handler(
        parsedArgs as z_infer<typeof create_blog_post.validator>,
      );
    case "mute_thread":
      return await mute_thread.handler(
        parsedArgs as z_infer<typeof mute_thread.validator>,
      );
  }
}
