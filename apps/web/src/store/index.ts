import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import feedbackReducer from "./feedbackSlice";
import tickersReducer from "./tickersSlice";

export const store = configureStore({
  reducer: {
    tickers: tickersReducer,
    feedback: feedbackReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
