import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Doctor from './pages/Doctor'
import Admin from './pages/Admin'
import Lab from './pages/Lab'
import Pharmacy from './pages/Pharmacy'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="doctor" element={<Doctor />} />
          <Route path="admin" element={<Admin />} />
          <Route path="lab" element={<Lab />} />
          <Route path="pharmacy" element={<Pharmacy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
