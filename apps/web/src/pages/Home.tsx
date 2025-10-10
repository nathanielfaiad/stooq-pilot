import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Home() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to Stooq Pilot
      </Typography>
      <Typography>
        This is a small demo app for browsing ticker metadata and testing
        indicators.
      </Typography>
    </Box>
  );
}
