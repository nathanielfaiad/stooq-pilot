import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import React from "react";

interface ToggleButtonSwitchProps {
  checked: boolean;
  onChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  label?: string;
  width?: number;
}

export default function ToggleButtonSwitch({
  checked,
  onChange,
  disabled,
  label,
  width = 120,
}: ToggleButtonSwitchProps) {
  const theme = useTheme();
  const color = checked ? theme.palette.success.dark : theme.palette.error.dark;
  const bg = checked ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {label && <span style={{ minWidth: 120, fontWeight: 500 }}>{label}</span>}
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        style={{
          width,
          height: 32,
          borderRadius: 16,
          border: `2px solid ${color}`,
          background: bg,
          color: "#fff",
          fontWeight: 600,
          fontSize: 16,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s, color 0.2s",
        }}
        aria-pressed={checked}
      >
        {checked ? "On" : "Off"}
      </button>
    </Box>
  );
}
