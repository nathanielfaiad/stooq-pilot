import cors from "cors";
import express from "express";
import tickersRouter from "./routes/tickers";
import pricesRouter from "./routes/prices";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/tickers", tickersRouter);
app.use("/api/prices", pricesRouter);

app.get("/_health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
