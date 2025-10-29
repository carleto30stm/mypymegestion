import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './redux/store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import HorasExtraPage from './pages/HorasExtraPage';
import LiquidacionPage from './pages/LiquidacionPage';
import ReportsPage from './pages/ReportsPage';
import Layout from './components/Layout';
import { useTokenExpiration } from './hooks/useTokenExpiration';

const PrivateRoute: React.FC = () => {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    
    // Activar verificación de expiración de token
    useTokenExpiration();
    
    return isAuthenticated ? <Layout /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/gastos" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/liquidacion" element={<LiquidacionPage />} />
          {/* <Route path="/horas-extra" element={<HorasExtraPage />} /> */}
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};

export default App;