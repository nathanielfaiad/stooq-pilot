import type { Config } from "drizzle-kit";
import path from "path";

const DRIZZLE_BASE = "./src/db";

export default {
  schema: path.join(DRIZZLE_BASE, "schema.ts"),
  out: path.join(DRIZZLE_BASE, "migrations"),
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(DRIZZLE_BASE, "stooq_data.db"),
  },
} satisfies Config;
