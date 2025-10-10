import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import TickersPage from "./pages/TickersPage";

const navItems = [
  { id: "home", label: "Home", href: "/" },
  { id: "tickers", label: "Tickers", href: "/tickers" },
];

export default function App() {
  return (
    <AppShell navItems={navItems}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tickers" element={<TickersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
