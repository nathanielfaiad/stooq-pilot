import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const sqlite = new Database(path.resolve(__dirname, "stooq_data.db"));
export const db = drizzle(sqlite, { schema });
