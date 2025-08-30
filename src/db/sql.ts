import { StooqPriceInsert } from "@src/db/types";
import { db } from "./db";
import { stooqPrice } from "./schema";

export async function insertStooqPrice(entry: StooqPriceInsert) {
  console.log("Inserting stooqPrice:", entry);
  await db.insert(stooqPrice).values(entry);
  return true;
}

export async function insertStooqPricesBulk(
  ticker: string,
  entries: StooqPriceInsert[],
  batchSize = 1000
) {
  console.log(`Inserting ${batchSize} stooqPrices for ${ticker}`);
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await db.insert(stooqPrice).values(batch);
  }
  return true;
}

export async function getAllStooqPrices(limit = 50) {
  return await db
    .select()
    .from(stooqPrice)
    // .orderBy(stooqPrice.entryDeadline)
    .limit(limit);
}
