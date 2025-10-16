import Box from "@mui/material/Box";
import React from "react";

interface CommonContainerProps {
  children: React.ReactNode;
  sx?: object;
  style?: React.CSSProperties;
}

export default function CommonContainer({
  children,
  sx,
  style,
}: CommonContainerProps) {
  return (
    <Box sx={sx} style={style}>
      {children}
    </Box>
  );
}
