import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Убрали BrowserRouter отсюда
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Dentists from './pages/Dentists';
import Assistants from './pages/Assistants';
import Inventory from './pages/Inventory';
import Treatments from './pages/Treatments';
import SystemLogs from './pages/SystemLogs';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="appointments" element={<Appointments />} />

          <Route
            element={<ProtectedRoute allowedRoles={['admin', 'dentist']} />}
          >
            <Route path="treatments" element={<Treatments />} />
          </Route>
          <Route
            element={<ProtectedRoute allowedRoles={['admin', 'assistant']} />}
          >
            <Route path="inventory" element={<Inventory />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="dentists" element={<Dentists />} />
            <Route path="assistants" element={<Assistants />} />
            <Route path="logs" element={<SystemLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
