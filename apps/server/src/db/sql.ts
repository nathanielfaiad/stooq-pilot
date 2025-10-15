import { and, eq, gte, lte } from "drizzle-orm";
import { IntDate, todayIntUTC } from "../service/dates";
import { db } from "./db";
import { stooqPrice, stooqTicker } from "./schema";
import {
  StooqPriceInsert,
  StooqPriceRow,
  StooqTickerInsert,
  StooqTickerRow,
} from "./types";
// Import the `sql` utility for raw SQL queries.
import { sql } from "drizzle-orm";

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

export async function getRecentStooqPrices(days: number) {
  const today = parseInt(
    new Date().toISOString().slice(0, 10).replace(/-/g, "")
  );
  const cutoff = today - days;
  return await db
    .select()
    .from(stooqPrice)
    .where(gte(stooqPrice.tradeDate, cutoff));
}

// Add a new function to fetch up to 500 recent prices before or at a given date.
export async function getRecentPricesBeforeDate(
  tickerId: number,
  forDate: IntDate
): Promise<StooqPriceRow[]> {
  return db
    .select()
    .from(stooqPrice)
    .where(
      and(eq(stooqPrice.tickerId, tickerId), lte(stooqPrice.tradeDate, forDate))
    )
    .orderBy(sql`${stooqPrice.tradeDate} DESC`)
    .limit(500);
}

export async function insertStooqTicker(entry: StooqTickerInsert) {
  console.log("Inserting stooqTicker:", entry);
  const result = await db
    .insert(stooqTicker)
    .values(entry)
    .returning({ id: stooqTicker.id });
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
  return true;
}

export async function getAllStooqPrices(limit = 50) {
  return await db.select().from(stooqPrice).limit(limit);
}

export async function getTickers(): Promise<StooqTickerRow[]> {
  const rows = await db
    .select()
    .from(stooqTicker)
    .where(eq(stooqTicker.assetType, "STOCK"));
  return rows;
}

export async function getTickerBySymbol(
  ticker: string
): Promise<StooqTickerRow | null> {
  const rows = await db
    .select()
    .from(stooqTicker)
    .where(eq(stooqTicker.ticker, ticker))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTickerPricesBySymbol(
  ticker: string,
  from: IntDate,
  to: IntDate = todayIntUTC()
): Promise<StooqPriceRow[]> {
  const t = await getTickerBySymbol(ticker);
  if (!t) return [];
  return getTickerPrices(t.id, from, to);
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
