// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import Ticket from "./pages/Ticket.jsx";

function ProtectedRoute({ isLoggedIn, element }) {
  // ถ้า login → แสดง element, ถ้าไม่ login → แสดง LoginPage
  return isLoggedIn ? element : <LoginPage />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(sessionStorage.getItem("usvt_user_key"))
  );

  useEffect(() => {
    const handler = () =>
      setIsLoggedIn(Boolean(sessionStorage.getItem("usvt_user_key")));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleLoggedIn = () => setIsLoggedIn(true);

  return (
    <BrowserRouter>
      <Routes>
        {/* root: ถ้า login แล้วไป Ticket, ไม่งั้นไป Login */}
        <Route
          path="/"
          element={
            isLoggedIn ? <Ticket /> : <LoginPage onLogin={handleLoggedIn} />
          }
        />

        {/* login route ตรงๆ */}
        <Route
          path="/login"
          element={<LoginPage onLogin={handleLoggedIn} />}
        />

        {/* ticket route ปลอดภัย */}
        <Route
          path="/ticket"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn} element={<Ticket />} />
          }
        />

        {/* fallback */}
        <Route path="*" element={<LoginPage onLogin={handleLoggedIn} />} />
      </Routes>
    </BrowserRouter>
  );
}
