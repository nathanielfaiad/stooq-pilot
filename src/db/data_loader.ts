import fs from "fs";
import path from "path";
import { insertStooqPricesBulk, insertStooqTicker } from "./sql";
import { StooqPriceInsert } from "./types";

const DATA_DIR = path.join(__dirname, "data/daily/us/nysemkt stocks");
const DB_PATH = path.join(__dirname, "stooq_data.db");

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
  const txtFiles = getAllTxtFiles(DATA_DIR);
  console.log(`Found ${txtFiles.length} .txt files in ${DATA_DIR}`);
  for (const txtFile of txtFiles) {
    console.log(`Processing ${txtFile}`);
    const rows = parseTxtFile(txtFile);
    // Extract ticker and period from path, adjust as needed
    const parts = txtFile.split(path.sep);
    const tickerFile = path.basename(txtFile, ".txt");
    const ticker = tickerFile.split(".")[0];
    const exchange = "NYSE_American";
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

main();
