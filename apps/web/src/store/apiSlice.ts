import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { showFeedback } from "./feedbackSlice";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getTickers: builder.query<any[], void>({
      query: () => "tickers",
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            showFeedback({ type: "success", message: "Tickers loaded!" })
          );
        } catch {
          dispatch(
            showFeedback({ type: "error", message: "Failed to load tickers." })
          );
        }
      },
    }),
    // Add more endpoints here (e.g., swing trades, uploads)
  }),
});

export const { useGetTickersQuery } = apiSlice;
