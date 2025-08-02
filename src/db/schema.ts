import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const interactions = sqliteTable("interactions", {
  id: integer().primaryKey({ autoIncrement: true }),
  uri: text().unique(),
  did: text(),
  post: text(),
  response: text(),
  muted: integer({ mode: "boolean" }),
  created_at: integer({ mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const muted_threads = sqliteTable("muted_threads", {
  id: integer().primaryKey({ autoIncrement: true }),
  uri: text().unique(),
  rkey: text().unique(),
  muted_at: integer({ mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// ? These memory schemas are unused, though they are included in the latest database migrations
// ? I may add short-term memory support eventually, I did start working on it
export const memory_blocks = sqliteTable("memory_blocks", {
  id: integer().primaryKey({ autoIncrement: true }),
  did: text().notNull(),
  name: text().notNull().default("memory"),
  description: text().notNull().default("User memory"),
  mutable: integer({ mode: "boolean" }).notNull().default(false),
});

export const memory_block_entries = sqliteTable("memory_block_entries", {
  id: integer().primaryKey({ autoIncrement: true }),
  block_id: integer().notNull().references(() => memory_blocks.id),
  label: text().notNull(),
  value: text().notNull(),
  added_by: text(),
  created_at: integer({ mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});
