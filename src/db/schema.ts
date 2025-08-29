import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const stooqPrice = sqliteTable("stooq_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  period: text("period").notNull(),
  tradeDate: text("trade_date").notNull(),
  tradeTime: text("trade_time"),
  openPrice: real("open_price").notNull(),
  highPrice: real("high_price").notNull(),
  lowPrice: real("low_price").notNull(),
  closePrice: real("close_price").notNull(),
  volume: integer("volume").notNull(),
  openInterest: integer("open_interest"),
});
