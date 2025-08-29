import { StooqPriceInsert } from "@src/db/types";
import { db } from "./db";
import { stooqPrice } from "./schema";

export async function insertSweepstakes(entry: StooqPriceInsert) {
  console.log("Inserting stooqPrice:", entry);
  await db.insert(stooqPrice).values(entry);
  return true;
}

export async function getAllStooqPrices(limit = 50) {
  return await db
    .select()
    .from(stooqPrice)
    // .orderBy(stooqPrice.entryDeadline)
    .limit(limit);
}
