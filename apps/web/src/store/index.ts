import { configureStore } from "@reduxjs/toolkit";
import tickersReducer from "./tickersSlice";

export const store = configureStore({
  reducer: {
    tickers: tickersReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
