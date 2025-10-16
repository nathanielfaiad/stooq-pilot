import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type FeedbackType = "success" | "error" | "info" | "warning";

export interface FeedbackState {
  open: boolean;
  type: FeedbackType;
  message: string;
}

const initialState: FeedbackState = {
  open: false,
  type: "info",
  message: "",
};

const feedbackSlice = createSlice({
  name: "feedback",
  initialState,
  reducers: {
    showFeedback(
      state,
      action: PayloadAction<{ type: FeedbackType; message: string }>
    ) {
      state.open = true;
      state.type = action.payload.type;
      state.message = action.payload.message;
    },
    hideFeedback(state) {
      state.open = false;
      state.message = "";
    },
  },
});

export const { showFeedback, hideFeedback } = feedbackSlice.actions;
export default feedbackSlice.reducer;
