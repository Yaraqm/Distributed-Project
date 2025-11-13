import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 🛑 THIS LINE IS CRUCIAL FOR STYLING! 
// It imports your base CSS (which includes the Tailwind directives).
import './index.css'; 

import App from './App.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Admin from './pages/Admin.tsx';
import Doctor from './pages/Doctor.tsx';
import Lab from './pages/Lab.tsx';
import Pharmacy from './pages/Pharmacy.tsx';

// Assuming your portal components are located in 'src/pages/' as per your file tree
// The path for the components below might need adjustment if they aren't in 'src/pages'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* App component acts as the Layout (with sidebar and <Outlet/>) */}
        <Route path="/" element={<App />}>
          {/* Index Route renders Dashboard by default */}
          <Route index element={<Dashboard />} /> 
          
          {/* Portal Routes */}
          <Route path="admin" element={<Admin />} />
          <Route path="doctor" element={<Doctor />} />
          <Route path="lab" element={<Lab />} />
          <Route path="pharmacy" element={<Pharmacy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);