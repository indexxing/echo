import { AtUri } from "@atproto/syntax";
import { Type } from "@google/genai";
import bot from "../bot";
import z from "zod";

export const definition = {
  name: "create_blog_post",
  description: "Creates a new blog post and returns the URL.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title of the blog post. Keep it concise.",
      },
      content: {
        type: Type.STRING,
        description:
          "The text of the blog post. This can contain markdown, and can be as long as necessary.",
      },
    },
    required: ["title", "content"],
  },
};

export const validator = z.object({
  title: z.string(),
  content: z.string(),
});

export async function handler(
  args: z.infer<typeof validator>,
  did: string,
) {
  //@ts-ignore: NSID is valid
  const entry = await bot.createRecord("com.whtwnd.blog.entry", {
    $type: "com.whtwnd.blog.entry",
    title: args.title,
    theme: "github-light",
    content: args.content,
    createdAt: new Date().toISOString(),
    visibility: "public",
  });

  return {
    link: `whtwnd.com/echo.indexx.dev/${new AtUri(entry.uri).rkey}`,
  };
}
