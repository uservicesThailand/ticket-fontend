// =============================
// file: src/App.jsx
// =============================
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import Ticket from "./pages/ticket.jsx";
// ✅ Route สำหรับเช็ค sessionStorage
function ProtectedRoute({ children }) {
  const isLoggedIn = !!sessionStorage.getItem("usvt_user_key");
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* หน้า Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* หน้า Ticket (ต้อง login เท่านั้น) */}
        <Route
          path="/ticket"
          element={
            <ProtectedRoute>
              <Ticket />
            </ProtectedRoute>
          }
        />

        {/* root "/" ให้ redirect ไป ticket ถ้า login แล้ว, ไม่งั้นไป login */}
        <Route
          path="/"
          element={
            sessionStorage.getItem("usvt_user_key") ? (
              <Navigate to="/ticket" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
