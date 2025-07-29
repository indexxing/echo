import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { env } from "../env";

const sqlite = new Database(env.DB_PATH);
export default drizzle(sqlite);
