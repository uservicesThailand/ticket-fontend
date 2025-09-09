// =============================
// file: src/main.jsx
// =============================
import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";

const theme = createTheme({
  typography: { fontFamily: 'Inter, "Noto Sans Thai", Roboto, Arial, sans-serif' },
  palette: { background: { default: "#fafafa" } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
