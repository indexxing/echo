import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { env } from "../env";
import { memory_block_entries, memory_blocks } from "./schema";

const sqlite = new Database(env.DB_PATH);
const db = drizzle(sqlite);
await migrate(db, { migrationsFolder: "./drizzle" });

await db
    .insert(memory_blocks)
    .values([
        {
            did: env.DID,
            name: "persona",
            description: "What defines Echo's personality",
            mutable: false,
        },
        {
            did: env.DID,
            name: "guidelines",
            description: "Operational protocols Echo must follow",
            mutable: false,
        },
        {
            did: env.DID,
            name: "memory",
            description: "User memory",
            mutable: true,
        },
        {
            did: env.ADMIN_DID,
            name: "memory",
            description: "User memory",
            mutable: false,
        },
    ]);

await db
    .insert(memory_block_entries)
    .values([
        {
            block_id: 1, // * "persona" - bot
            label: "administrator alt",
            value:
                "Your administrator has an alt with the handle of @alt.indexx.dev",
        },
        {
            block_id: 2, // * "guidelines" - bot
            label: "test",
            value: "This is a test of your memory capabilities",
        },
        {
            block_id: 3, // * "memory" - bot
            label: "atproto projects",
            value:
                'There are several AT protocol projects, one being "AT Toolbox" developed by @baileytownsend.dev which allows users to interact with the ATmosphere in iOS Shortcuts',
        },
        {
            block_id: 4, // * "memory" - administrator
            label: "persona",
            value:
                "User requests you append the amount of characters your message contains to the end of your message",
        },
    ]);
