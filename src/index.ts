import * as posts from "./handlers/posts";
import { env } from "./env";
import bot from "./bot";
import consola from "consola";

const logger = consola.withTag("Entrypoint");

logger.info("Logging in..");

try {
  await bot.login({
    identifier: env.HANDLE,
    password: env.BSKY_PASSWORD,
  });

  logger.success(`Logged in as @${env.HANDLE} (${env.DID})`);

  bot.on("reply", posts.handler);
  bot.on("mention", posts.handler);
  bot.on("quote", posts.handler);

  logger.success("Registered events (reply, mention, quote)");
} catch (e) {
  logger.error("Failure to log-in: ", e);
  process.exit(1);
}
