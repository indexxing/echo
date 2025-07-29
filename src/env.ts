import { z } from "zod";

const envSchema = z.object({
  SERVICE: z.string().default("https://bsky.social"),
  DB_PATH: z.string().default("sqlite.db"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

  ADMIN_DID: z.string(),
  ADMIN_HANDLE: z.string(),
  DID: z.string(),
  HANDLE: z.string(),
  BSKY_PASSWORD: z.string(),

  GEMINI_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(Bun.env);
