import { and, eq, lte } from "drizzle-orm";

export async function getTickersFiltered(options?: {
  exchange?: string;
  assetType?: string;
}) {
  let whereClause = undefined;
  if (options?.exchange && options?.assetType) {
    whereClause = and(
      eq(stooqTicker.exchange, options.exchange),
      eq(stooqTicker.assetType, options.assetType)
    );
  } else if (options?.exchange) {
    whereClause = eq(stooqTicker.exchange, options.exchange);
  } else if (options?.assetType) {
    whereClause = eq(stooqTicker.assetType, options.assetType);
  }
  const query = db.select().from(stooqTicker);
  return whereClause ? query.where(whereClause) : query;
}
// Get all records from the last N days (assuming tradeDate is yyyymmdd integer)
import { db } from "@src/db/db";
import { stooqPrice, stooqTicker } from "@src/db/schema";
import {
  StooqPriceInsert,
  StooqPriceRow,
  StooqTickerInsert,
  StooqTickerRow,
} from "@src/db/types";
import { IntDate, todayIntUTC } from "@src/service/dates";
import { gte } from "drizzle-orm";

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

// // Get all records for a given ticker
// export async function getStooqPricesByTicker(ticker: string) {
//   return await db
//     .select()
//     .from(stooqPrice)
//     .where(eq(stooqPrice.ticker, ticker));
// }

// // Get all records for a given ticker in a date range
// export async function getStooqPricesByTickerAndDateRange(
//   ticker: string,
//   startDate: number,
//   endDate: number
// ) {
//   return await db
//     .select()
//     .from(stooqPrice)
//     .where(
//       and(
//         eq(stooqPrice.ticker, ticker),
//         gte(stooqPrice.tradeDate, startDate),
//         lte(stooqPrice.tradeDate, endDate)
//       )
//     );
// }

export async function insertStooqTicker(entry: StooqTickerInsert) {
  console.log("Inserting stooqTicker:", entry);
  const result = await db
    .insert(stooqTicker)
    .values(entry)
    .returning({ id: stooqTicker.id });
  // result is an array of inserted rows; return the first id
  return result[0]?.id;
}

export async function insertStooqPrice(entry: StooqPriceInsert) {
  console.log("Inserting stooqPrice:", entry);
  await db.insert(stooqPrice).values(entry);
  return true;
}

export async function insertStooqPricesBulk(
  entries: StooqPriceInsert[],
  batchSize = 3000
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

export async function getTickers(): Promise<
  Omit<StooqTickerRow, "exchange" | "assetType">[]
> {
  const rows = await db
    .select({ tickerId: stooqTicker.id, ticker: stooqTicker.ticker })
    .from(stooqTicker)
    .where(eq(stooqTicker.assetType, "STOCK"));
  return rows.map((r) => {
    return { id: r.tickerId, ticker: r.ticker };
  });
}

export async function getTickerPrices(
  tickerId: number,
  from: IntDate,
  to: IntDate = todayIntUTC()
): Promise<StooqPriceRow[]> {
  return db
    .select()
    .from(stooqPrice)
    .where(
      and(
        eq(stooqPrice.tickerId, tickerId),
        gte(stooqPrice.tradeDate, from),
        lte(stooqPrice.tradeDate, to)
      )
    );
}
