import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Dentists from './pages/Dentists';
import Assistants from './pages/Assistants';
import Inventory from './pages/Inventory';
import Treatments from './pages/Treatments';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="dentists" element={<Dentists />} />
        <Route path="assistants" element={<Assistants />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="treatments" element={<Treatments />} />
        <Route path="inventory" element={<Inventory />} />
      </Route>
    </Routes>
  );
};

export default App;
