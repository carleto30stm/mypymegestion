import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './redux/store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
// import HorasExtraPage from './pages/HorasExtraPage';
import LiquidacionPage from './pages/LiquidacionPage';
import ReportsPage from './pages/ReportsPage';
import ProductosPage from './pages/ProductosPage';
import MetricasProductosPage from './pages/MetricasProductosPage';
import ClientesPage from './pages/ClientesPage';
import VentasPage from './pages/VentasPage';
import HistorialVentasPage from './pages/HistorialVentasPage';
import FacturasPage from './pages/FacturasPage';
import RemitosPage from './pages/RemitosPage';
import CobranzasPage from './pages/CobranzasPage';
import { ProveedoresPage, MateriasPrimasPage, ComprasPage } from './pages';
import MovimientosInventarioPage from './pages/MovimientosInventarioPage';
import RecetasPage from './pages/RecetasPage';
import OrdenesProduccionPage from './pages/OrdenesProduccionPage';
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
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/metricas-productos" element={<MetricasProductosPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/historial-ventas" element={<HistorialVentasPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/remitos" element={<RemitosPage />} />
          <Route path="/cobranzas" element={<CobranzasPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/materias-primas" element={<MateriasPrimasPage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/movimientos-inventario" element={<MovimientosInventarioPage />} />
          <Route path="/recetas" element={<RecetasPage />} />
          <Route path="/ordenes-produccion" element={<OrdenesProduccionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};

export default App;