import { configureStore } from "@reduxjs/toolkit";
import feedbackReducer from "./feedbackSlice";
import tickersReducer from "./tickersSlice";

export const store = configureStore({
  reducer: {
    tickers: tickersReducer,
    feedback: feedbackReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
