import fs from "fs";
import path from "path";
import { insertStooqPricesBulk, insertStooqTicker } from "../src/db/sql";
import { StooqPriceInsert } from "../src/db/types";

type DataDirConfig = {
  dir: string; // relative to __dirname
  exchange: string;
};

// Map of directories to process. Each entry contains the directory (relative to this file)
// and the exchange value that should be used when inserting tickers.
const DATA_DIRS: DataDirConfig[] = [
  { dir: "data/daily/us/nasdaq stocks", exchange: "NASDAQ" },
  { dir: "data/daily/us/nyse stocks", exchange: "NYSE" },
  { dir: "data/daily/us/nysemkt stocks", exchange: "NYSE_American" },
];

function parseTxtFile(filepath: string): string[][] {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  // Example: parse CSV-like lines, skip empty lines
  return lines
    .filter((line) => line.trim())
    .map((line) => line.trim().split(","));
}

function getAllTxtFiles(rootDir: string): string[] {
  let txtFiles: string[] = [];
  function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith(".txt")) {
        txtFiles.push(fullPath);
      }
    }
  }
  walk(rootDir);
  return txtFiles;
}

async function insertDataToDbBulk(tickerId: number, rows: string[][]) {
  if (rows.length === 0) return;
  // Skip header row
  const entries: StooqPriceInsert[] = [];
  for (const row of rows.slice(1)) {
    // Only include US tickers
    if (row[0].endsWith(".US")) {
      // Map row to StooqPriceInsert
      const entry: StooqPriceInsert = {
        tickerId: tickerId,
        tradeDate: parseInt(row[2]),
        openPrice: parseFloat(row[4]),
        highPrice: parseFloat(row[5]),
        lowPrice: parseFloat(row[6]),
        closePrice: parseFloat(row[7]),
        volume: parseInt(row[8]),
      };
      entries.push(entry);
    }
  }

  if (entries.length === 0) return;
  console.log(
    `Inserted ${entries.length} stooqPrices for tickerId ${tickerId}`
  );
  await insertStooqPricesBulk(entries);
}

async function main() {
  for (const cfg of DATA_DIRS) {
    const fullDir = path.join(__dirname, cfg.dir);
    if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) {
      console.warn(
        `Directory not found or not a directory: ${fullDir}. Skipping.`
      );
      continue;
    }

    const txtFiles = getAllTxtFiles(fullDir);
    console.log(`Found ${txtFiles.length} .txt files in ${fullDir}`);

    for (const txtFile of txtFiles) {
      console.log(`Processing ${txtFile} (exchange=${cfg.exchange})`);
      const rows = parseTxtFile(txtFile);
      // Extract ticker from filename
      const tickerFile = path.basename(txtFile, ".txt");
      const ticker = tickerFile.split(".")[0];
      const exchange = cfg.exchange;
      const assetType = "STOCK";

      // Insert ticker and get ID
      const tickerId = await insertStooqTicker({
        ticker,
        exchange,
        assetType,
      });

      await insertDataToDbBulk(tickerId, rows);
    }
  }
}

main();
