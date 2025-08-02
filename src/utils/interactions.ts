import { interactions } from "../db/schema";
import type { Post } from "@skyware/bot";
import { desc, notInArray } from "drizzle-orm";
import { env } from "../env";
import db from "../db";

export function isAuthorizedUser(did: string) {
    return env.AUTHORIZED_USERS == null
        ? true
        : env.AUTHORIZED_USERS.includes(did as any);
}

export async function logInteraction(
  post: Post,
  options: {
    responseText: string | null;
    wasMuted: boolean;
  },
): Promise<void> {
  await db.insert(interactions).values([
    {
      uri: post.uri,
      did: post.author.did,
      post: post.text,
      response: options.responseText,
      muted: options.wasMuted,
    },
  ]);

  console.log(`Logged interaction, initiated by @${post.author.handle}`);
}

export async function getRecentInteractions(did: string, thread: Post[]) {
  const threadUris = thread.map((p) => p.uri);

  const recentInteractions = await db.query.interactions.findMany({
    where: (interactions, { eq, and, notInArray }) =>
      and(
        eq(interactions.did, did),
        notInArray(interactions.uri, threadUris),
      ),
    orderBy: (interactions, { desc }) => [desc(interactions.created_at)],
    limit: 5,
  });

  return recentInteractions.map((i) => ({
    post: i.post,
    response: i.response,
  }));
}
