import { Type } from "@google/genai";
import bot from "../bot";
import z from "zod";
import db from "../db";
import { muted_threads } from "../db/schema";
import { AtUri } from "@atproto/syntax";

export const definition = {
  name: "mute_thread",
  description:
    "Mutes a thread permanently, preventing you from further interaction in said thread.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      uri: {
        type: Type.STRING,
        description: "The URI of the thread.",
      },
    },
    required: ["uri"],
  },
};

export const validator = z.object({
  uri: z.string(),
});

export async function handler(args: z.infer<typeof validator>) {
  //@ts-ignore: NSID is valid
  const record = await bot.createRecord("dev.indexx.echo.threadmute", {
    $type: "dev.indexx.echo.threadmute",
    uri: args.uri,
    createdAt: new Date().toISOString(),
  });

  await db
    .insert(muted_threads)
    .values([
      {
        uri: args.uri,
        rkey: new AtUri(record.uri).rkey,
      },
    ]);

  return {
    thread_is_muted: true,
  };
}
