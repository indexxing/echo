import { interactions } from "../db/schema";
import type { Post } from "@skyware/bot";
import { env } from "../env";
import db from "../db";

export function isAuthorizedUser(did: string) {
    return env.AUTHORIZED_USERS == null
        ? true
        : env.AUTHORIZED_USERS.includes(did as any);
}

export async function logInteraction(post: Post): Promise<void> {
    await db.insert(interactions).values([{
        uri: post.uri,
        did: post.author.did,
    }]);

    console.log(`Logged interaction, initiated by @${post.author.handle}`);
}
