import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import App from "./App";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Doctor from "./pages/Doctor";
import Lab from "./pages/Lab";
import Pharmacy from "./pages/Pharmacy";

import Login from "./pages/Login";
import Logout from "./pages/Logout";

import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import Register from "./pages/Register";

// -----------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/register" element={<Register />} />

          {/* Protected layout (App.tsx includes sidebar + <Outlet />) */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          >
            {/* Default dashboard */}
            <Route index element={<Dashboard />} />

            {/* Role-protected routes */}
            <Route
              path="admin"
              element={
                <RequireRole role="admin">
                  <Admin />
                </RequireRole>
              }
            />

            <Route
              path="doctor"
              element={
                <RequireRole role="doctor">
                  <Doctor />
                </RequireRole>
              }
            />

            <Route
              path="lab"
              element={
                <RequireRole role="lab">
                  <Lab />
                </RequireRole>
              }
            />

            <Route
              path="pharmacy"
              element={
                <RequireRole role="pharmacy">
                  <Pharmacy />
                </RequireRole>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
