import { Request, Response, Router } from "express";
import { getTickers, getTickersFiltered } from "../db/sql";
import { todayIntUTC } from "../service/dates";
import { analyzeSwing, scanTickersForDate } from "../service/swingEntry";

const router = Router();

// GET /api/tickers
// Optional query params: exchange, assetType
router.get("/", async (req: Request, res: Response) => {
  try {
    const { exchange, assetType } = req.query as {
      exchange?: string;
      assetType?: string;
    };
    if (exchange || assetType) {
      const rows = await getTickersFiltered({ exchange, assetType });
      return res.json(rows);
    }

    const rows = await getTickers();
    return res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching tickers", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tickers/scan?symbol=SYMBOL&from=YYYYMMDD&to=YYYYMMDD&preset=balanced
router.get("/scan", async (req: Request, res: Response) => {
  try {
    const { symbol, from, to, preset } = req.query as {
      symbol?: string;
      from?: string;
      to?: string;
      preset?: string;
    };

    if (!symbol) {
      return res
        .status(400)
        .json({ error: "Missing required query param: symbol" });
    }

    const fromInt = from ? parseInt(from, 10) : todayIntUTC();
    const toInt = to ? parseInt(to, 10) : todayIntUTC();
    const presetName = (preset as any) || "balanced";

    const signals = await analyzeSwing(
      symbol,
      fromInt,
      toInt,
      presetName as any
    );
    return res.json({
      symbol,
      from: fromInt,
      to: toInt,
      preset: presetName,
      signals,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error running scan", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tickers/scan/date?forDate=YYYYMMDD&preset=balanced
router.get("/scan/date", async (req: Request, res: Response) => {
  try {
    const {
      forDate: forDateStr,
      preset,
      debug,
    } = req.query as {
      forDate?: string;
      preset?: string;
      debug?: string | undefined;
    };
    if (!forDateStr) {
      return res.status(400).json({ error: "Missing forDate" });
    }
    const forInt = parseInt(forDateStr, 10);

    const debugFlag = debug === "true";
    const results = await scanTickersForDate(
      forInt,
      preset as any,
      undefined,
      debugFlag
    );
    return res.json({ forDate: forInt, preset: preset, results });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error running date scan", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
