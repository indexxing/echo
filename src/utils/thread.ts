import { graphemeLength, Post, PostReference } from "@skyware/bot";
import * as yaml from "js-yaml";
import bot from "../bot";
import { muted_threads } from "../db/schema";
import { eq } from "drizzle-orm";
import db from "../db";

const MAX_GRAPHEMES = 290;
const MAX_THREAD_DEPTH = 10;

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
    currentPost && parentCount < MAX_THREAD_DEPTH
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
  * This code is AI generated, and a bit finicky. May re-do at some point
*/
export function exceedsGraphemes(content: string) {
  return graphemeLength(content) > MAX_GRAPHEMES;
}

function splitResponse(content: string): string[] {
  const rawParts: string[] = [];
  let currentPart = "";
  let currentGraphemes = 0;

  const segmenter = new Intl.Segmenter("en-US", { granularity: "sentence" });
  const sentences = [...segmenter.segment(content)].map((s) => s.segment);

  for (const sentence of sentences) {
    const sentenceGraphemes = graphemeLength(sentence);
    if (currentGraphemes + sentenceGraphemes > MAX_GRAPHEMES) {
      rawParts.push(currentPart.trim());
      currentPart = sentence;
      currentGraphemes = sentenceGraphemes;
    } else {
      currentPart += sentence;
      currentGraphemes += sentenceGraphemes;
    }
  }

  if (currentPart.trim().length > 0) {
    rawParts.push(currentPart.trim());
  }

  const totalParts = rawParts.length;

  const finalParts: string[] = [];

  for (let i = 0; i < rawParts.length; i++) {
    const prefix = `[${i + 1}/${totalParts}] `;
    const base = rawParts[i];

    if (graphemeLength(prefix + base) > MAX_GRAPHEMES) {
      const segmenter = new Intl.Segmenter("en-US", {
        granularity: "word",
      });
      const words = [...segmenter.segment(base ?? "")].map((w) => w.segment);
      let chunk = "";
      let chunkGraphemes = 0;

      for (const word of words) {
        const wordGraphemes = graphemeLength(word);
        const totalGraphemes = graphemeLength(prefix + chunk + word);

        if (totalGraphemes > MAX_GRAPHEMES) {
          finalParts.push(`${prefix}${chunk.trim()}`);
          chunk = word;
          chunkGraphemes = wordGraphemes;
        } else {
          chunk += word;
          chunkGraphemes += wordGraphemes;
        }
      }

      if (chunk.trim()) {
        finalParts.push(`${prefix}${chunk.trim()}`);
      }
    } else {
      finalParts.push(`${prefix}${base}`);
    }
  }

  return finalParts;
}

export async function multipartResponse(content: string, post?: Post) {
  const parts = splitResponse(content);

  let root = null;
  let latest: PostReference | null = null;

  for (const text of parts) {
    if (latest == null) {
      if (post) {
        latest = await post.reply({ text });
      } else {
        latest = await bot.post({ text });
      }

      root = latest.uri;
    } else {
      latest.reply({ text });
    }
  }

  return root!;
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
