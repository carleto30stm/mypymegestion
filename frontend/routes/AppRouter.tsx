import { Navigate, Route, Routes } from "react-router-dom"
import { RRHHPage, ProveedoresPage, MateriasPrimasPage, ComprasPage, MovimientosInventarioPage, RecetasPage, OrdenesProduccionPage } from "../pages"
import ClientesPage from "../pages/ClientesPage"
import DashboardPage from "../pages/DashboardPage"
import EmployeesPage from "../pages/EmployeesPage"
import LiquidacionPage from "../pages/LiquidacionPage"
import LoginPage from "../pages/LoginPage"
import MetricasProductosPage from "../pages/MetricasProductosPage"
import OrdenProcesamientoForm from "../pages/OrdenProcesamientoForm"
import OrdenProcesamientoList from "../pages/OrdenProcesamientoList"
import OrdenProcesamientoRecepcion from "../pages/OrdenProcesamientoRecepcion"
import ProductosPage from "../pages/ProductosPage"
import ReportsPage from "../pages/ReportsPage"
import CobranzasPage from "../pages/ventas/CobranzasPage"
import FacturasPage from "../pages/ventas/FacturasPage"
import HistorialVentasPage from "../pages/ventas/HistorialVentasPage"
import RemitosPage from "../pages/ventas/RemitosPage"
import VentasPage from "../pages/ventas/VentasPage"
import CajaPage from "../pages/CajaPage"
import CajaHistorial from "../pages/CajaHistorial"
import { useSelector } from "react-redux"
import { RootState } from "../redux/store"
import { useTokenExpiration } from "../hooks/useTokenExpiration"
import Layout from "../components/Layout"

const PrivateRoute: React.FC = () => {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    
    // Activar verificación de expiración de token
    useTokenExpiration();
    
    return isAuthenticated ? <Layout /> : <Navigate to="/login" replace />;
};

export const AppRouter = () => {
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
          <Route path="/rrhh" element={<RRHHPage />} />
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
          <Route path="/ordenes-procesamiento" element={<OrdenProcesamientoList />} />
          <Route path="/ordenes-procesamiento/nueva" element={<OrdenProcesamientoForm />} />
          <Route path="/ordenes-procesamiento/:id" element={<OrdenProcesamientoForm />} />
          <Route path="/ordenes-procesamiento/:id/recibir" element={<OrdenProcesamientoRecepcion />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/caja/historial" element={<CajaHistorial />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}
