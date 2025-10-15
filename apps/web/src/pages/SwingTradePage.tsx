import React from "react";
import { useSearchParams } from "react-router-dom";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

function formatDateInputToInt(s: string): string | null {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  return `${parts[0]}${parts[1].padStart(2, "0")}${parts[2].padStart(2, "0")}`;
}

export default function SwingTradePage() {
  const [params, setParams] = useSearchParams();
  const symbol = params.get("symbol") || "AAPL";

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [forDate, setForDate] = React.useState<string | null>(null);
  const [preset, setPreset] = React.useState<string>("balanced");
  const [debug, setDebug] = React.useState<boolean>(false);

  // Helper: normalize different possible response shapes into an array of results
  function getResultsFromData(d: any): Array<any> {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (d.results && Array.isArray(d.results)) return d.results;
    if (d.data && Array.isArray(d.data)) return d.data;
    if (d.payload && Array.isArray(d.payload)) return d.payload;
    return [];
  }

  React.useEffect(() => {
    // auto-fetch a single-symbol scan when the symbol/preset/debug changes
    let mounted = true;
    async function fetchScan() {
      try {
        console.log("Starting fetch scan");
        setLoading(true);
        setError(null);
        const qp = new URLSearchParams();
        qp.set("symbol", symbol);
        qp.set("preset", preset);
        if (debug) qp.set("debug", "true");
        const res = await fetch(`/api/tickers/scan?${qp.toString()}`);
        if (!mounted) return;
        if (!res.ok) {
          const txt = await res.text();
          console.log("Fetch failed with status", res.status, txt);
          setError(txt || "Scan failed");
          setLoading(false);
          return;
        }
        const json = await res.json();
        console.log("Fetch succeeded, data:", json);
        setData(json);
      } catch (err: any) {
        console.log("Fetch error:", err);
        setError(err?.message ?? String(err));
      } finally {
        console.log("Fetch finally, setting loading false");
        setLoading(false);
      }
    }
    fetchScan();
    return () => {
      mounted = false;
    };
  }, [symbol, preset, debug]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Swing Trade Scan: {symbol}
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="preset-label">Preset</InputLabel>
            <Select
              labelId="preset-label"
              value={preset}
              label="Preset"
              onChange={(e) =>
                setPreset(String((e.target as HTMLInputElement).value))
              }
              size="small"
            >
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="aggressive">Aggressive</MenuItem>
              <MenuItem value="balanced">Balanced</MenuItem>
              <MenuItem value="conservative">Conservative</MenuItem>
              <MenuItem value="debug">Debug (very loose)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="For date"
            type="date"
            value={
              forDate
                ? `${forDate.slice(0, 4)}-${forDate.slice(
                    4,
                    6
                  )}-${forDate.slice(6, 8)}`
                : ""
            }
            onChange={(e) =>
              setForDate(
                formatDateInputToInt((e.target as HTMLInputElement).value)
              )
            }
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <FormControlLabel
            control={
              <Switch
                checked={debug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDebug(e.target.checked)
                }
              />
            }
            label="Debug output"
          />

          <Button
            variant="contained"
            onClick={async () => {
              if (!forDate) return setError("Select a date first");
              setLoading(true);
              setError(null);
              try {
                let url = `/api/tickers/scan/date?forDate=${forDate}&preset=${encodeURIComponent(
                  preset
                )}`;
                if (debug) url += `&debug=true`;
                const res = await fetch(url);
                if (!res.ok) {
                  const txt = await res.text();
                  setError(txt || "Scan failed");
                  setLoading(false);
                  return;
                }
                const json = await res.json();
                setData(json);
                setParams((p) => {
                  const np = new URLSearchParams(p);
                  if (debug) np.set("debug", "true");
                  else np.delete("debug");
                  return np;
                });
              } catch (err: any) {
                setError(err?.message ?? String(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            Scan date
          </Button>
        </Box>

        {loading && <div>Loading...</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}

        {data !== null &&
          (() => {
            const results = getResultsFromData(data);
            const total = results.length;
            const passed = results.filter((r) => Boolean(r.passed));
            const failed = results.filter((r) => !r.passed);
            const passRate = total === 0 ? 0 : (passed.length / total) * 100;
            const failRate = total === 0 ? 0 : (failed.length / total) * 100;

            const reasonCounts: Record<string, number> = {};
            failed.forEach((it: any) => {
              const reasons = Array.isArray(it.reasons)
                ? it.reasons
                : it.reason
                ? [String(it.reason)]
                : [];
              if (!reasons.length) {
                reasonCounts["No reasons provided"] =
                  (reasonCounts["No reasons provided"] ?? 0) + 1;
                return;
              }
              reasons.forEach((reason: string) => {
                const key = String(reason);
                reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
              });
            });
            const reasonEntries = Object.entries(reasonCounts).sort(
              (a, b) => b[1] - a[1]
            );
            return (
              <>
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 180 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total results
                      </Typography>
                      <Typography variant="h5">{total}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 180 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Passed
                      </Typography>
                      <Typography variant="h5">{passed.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {passRate.toFixed(1)}%
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 180 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Failed
                      </Typography>
                      <Typography variant="h5">{failed.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {failRate.toFixed(1)}%
                      </Typography>
                    </Paper>
                  </Box>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Failure reason breakdown
                    </Typography>
                    {reasonEntries.length === 0 ? (
                      <Typography color="text.secondary">
                        All tickers passed the filters.
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {reasonEntries.map(([reason, count]) => (
                          <Box
                            key={reason}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body2">{reason}</Typography>
                            <Chip label={count} size="small" />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>

                  {total === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      No results returned from the server.{" "}
                      {debug
                        ? "Debug mode is on — check server debug output for reasons."
                        : 'Try the "Debug (very loose)" preset and enable Debug output.'}
                    </Typography>
                  )}
                </Box>
              </>
            );
          })()}
      </Paper>
    </Box>
  );
}
