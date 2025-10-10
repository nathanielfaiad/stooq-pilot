import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TickerTable from "./components/TickerTable";

export default function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stooq Pilot — Tickers
        </Typography>
        <TickerTable />
      </Box>
    </Container>
  );
}
