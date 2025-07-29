import * as posts from "./handlers/posts";
import { env } from "./env";
import bot from "./bot";
import { isThreadMuted } from "./utils/thread";

await bot.login({
  identifier: env.HANDLE,
  password: env.BSKY_PASSWORD,
});

bot.on("reply", posts.handler);
bot.on("mention", posts.handler);
bot.on("quote", posts.handler);
