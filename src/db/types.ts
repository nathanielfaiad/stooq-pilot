import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { stooqPrice } from "./schema";

export type StooqPriceRow = InferSelectModel<typeof stooqPrice>;
export type StooqPriceInsert = InferInsertModel<typeof stooqPrice>;
