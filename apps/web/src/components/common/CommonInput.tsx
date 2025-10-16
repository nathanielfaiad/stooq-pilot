import TextField from "@mui/material/TextField";
import React from "react";

interface CommonInputProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  size?: "small" | "medium";
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CommonInput({
  label,
  value,
  onChange,
  type = "text",
  size = "small",
  disabled = false,
  style,
}: CommonInputProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      size={size}
      disabled={disabled}
      style={style}
      variant="outlined"
    />
  );
}
