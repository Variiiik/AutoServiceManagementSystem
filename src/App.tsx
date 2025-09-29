import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { WorkOrders } from './components/WorkOrders';
import { InventoryPage } from './pages/InventoryPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { BillingPage } from './pages/BillingPage';
import { Layout } from './components/layout/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="work-orders" element={<WorkOrders />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;