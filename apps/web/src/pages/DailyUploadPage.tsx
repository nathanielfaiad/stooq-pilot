import React from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

interface ParsedDailyRow {
  line: number;
  ticker: string;
  per: string;
  tradeDate: number;
  time: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  raw: string;
}

interface ParseResult {
  rows: ParsedDailyRow[];
  duplicates: number;
  errors: string[];
}

interface UploadSummary {
  processed: number;
  validRows: number;
  attempted: number;
  inserted: number;
  duplicatesInFile: number;
  ignoredExisting: number;
  tickerFailures: number;
  invalidRows: Array<{ line: number; reason: string }>;
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function parseDailyFileContents(contents: string): ParseResult {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], duplicates: 0, errors: ["File is empty"] };
  }

  const hasHeader =
    lines[0].startsWith("<TICKER>") || lines[0].toLowerCase().includes("ticker");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const baseLine = hasHeader ? 2 : 1;

  const errors: string[] = [];
  const rows: ParsedDailyRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  dataLines.forEach((line, idx) => {
    const lineNumber = idx + baseLine;
    const parts = line.split(",");
    if (parts.length < 9) {
      errors.push(`Line ${lineNumber}: expected 9 columns, received ${parts.length}`);
      return;
    }

    const ticker = parts[0]?.trim();
    const per = parts[1]?.trim();
    const tradeDate = Number(parts[2]);
    const time = (parts[3] ?? "").trim();
    const openPrice = Number(parts[4]);
    const highPrice = Number(parts[5]);
    const lowPrice = Number(parts[6]);
    const closePrice = Number(parts[7]);
    const volume = Number(parts[8] ?? 0);

    if (!ticker) {
      errors.push(`Line ${lineNumber}: missing ticker symbol`);
      return;
    }

    if (!Number.isFinite(tradeDate)) {
      errors.push(`Line ${lineNumber}: invalid trade date "${parts[2]}"`);
      return;
    }

    if (!Number.isFinite(openPrice) || !Number.isFinite(highPrice) || !Number.isFinite(lowPrice) || !Number.isFinite(closePrice)) {
      errors.push(`Line ${lineNumber}: invalid pricing fields`);
      return;
    }

    if (!Number.isFinite(volume)) {
      errors.push(`Line ${lineNumber}: invalid volume value "${parts[8]}"`);
      return;
    }

    const key = `${ticker}|${tradeDate}`;
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);

    rows.push({
      line: lineNumber,
      ticker,
      per,
      tradeDate,
      time,
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      volume,
      raw: line,
    });
  });

  return { rows, duplicates, errors };
}

export default function DailyUploadPage() {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedDailyRow[]>([]);
  const [parseErrors, setParseErrors] = React.useState<string[]>([]);
  const [duplicatesInFile, setDuplicatesInFile] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [uploadSummary, setUploadSummary] = React.useState<UploadSummary | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const previewRows = React.useMemo(
    () => parsedRows.slice(0, 10),
    [parsedRows]
  );

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setUploadSummary(null);
      setUploadError(null);
      if (!file) {
        setFileName(null);
        setParsedRows([]);
        setParseErrors([]);
        setDuplicatesInFile(0);
        event.target.value = "";
        return;
      }

      try {
        const text = await file.text();
        const result = parseDailyFileContents(text);
        setFileName(file.name);
        setParsedRows(result.rows);
        setParseErrors(result.errors);
        setDuplicatesInFile(result.duplicates);
      } catch (err: any) {
        setFileName(file.name);
        setParsedRows([]);
        setParseErrors([err?.message ?? "Failed to read file"]);
        setDuplicatesInFile(0);
      }
      event.target.value = "";
    },
    []
  );

  const resetState = React.useCallback(() => {
    setFileName(null);
    setParsedRows([]);
    setParseErrors([]);
    setDuplicatesInFile(0);
    setUploadSummary(null);
    setUploadError(null);
  }, []);

  const handleUpload = React.useCallback(async () => {
    if (parsedRows.length === 0) {
      setUploadError("No parsed rows found. Choose a file first.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSummary(null);
    try {
      const payload = {
        rows: parsedRows.map((row) => ({
          ticker: row.ticker,
          tradeDate: row.tradeDate,
          openPrice: row.openPrice,
          highPrice: row.highPrice,
          lowPrice: row.lowPrice,
          closePrice: row.closePrice,
          volume: row.volume,
        })),
      };
      const response = await fetch("/api/prices/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          setUploadError(json.error || "Upload failed");
        } catch {
          setUploadError(text || "Upload failed");
        }
        return;
      }
      const summary = (await response.json()) as UploadSummary;
      setUploadSummary(summary);
    } catch (err: any) {
      setUploadError(err?.message ?? "Unexpected error during upload");
    } finally {
      setUploading(false);
    }
  }, [parsedRows]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Daily Price Upload
      </Typography>
      <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Source file
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button variant="outlined" component="label">
              Select file
              <input
                hidden
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
              />
            </Button>
            {fileName && (
              <Typography variant="body2" color="text.secondary">
                {fileName}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider />

        {parseErrors.length > 0 && (
          <Alert severity="warning">
            {parseErrors.slice(0, 5).map((message, index) => (
              <div key={index}>{message}</div>
            ))}
            {parseErrors.length > 5 && (
              <div>…and {parseErrors.length - 5} more</div>
            )}
          </Alert>
        )}

        {parsedRows.length > 0 && (
          <Alert severity="info">
            Parsed {parsedRows.length} unique rows
            {duplicatesInFile > 0 && (
              <> — skipped {duplicatesInFile} duplicate row(s) found in the file</>
            )}
          </Alert>
        )}

        {uploadSummary && (
          <Alert severity="success">
            Imported {uploadSummary.inserted} new records (attempted {uploadSummary.attempted}).
            {uploadSummary.ignoredExisting > 0 && (
              <> {uploadSummary.ignoredExisting} record(s) already existed and were ignored.</>
            )}
            {uploadSummary.tickerFailures > 0 && (
              <> {uploadSummary.tickerFailures} ticker(s) could not be created.</>
            )}
          </Alert>
        )}

        {uploadSummary && uploadSummary.invalidRows.length > 0 && (
          <Alert severity="warning">
            Skipped {uploadSummary.invalidRows.length} invalid row(s) reported by the server.
            <Box component="span" sx={{ display: "block", mt: 1 }}>
              {uploadSummary.invalidRows.slice(0, 5).map((item, index) => (
                <div key={`${item.line}-${index}`}>
                  Line {item.line}: {item.reason}
                </div>
              ))}
              {uploadSummary.invalidRows.length > 5 && (
                <div>…and {uploadSummary.invalidRows.length - 5} more</div>
              )}
            </Box>
          </Alert>
        )}

        {uploadError && <Alert severity="error">{uploadError}</Alert>}

        {parsedRows.length > 0 && (
          <>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload to database"}
              </Button>
              <Button variant="text" onClick={resetState} disabled={uploading}>
                Reset
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Preview (first {previewRows.length} rows)
              </Typography>
              <Paper variant="outlined" sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Line</TableCell>
                      <TableCell>Ticker</TableCell>
                      <TableCell>PER</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Open</TableCell>
                      <TableCell>High</TableCell>
                      <TableCell>Low</TableCell>
                      <TableCell>Close</TableCell>
                      <TableCell>Volume</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow key={`${row.ticker}-${row.tradeDate}`}>
                        <TableCell>{row.line}</TableCell>
                        <TableCell>{row.ticker}</TableCell>
                        <TableCell>{row.per}</TableCell>
                        <TableCell>{row.tradeDate}</TableCell>
                        <TableCell>{numberFormatter.format(row.openPrice)}</TableCell>
                        <TableCell>{numberFormatter.format(row.highPrice)}</TableCell>
                        <TableCell>{numberFormatter.format(row.lowPrice)}</TableCell>
                        <TableCell>{numberFormatter.format(row.closePrice)}</TableCell>
                        <TableCell>{volumeFormatter.format(row.volume)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
