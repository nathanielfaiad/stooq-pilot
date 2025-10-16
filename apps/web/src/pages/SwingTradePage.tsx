import React from "react";
import { useSearchParams } from "react-router-dom";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButtonSwitch from "../components/common/ToggleButtonSwitch";

type PresetName =
  | "manual"
  | "aggressive"
  | "balanced"
  | "conservative"
  | "debug";
type EntryMode = "breakout" | "pullback" | "any";

interface SwingConfigValues {
  rsiMin: number;
  rsiMax: number;
  relVolMin: number;
  atrMult: number;
  maxStretchPct: number;
  nearPct50: number;
  entryMode: EntryMode;
  requireMacdAbove0: boolean;
  requirePriceAbove50: boolean;
  requireTrendAligned: boolean;
  requireEntryGate: boolean;
  allowRepeatEntries: boolean;
  cooldownBars: number;
  useMTFConfirm: boolean;
  useBaseTightness: boolean;
  useCandleQuality: boolean;
  useGapGuard: boolean;
  bbLen: number;
  bbMult: number;
}

const baseConfig: SwingConfigValues = {
  rsiMin: 45,
  rsiMax: 60,
  relVolMin: 1.8,
  atrMult: 1.5,
  maxStretchPct: 10,
  nearPct50: 8,
  entryMode: "pullback",
  requireMacdAbove0: true,
  requirePriceAbove50: true,
  requireTrendAligned: true,
  requireEntryGate: true,
  allowRepeatEntries: false,
  cooldownBars: 5,
  useMTFConfirm: true,
  useBaseTightness: true,
  useCandleQuality: true,
  useGapGuard: true,
  bbLen: 20,
  bbMult: 2,
};

const presetConfigOverrides: Record<PresetName, Partial<SwingConfigValues>> = {
  manual: {},
  debug: {
    rsiMin: 0,
    rsiMax: 100,
    relVolMin: 0,
    atrMult: 3,
    maxStretchPct: 200,
    nearPct50: 200,
    entryMode: "any",
    requirePriceAbove50: false,
    requireTrendAligned: false,
    requireEntryGate: false,
    allowRepeatEntries: true,
    cooldownBars: 0,
    useMTFConfirm: false,
    useBaseTightness: false,
    useCandleQuality: false,
    useGapGuard: false,
  },
  aggressive: {
    rsiMin: 40,
    rsiMax: 65,
    relVolMin: 1.3,
    atrMult: 1.5,
    maxStretchPct: 15,
    nearPct50: 10,
    entryMode: "breakout",
    cooldownBars: 3,
  },
  balanced: {
    rsiMin: 43,
    rsiMax: 62,
    relVolMin: 1.5,
    atrMult: 1.5,
    maxStretchPct: 12,
    nearPct50: 8,
    entryMode: "breakout",
    cooldownBars: 4,
  },
  conservative: {
    rsiMin: 45,
    rsiMax: 60,
    relVolMin: 1.8,
    atrMult: 1.5,
    maxStretchPct: 10,
    nearPct50: 6,
    entryMode: "pullback",
    cooldownBars: 5,
  },
};

type ConfigFieldType = "number" | "integer" | "boolean" | "select";

interface ConfigFieldDefinition {
  key: keyof SwingConfigValues;
  label: string;
  type: ConfigFieldType;
}

const configFieldDefinitions: ConfigFieldDefinition[] = [
  { key: "rsiMin", label: "RSI Min", type: "number" },
  { key: "rsiMax", label: "RSI Max", type: "number" },
  { key: "relVolMin", label: "Relative Volume Min", type: "number" },
  { key: "atrMult", label: "ATR Multiplier", type: "number" },
  { key: "maxStretchPct", label: "Max Stretch %", type: "number" },
  { key: "nearPct50", label: "Near 50SMA %", type: "number" },
  { key: "entryMode", label: "Entry Mode", type: "select" },
  { key: "requireMacdAbove0", label: "Require MACD > 0", type: "boolean" },
  {
    key: "requirePriceAbove50",
    label: "Require Price > SMA50",
    type: "boolean",
  },
  {
    key: "requireTrendAligned",
    label: "Require SMA50 > SMA200",
    type: "boolean",
  },
  { key: "requireEntryGate", label: "Require Entry Gate", type: "boolean" },
  { key: "allowRepeatEntries", label: "Allow Repeat Entries", type: "boolean" },
  { key: "cooldownBars", label: "Cooldown Bars", type: "integer" },
  { key: "useMTFConfirm", label: "Use MTF Confirm", type: "boolean" },
  { key: "useBaseTightness", label: "Use Base Tightness", type: "boolean" },
  { key: "useCandleQuality", label: "Use Candle Quality", type: "boolean" },
  { key: "useGapGuard", label: "Use Gap Guard", type: "boolean" },
  { key: "bbLen", label: "BB Length", type: "integer" },
  { key: "bbMult", label: "BB Multiplier", type: "number" },
];

const entryModeOptions: { value: EntryMode; label: string }[] = [
  { value: "breakout", label: "Breakout" },
  { value: "pullback", label: "Pullback" },
  { value: "any", label: "Breakout or Pullback" },
];

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});
const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatDateInputToInt(s: string): string | null {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  return `${parts[0]}${parts[1].padStart(2, "0")}${parts[2].padStart(2, "0")}`;
}

function formatIntDateToDisplay(value: number | string | undefined): string {
  if (!value) return "—";
  const str = String(value);
  if (str.length !== 8) return str;
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

function diffFromBase(config: SwingConfigValues): Partial<SwingConfigValues> {
  return configFieldDefinitions.reduce<Partial<SwingConfigValues>>(
    (acc, field) => {
      const key = field.key;
      const value = config[key];
      if (!Object.is(value, baseConfig[key])) {
        return { ...acc, [key]: value };
      }
      return acc;
    },
    {}
  );
}

function formatConfigValue(
  field: ConfigFieldDefinition,
  value: SwingConfigValues[keyof SwingConfigValues]
): string {
  if (field.type === "boolean") {
    return value ? "Yes" : "No";
  }
  if (field.type === "select") {
    const option = entryModeOptions.find((opt) => opt.value === value);
    return option ? option.label : String(value);
  }
  if (field.type === "integer") {
    return integerFormatter.format(value as number);
  }
  return numberFormatter.format(value as number);
}

export default function SwingTradePage() {
  const [params, setParams] = useSearchParams();
  const symbol = params.get("symbol") || "AAPL";

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [forDate, setForDate] = React.useState<string | null>(null);
  const [preset, setPreset] = React.useState<PresetName>("balanced");
  const [debug, setDebug] = React.useState<boolean>(false);

  const [manualConfig, setManualConfig] = React.useState<SwingConfigValues>({
    ...baseConfig,
    ...presetConfigOverrides.manual,
  });

  const manualOverrides = React.useMemo(() => {
    if (preset !== "manual") return undefined;
    const diff = diffFromBase(manualConfig);
    return Object.keys(diff).length > 0 ? diff : undefined;
  }, [preset, manualConfig]);

  const manualOverridesString = React.useMemo(() => {
    if (!manualOverrides) return "";
    return JSON.stringify(manualOverrides);
  }, [manualOverrides]);

  const hasManualOverrides = Boolean(manualOverrides);

  const resolvedConfig = React.useMemo(() => {
    const overrides = presetConfigOverrides[preset] ?? {};
    if (preset === "manual") {
      return { ...baseConfig, ...overrides, ...manualConfig };
    }
    return { ...baseConfig, ...overrides };
  }, [preset, manualConfig]);

  const getResultsFromData = React.useCallback(
    (value: any): Array<any> => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (value.results && Array.isArray(value.results)) return value.results;
      if (value.data && Array.isArray(value.data)) return value.data;
      if (value.payload && Array.isArray(value.payload)) return value.payload;
      if (value.signals && Array.isArray(value.signals)) {
        return [
          {
            symbol: value.symbol ?? symbol,
            passed: value.signals.length > 0,
            signals: value.signals,
          },
        ];
      }
      return [];
    },
    [symbol]
  );

  const results = React.useMemo(
    () => getResultsFromData(data),
    [data, getResultsFromData]
  );

  const passedResults = React.useMemo(
    () => results.filter((r) => r.passed === true),
    [results]
  );
  const failedResults = React.useMemo(
    () => results.filter((r) => r.passed === false),
    [results]
  );

  const passRate =
    results.length === 0 ? 0 : (passedResults.length / results.length) * 100;
  const failRate =
    results.length === 0 ? 0 : (failedResults.length / results.length) * 100;

  const failureReasonEntries = React.useMemo(() => {
    if (!debug) return [];
    const reasonCounts: Record<string, number> = {};
    failedResults.forEach((item) => {
      const reasons = Array.isArray(item.reasons)
        ? item.reasons
        : item.reason
        ? [String(item.reason)]
        : [];
      if (reasons.length === 0) {
        reasonCounts["No reasons provided"] =
          (reasonCounts["No reasons provided"] ?? 0) + 1;
      }
      reasons.forEach((reason: any) => {
        const key = String(reason);
        reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
      });
    });
    return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
  }, [failedResults, debug]);

  const hasSuccessfulRun =
    !loading && !error && results.length > 0 && Array.isArray(results);

  React.useEffect(() => {
    let mounted = true;
    async function fetchScan() {
      try {
        setLoading(true);
        setError(null);
        const qp = new URLSearchParams();
        qp.set("symbol", symbol);
        qp.set("preset", preset);
        if (debug) qp.set("debug", "true");
        if (hasManualOverrides) {
          qp.set("overrides", manualOverridesString);
        }
        const res = await fetch(`/api/tickers/scan?${qp.toString()}`);
        if (!mounted) return;
        if (!res.ok) {
          const txt = await res.text();
          setError(txt || "Scan failed");
          setData(null);
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? String(err));
        setData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchScan();
    return () => {
      mounted = false;
    };
  }, [symbol, preset, debug, manualOverridesString, hasManualOverrides]);

  const handleManualBooleanChange = React.useCallback(
    (key: keyof SwingConfigValues) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setManualConfig((prev) => ({
          ...prev,
          [key]: event.target.checked,
        }));
      },
    []
  );

  const handleManualNumberChange = React.useCallback(
    (key: keyof SwingConfigValues, type: ConfigFieldType) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        const baseValue = baseConfig[key] as number;
        if (raw === "") {
          setManualConfig((prev) => ({
            ...prev,
            [key]: baseValue,
          }));
          return;
        }
        const parsed = type === "integer" ? parseInt(raw, 10) : parseFloat(raw);
        setManualConfig((prev) => ({
          ...prev,
          [key]: Number.isFinite(parsed) ? parsed : baseValue,
        }));
      },
    []
  );

  const handleManualEntryModeChange = React.useCallback(
    (event: SelectChangeEvent<EntryMode>) => {
      const value = event.target.value as EntryMode;
      setManualConfig((prev) => ({
        ...prev,
        entryMode: value,
      }));
    },
    []
  );

  const runDateScan = React.useCallback(async () => {
    if (!forDate) {
      setError("Select a date first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set("forDate", forDate);
      qp.set("preset", preset);
      if (debug) qp.set("debug", "true");
      if (hasManualOverrides) {
        qp.set("overrides", manualOverridesString);
      }
      const res = await fetch(`/api/tickers/scan/date?${qp.toString()}`);
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Scan failed");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setParams((prevParams) => {
        const next = new URLSearchParams(prevParams);
        next.set("preset", preset);
        next.set("symbol", symbol);
        if (debug) next.set("debug", "true");
        else next.delete("debug");
        return next;
      });
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [
    forDate,
    preset,
    debug,
    hasManualOverrides,
    manualOverridesString,
    setParams,
    symbol,
  ]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Swing Trade Scan: {symbol}
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="preset-label">Preset</InputLabel>
            <Select
              labelId="preset-label"
              value={preset}
              label="Preset"
              onChange={(event) => setPreset(event.target.value as PresetName)}
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
            onChange={(event) =>
              setForDate(formatDateInputToInt(event.target.value))
            }
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <FormControlLabel
            control={
              <Switch
                checked={debug}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDebug(event.target.checked)
                }
              />
            }
            label="Debug output"
          />

          <Button variant="contained" onClick={runDateScan} disabled={loading}>
            Scan date
          </Button>
        </Box>

        {/* Removed duplicate preset configuration form for cleaner layout */}
        {hasSuccessfulRun && (
          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "flex-start",
              flexWrap: "nowrap",
              width: "100%",
              minHeight: 400,
            }}
          >
            {/* Left: Config */}
            <Box sx={{ width: 400, flex: "0 0 auto", alignSelf: "flex-start" }}>
              <Typography variant="subtitle1" gutterBottom>
                Preset configuration
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxWidth: 400 }}>
                <Box
                  component="form"
                  sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {configFieldDefinitions.map((field) => {
                    const value = manualConfig[field.key];
                    const disabled = preset !== "manual";
                    return (
                      <Box
                        key={field.key}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          minHeight: 40,
                        }}
                      >
                        <Typography
                          sx={{ minWidth: 170, fontWeight: 500 }}
                          variant="body2"
                        >
                          {field.label}
                        </Typography>
                        {field.type === "boolean" ? (
                          <ToggleButtonSwitch
                            checked={Boolean(value)}
                            onChange={() =>
                              !disabled &&
                              handleManualBooleanChange(field.key)({
                                target: { checked: !value },
                              } as any)
                            }
                            disabled={disabled}
                          />
                        ) : field.type === "select" ? (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={value as EntryMode}
                              onChange={handleManualEntryModeChange}
                              size="small"
                              disabled={disabled}
                            >
                              {entryModeOptions.map((option) => (
                                <MenuItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            size="small"
                            type="number"
                            value={value as number}
                            onChange={handleManualNumberChange(
                              field.key,
                              field.type
                            )}
                            inputProps={{
                              step: field.type === "integer" ? 1 : 0.1,
                            }}
                            disabled={disabled}
                            sx={{ minWidth: 120, maxWidth: 120 }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Box>
            {/* Right: Stats and Results */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignSelf: "flex-start",
              }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, minWidth: 180, flex: "0 0 auto" }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Run statistics
                  </Typography>
                  <Typography variant="h5">{results.length}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      Passed: {passedResults.length} (
                      {numberFormatter.format(passRate)}%)
                    </Typography>
                    <Typography variant="body2">
                      Failed: {failedResults.length} (
                      {numberFormatter.format(failRate)}%)
                    </Typography>
                  </Box>
                </Paper>
                {/* Collapsible failure breakdown */}
                {debug && failureReasonEntries.length > 0 && (
                  <Accordion sx={{ minWidth: 180, flex: "0 0 auto" }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Failure reason breakdown
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {failureReasonEntries.map(([reason, count]) => (
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
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Passing tickers
                </Typography>
                {passedResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No passing tickers detected.
                  </Typography>
                ) : (
                  passedResults.map((item: any, index: number) => (
                    <Accordion
                      key={`${item.symbol}-${index}`}
                      disableGutters
                      defaultExpanded={index === 0}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Typography variant="subtitle1">
                            {item.symbol ?? "Unknown"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.signals?.length ?? 0} signal
                            {item.signals?.length === 1 ? "" : "s"}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {Array.isArray(item.signals) &&
                        item.signals.length > 0 ? (
                          item.signals.map((signal: any, sIdx: number) => (
                            <Paper
                              key={sIdx}
                              variant="outlined"
                              sx={{ p: 1.5, mb: 1.5 }}
                            >
                              <Typography variant="subtitle2">
                                Signal date:{" "}
                                {formatIntDateToDisplay(signal.date)}
                              </Typography>
                              <Typography variant="body2">
                                Entry: {numberFormatter.format(signal.entryPx)}{" "}
                                · Stop: {numberFormatter.format(signal.stop)}
                              </Typography>
                              <Typography variant="body2">
                                Targets:{" "}
                                {Array.isArray(signal.targets)
                                  ? signal.targets
                                      .map((t: number) =>
                                        numberFormatter.format(t)
                                      )
                                      .join(", ")
                                  : "—"}
                              </Typography>
                              <Typography variant="body2">
                                RR to swing:{" "}
                                {signal.rrToSwing != null
                                  ? numberFormatter.format(signal.rrToSwing)
                                  : "—"}
                              </Typography>
                              {signal.meta && (
                                <Box
                                  sx={{
                                    mt: 1,
                                    display: "flex",
                                    gap: 1.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {Object.entries(signal.meta).map(
                                    ([metaKey, metaValue]) => (
                                      <Box key={metaKey}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {metaKey}
                                        </Typography>
                                        <Typography variant="body2">
                                          {typeof metaValue === "number"
                                            ? numberFormatter.format(metaValue)
                                            : String(metaValue)}
                                        </Typography>
                                      </Box>
                                    )
                                  )}
                                </Box>
                              )}
                            </Paper>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No signal details provided.
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Paper>
              {/* Optionally show failed tickers and debug info below */}
              {debug && failedResults.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Failed tickers
                  </Typography>
                  {failedResults.map((item: any, index: number) => (
                    <Accordion
                      key={`${item.symbol ?? index}-fail`}
                      disableGutters
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          {item.symbol ?? "Unknown"}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                          }}
                        >
                          {(Array.isArray(item.reasons)
                            ? item.reasons
                            : []
                          ).map((reason: string, idx: number) => (
                            <Chip key={idx} label={reason} size="small" />
                          ))}
                          {(!item.reasons || item.reasons.length === 0) && (
                            <Typography variant="body2" color="text.secondary">
                              No reasons provided.
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              )}
              {debug && data && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Raw response (debug)
                  </Typography>
                  <pre
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
