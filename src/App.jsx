import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';

// Заглушка для страницы Лечения
const Treatments = () => (
  <div>Здесь будет прайс-лист и управление услугами</div>
);

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="treatments" element={<Treatments />} />
      </Route>
    </Routes>
  );
};

export default App;
