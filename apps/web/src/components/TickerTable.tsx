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
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchTickers } from "../store/tickersSlice";

export default function TickerTable() {
  const dispatch = useDispatch<AppDispatch>();
  const tickersState = useSelector((s: RootState) => s.tickers);
  const tickers = tickersState.items;
  const [filterTicker, setFilterTicker] = useState("");
  const [filterExchange, setFilterExchange] = useState("");

  useEffect(() => {
    dispatch(fetchTickers());
  }, [dispatch]);

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

  if (!tickers) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

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
