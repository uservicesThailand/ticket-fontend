import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import Ticket from "./pages/Ticket.jsx";

function ProtectedRoute({ children, isLoggedIn }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!sessionStorage.getItem("usvt_user_key")
  );

  useEffect(() => {
    const handler = () => {
      setIsLoggedIn(!!sessionStorage.getItem("usvt_user_key"));
    };
    window.addEventListener("storage", handler); // ฟังการเปลี่ยนจาก tab อื่น
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/ticket"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Ticket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/ticket" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
