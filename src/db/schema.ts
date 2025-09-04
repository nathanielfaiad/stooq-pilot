import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const stooqTicker = sqliteTable("stooq_ticker", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(), // e.g. "AAPL"
  exchange: text("exchange").notNull(), // e.g. "NASDAQ"
  assetType: text("asset_type").notNull(), // e.g. "stock" | "etf" | "adr"
});

export const stooqPrice = sqliteTable("stooq_price", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tickerId: integer("ticker_id")
    .notNull()
    .references(() => stooqTicker.id, { onDelete: "cascade" }),
  tradeDate: integer("trade_date").notNull(),
  openPrice: real("open_price").notNull(),
  highPrice: real("high_price").notNull(),
  lowPrice: real("low_price").notNull(),
  closePrice: real("close_price").notNull(),
  volume: integer("volume").notNull(),
});
