import { Request, Response, Router } from "express";
import {
  getTickerBySymbol,
  insertStooqPricesBulk,
  insertStooqTicker,
} from "../db/sql";
import { StooqPriceInsert } from "../db/types";

const router = Router();

interface DailyRowPayload {
  ticker: string;
  tradeDate: number | string;
  openPrice: number | string;
  highPrice: number | string;
  lowPrice: number | string;
  closePrice: number | string;
  volume: number | string;
}

router.post("/daily", async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as {
      rows?: DailyRowPayload[];
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows must be a non-empty array" });
    }

    const dedupedRows: Array<DailyRowPayload & { ticker: string; line: number }> = [];
    const seenKeys = new Set<string>();
    let duplicateCount = 0;
    const invalidRows: { line: number; reason: string }[] = [];

    rows.forEach((row, index) => {
      const line = index + 1;
      if (!row) {
        invalidRows.push({ line, reason: "Row is empty" });
        return;
      }
      const ticker =
        typeof row.ticker === "string" ? row.ticker.trim() : String(row.ticker ?? "").trim();
      const tradeDate = Number(row.tradeDate);
      const openPrice = Number(row.openPrice);
      const highPrice = Number(row.highPrice);
      const lowPrice = Number(row.lowPrice);
      const closePrice = Number(row.closePrice);
      const volume = Number(row.volume ?? 0);

      if (!ticker) {
        invalidRows.push({ line, reason: "Missing ticker symbol" });
        return;
      }
      if (!Number.isFinite(tradeDate)) {
        invalidRows.push({ line, reason: "Invalid tradeDate" });
        return;
      }
      if (
        ![openPrice, highPrice, lowPrice, closePrice, volume].every((val) =>
          Number.isFinite(val)
        )
      ) {
        invalidRows.push({ line, reason: "Price or volume fields contain invalid numbers" });
        return;
      }

      const key = `${ticker}|${tradeDate}`;
      if (seenKeys.has(key)) {
        duplicateCount += 1;
        return;
      }
      seenKeys.add(key);
      dedupedRows.push({
        ticker,
        tradeDate,
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        volume,
        line,
      });
    });

    if (dedupedRows.length === 0) {
      return res.status(400).json({
        error: "No valid rows to process",
        summary: {
          processed: rows.length,
          duplicatesInFile: duplicateCount,
          invalidRows,
        },
      });
    }

    const tickerIdMap = new Map<string, number>();
    const priceEntries: StooqPriceInsert[] = [];
    let tickerFailures = 0;

    for (const row of dedupedRows) {
      let tickerId = tickerIdMap.get(row.ticker);
      if (!tickerId) {
        const existing = await getTickerBySymbol(row.ticker);
        if (existing) {
          tickerId = existing.id;
        } else {
          try {
            tickerId = await insertStooqTicker({
              ticker: row.ticker,
              exchange: "UNKNOWN",
              assetType: "UNKNOWN",
            });
          } catch (err) {
            tickerFailures += 1;
            // eslint-disable-next-line no-console
            console.warn(
              `Unable to create ticker ${row.ticker}, skipping price row`,
              err
            );
            continue;
          }
        }
        tickerIdMap.set(row.ticker, tickerId);
      }

      priceEntries.push({
        tickerId,
        tradeDate: Number(row.tradeDate),
        openPrice: Number(row.openPrice),
        highPrice: Number(row.highPrice),
        lowPrice: Number(row.lowPrice),
        closePrice: Number(row.closePrice),
        volume: Number(row.volume ?? 0),
      });
    }

    if (priceEntries.length === 0) {
      return res.status(400).json({
        error: "No price entries could be prepared",
        summary: {
          processed: rows.length,
          duplicatesInFile: duplicateCount,
          invalidRows,
          tickerFailures,
        },
      });
    }

    const insertResult = await insertStooqPricesBulk(priceEntries);
    return res.json({
      processed: rows.length,
      validRows: dedupedRows.length,
      attempted: insertResult.attempted,
      inserted: insertResult.inserted,
      duplicatesInFile: duplicateCount,
      invalidRows,
      tickerFailures,
      ignoredExisting: insertResult.attempted - insertResult.inserted,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error uploading daily prices:", err);
    return res.status(500).json({ error: "Failed to upload daily prices" });
  }
});

export default router;
