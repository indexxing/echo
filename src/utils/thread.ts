import { graphemeLength, Post, PostReference } from "@skyware/bot";
import { muted_threads } from "../db/schema";
import * as c from "../constants";
import { eq } from "drizzle-orm";
import * as yaml from "js-yaml";
import bot from "../bot";
import db from "../db";

/*
  Traversal
*/
export async function traverseThread(post: Post): Promise<Post[]> {
  const thread: Post[] = [
    post,
  ];
  let currentPost: Post | undefined = post;
  let parentCount = 0;

  while (
    currentPost && parentCount < c.MAX_THREAD_DEPTH
  ) {
    const parentPost = await currentPost.fetchParent();

    if (parentPost) {
      thread.push(parentPost);
      currentPost = parentPost;
    } else {
      break;
    }
    parentCount++;
  }

  return thread.reverse();
}

export function parseThread(thread: Post[]) {
  return yaml.dump({
    uri: thread[0]!.uri,
    posts: thread.map((post) => ({
      author: `${post.author.displayName} (${post.author.handle})`,
      text: post.text,
    })),
  });
}

/*
  Split Responses
*/
export function exceedsGraphemes(content: string) {
  return graphemeLength(content) > c.MAX_GRAPHEMES;
}

export function splitResponse(text: string): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 < c.MAX_GRAPHEMES - 10) {
      currentChunk += ` ${word}`;
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const total = chunks.length;
  if (total <= 1) return [text];

  return chunks.map((chunk, i) => `(${i + 1}/${total}) ${chunk}`);
}

export async function multipartResponse(content: string, post?: Post) {
  const parts = splitResponse(content).filter((p) => p.trim().length > 0);

  let latest: PostReference;
  let rootUri: string;

  if (post) {
    rootUri = (post as any).rootUri ?? (post as any).uri;
    latest = await post.reply({ text: parts[0]! });
  } else {
    latest = await bot.post({ text: parts[0]! });
    rootUri = latest.uri;
  }

  for (const text of parts.slice(1)) {
    latest = await latest.reply({ text });
  }

  return rootUri;
}

/*
  Misc.
*/
export async function isThreadMuted(post: Post): Promise<boolean> {
  const root = post.root || post;
  if (!root) return false;

  console.log("Found root: ", root.text);

  const [mute] = await db
    .select()
    .from(muted_threads)
    .where(eq(muted_threads.uri, root.uri));

  return mute !== undefined;
}
