import TickerTable from "../components/common/TickerTable";
import { useGetTickersQuery } from "../store/apiSlice";

export default function TickersPage() {
  // Use RTK Query for tickers
  const { data: tickers, error, isLoading } = useGetTickersQuery();
  return <TickerTable tickers={tickers} error={error} isLoading={isLoading} />;
}
