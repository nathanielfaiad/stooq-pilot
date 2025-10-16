import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";

interface TickerTableProps {
  tickers?: any[];
  error?: any;
  isLoading?: boolean;
}

export default function TickerTable({
  tickers,
  error,
  isLoading,
}: TickerTableProps) {
  const [filterTicker, setFilterTicker] = useState("");
  const [filterExchange, setFilterExchange] = useState("");

  const filtered = useMemo(() => {
    if (!tickers) return [];
    const ft = filterTicker.trim().toLowerCase();
    const fe = filterExchange.trim().toLowerCase();
    return tickers.filter((t) => {
      // guard against missing fields by coercing to empty string
      const tickerStr = (t.ticker ?? "").toString().toLowerCase();
      const exchangeStr = (t.exchange ?? "").toString().toLowerCase();
      return tickerStr.includes(ft) && exchangeStr.includes(fe);
    });
  }, [tickers, filterTicker, filterExchange]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ color: "error.main", py: 6 }}>Error loading tickers.</Box>
    );
  }
  if (!tickers) return null;

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Filter ticker"
          value={filterTicker}
          onChange={(e) => setFilterTicker(e.target.value)}
          size="small"
        />
        <TextField
          label="Filter exchange"
          value={filterExchange}
          onChange={(e) => setFilterExchange(e.target.value)}
          size="small"
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticker</TableCell>
              <TableCell>Exchange</TableCell>
              <TableCell>Asset Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.ticker}</TableCell>
                <TableCell>{t.exchange}</TableCell>
                <TableCell>{t.assetType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
