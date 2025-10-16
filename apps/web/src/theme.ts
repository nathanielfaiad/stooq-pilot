import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2C3E50", // Prestige blue
      contrastText: "#F4F6F8",
    },
    secondary: {
      main: "#8E44AD", // Royal purple
      contrastText: "#F4F6F8",
    },
    background: {
      default: "#F4F6F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2C3E50",
      secondary: "#7F8C8D",
    },
    info: {
      main: "#2980B9",
    },
    success: {
      main: "#27AE60", // Green for enabled toggles
      dark: "#219150",
      light: "#43e27d",
    },
    error: {
      main: "#C0392B", // Dim red for disabled toggles
      dark: "#922B21",
      light: "#e57373",
    },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeightLight: 400,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 10,
  },
});

export default theme;
