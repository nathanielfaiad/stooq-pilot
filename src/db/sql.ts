import { StooqPriceInsert } from "@src/db/types";
import { db } from "./db";
import { stooqPrice } from "./schema";

export async function insertStooqPrice(entry: StooqPriceInsert) {
  console.log("Inserting stooqPrice:", entry);
  await db.insert(stooqPrice).values(entry);
  return true;
}

export async function insertStooqPricesBulk(
  entries: StooqPriceInsert[],
  batchSize = 1000
) {
  console.log(`Batch inserting ${batchSize} stooqPrices`);
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await db.insert(stooqPrice).values(batch);
  }

  // POC - inserting one by one
  // for (let i = 0; i < entries.length; i++) {
  //   console.log(`Inserting ticker ${entries[i].ticker}`);
  //   await db.insert(stooqPrice).values(entries[i]);
  // }
  return true;
}

export async function getAllStooqPrices(limit = 50) {
  return await db
    .select()
    .from(stooqPrice)
    // .orderBy(stooqPrice.entryDeadline)
    .limit(limit);
}
