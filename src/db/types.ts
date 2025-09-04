import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { stooqPrice, stooqTicker } from "./schema";

export type StooqTickerRow = InferSelectModel<typeof stooqTicker>;
export type StooqTickerInsert = InferInsertModel<typeof stooqTicker>;

export type StooqPriceRow = InferSelectModel<typeof stooqPrice>;
export type StooqPriceInsert = InferInsertModel<typeof stooqPrice>;
