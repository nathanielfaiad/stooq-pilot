// Get all records from the last N days (assuming tradeDate is yyyymmdd integer)
import { StooqPriceInsert } from "@src/db/types";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { stooqPrice } from "./schema";

export async function getRecentStooqPrices(days: number) {
  // Get today's date in yyyymmdd format
  const today = parseInt(
    new Date().toISOString().slice(0, 10).replace(/-/g, "")
  );
  const cutoff = today - days;
  return await db
    .select()
    .from(stooqPrice)
    .where(gte(stooqPrice.tradeDate, cutoff));
}

// Get all records for a given ticker
export async function getStooqPricesByTicker(ticker: string) {
  return await db
    .select()
    .from(stooqPrice)
    .where(eq(stooqPrice.ticker, ticker));
}

// Get all records for a given ticker in a date range
export async function getStooqPricesByTickerAndDateRange(
  ticker: string,
  startDate: number,
  endDate: number
) {
  return await db
    .select()
    .from(stooqPrice)
    .where(
      and(
        eq(stooqPrice.ticker, ticker),
        gte(stooqPrice.tradeDate, startDate),
        lte(stooqPrice.tradeDate, endDate)
      )
    );
}

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
