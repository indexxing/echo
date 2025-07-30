import { z } from "zod";

const envSchema = z.object({
  AUTHORIZED_USERS: z.preprocess(
    (val) =>
      (typeof val === "string" && val.trim() !== "") ? val.split(",") : null,
    z.array(z.string()).nullable().default(null),
  ),

  SERVICE: z.string().default("https://bsky.social"),
  DB_PATH: z.string().default("sqlite.db"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  ADMIN_DID: z.string(),
  ADMIN_HANDLE: z.string(),
  DID: z.string(),
  HANDLE: z.string(),
  BSKY_PASSWORD: z.string(),

  GEMINI_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(Bun.env);
