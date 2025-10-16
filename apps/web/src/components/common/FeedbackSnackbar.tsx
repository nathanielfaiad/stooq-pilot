import MuiAlert, { AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { hideFeedback } from "../../store/feedbackSlice";

const Alert = React.forwardRef<HTMLDivElement, any>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function FeedbackSnackbar() {
  const dispatch = useDispatch();
  const feedback = useSelector((state: RootState) => state.feedback);

  const handleClose = (_: any, reason?: string) => {
    if (reason === "clickaway") return;
    dispatch(hideFeedback());
  };

  return (
    <Snackbar
      open={feedback.open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        onClose={handleClose}
        severity={feedback.type as AlertColor}
        sx={{ width: "100%" }}
      >
        {feedback.message}
      </Alert>
    </Snackbar>
  );
}
