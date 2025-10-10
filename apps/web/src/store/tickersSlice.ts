import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { mockTickers } from "../mockData";

export type Ticker = {
  id: number;
  ticker: string;
  exchange: string;
  assetType: string;
};

export type TickersState = {
  items: Ticker[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: TickersState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchTickers = createAsyncThunk("tickers/fetch", async () => {
  try {
    const res = await fetch("/api/tickers");
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data as Ticker[];
  } catch (err) {
    // fallback to mock data
    return mockTickers as Ticker[];
  }
});

const tickersSlice = createSlice({
  name: "tickers",
  initialState,
  reducers: {
    setTickers(state, action: PayloadAction<Ticker[]>) {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchTickers.fulfilled,
        (state, action: PayloadAction<Ticker[]>) => {
          state.status = "succeeded";
          state.items = action.payload;
        }
      )
      .addCase(fetchTickers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { setTickers } = tickersSlice.actions;
export default tickersSlice.reducer;
