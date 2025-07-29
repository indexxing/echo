import { AtUri } from "@atproto/syntax";
import { Type } from "@google/genai";
import { env } from "../env";
import bot from "../bot";
import z from "zod";
import { exceedsGraphemes, multipartResponse } from "../utils/thread";

export const definition = {
  name: "create_post",
  description: "Creates a new Bluesky post/thread and returns the URL.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "The text of the post.",
      },
    },
    required: ["text"],
  },
};

export const validator = z.object({
  text: z.string(),
});

export async function handler(args: z.infer<typeof validator>) {
  let uri: string | null = null;
  if (exceedsGraphemes(args.text)) {
    uri = await multipartResponse(args.text);
  } else {
    const post = await bot.post({
      text: args.text,
    });

    uri = post.uri;
  }

  return {
    link: `https://bsky.app/profile/${env.HANDLE}/${new AtUri(uri).rkey}`,
  };
}
