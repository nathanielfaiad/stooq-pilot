import { Request, Response, Router } from "express";
import { getTickers, getTickersFiltered } from "../db/sql";

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

export default router;
