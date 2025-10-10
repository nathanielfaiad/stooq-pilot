import cors from "cors";
import express from "express";
import tickersRouter from "./routes/tickers";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/tickers", tickersRouter);

app.get("/_health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
