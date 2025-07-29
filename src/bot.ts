import { Bot } from "@skyware/bot";
import { env } from "./env";

export default new Bot({
  service: env.SERVICE,
});
