import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';
import { AppDispatch, RootState } from '../redux/store';
import Box from '@mui/material/Box';
// Using Box instead of Drawer to participate in flex layout and avoid spacing issues
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InventoryIcon from '@mui/icons-material/Inventory';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import HistoryIcon from '@mui/icons-material/History';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EngineeringIcon from '@mui/icons-material/Engineering';
import WorkIcon from '@mui/icons-material/Work';

export const drawerWidth = 240;
export const drawerHandleWidth = 40;

interface SidebarProps {
  onAddNew?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onToggleBankSummary?: () => void;
  showBankSummary?: boolean;
  onTogglePendingChecks?: () => void;
  showPendingChecks?: boolean;
  onToggleChequesDisponibles?: () => void;
  showChequesDisponibles?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onAddNew, 
  isOpen = true, 
  onToggle, 
  onToggleBankSummary,
  showBankSummary = true,
  onTogglePendingChecks,
  showPendingChecks = true,
  onToggleChequesDisponibles,
  showChequesDisponibles = true 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const canCreate = true;
  // Solo usuarios no-oper pueden ver empleados
  const canViewEmployees = user?.userType !== 'oper';

  const handleLogout = () => {
    dispatch(logout());
  };

  const drawer = (
    <div>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                pl: 1,
                fontWeight: 'bold',
                color: '#FF8C00', // Naranja
                fontFamily: '"Roboto", "Arial", sans-serif',
                letterSpacing: '1px'
              }}
            >
              KURT
            </Typography>
            {onToggle && (
              <IconButton onClick={onToggle} aria-label={isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}>
                {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            )}
        </Box>
      <Divider />
      
      {/* Navegación principal */}
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/')}
            selected={location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos'}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        
        {canViewEmployees && (
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => navigate('/employees')}
              selected={location.pathname === '/employees'}
            >
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Empleados" />
            </ListItemButton>
          </ListItem>
        )}
        
        {canViewEmployees && (
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => navigate('/liquidacion')}
              selected={location.pathname === '/liquidacion'}
            >
              <ListItemIcon>
                <AssignmentIcon />
              </ListItemIcon>
              <ListItemText primary="Liquidación" />
            </ListItemButton>
          </ListItem>
        )}
        {/* TODO: Rehabilitar ruta de horas extra cuando esté lista */}
        {/* {canViewEmployees && (
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => navigate('/horas-extra')}
              selected={location.pathname === '/horas-extra'}
            >
              <ListItemIcon>
                <ScheduleIcon />
              </ListItemIcon>
              <ListItemText primary="Horas Extra" />
            </ListItemButton>
          </ListItem>
        )} */}
        
        {canViewEmployees && (
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => navigate('/reports')}
              selected={location.pathname === '/reports'}
            >
              <ListItemIcon>
                <AssessmentIcon />
              </ListItemIcon>
              <ListItemText primary="Reportes Contables" />
            </ListItemButton>
          </ListItem>
        )}
        
        {canViewEmployees && (
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => navigate('/rrhh')}
              selected={location.pathname === '/rrhh'}
            >
              <ListItemIcon>
                <WorkIcon />
              </ListItemIcon>
              <ListItemText primary="RRHH" />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/caja')}
            selected={location.pathname === '/caja'}
          >
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary="Control de Caja" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      
      {/* Sección de Ventas */}
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/productos')}
            selected={location.pathname === '/productos'}
          >
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Productos" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/metricas-productos')}
            selected={location.pathname === '/metricas-productos'}
          >
            <ListItemIcon>
              <ShowChartIcon />
            </ListItemIcon>
            <ListItemText primary="Métricas Productos" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/clientes')}
            selected={location.pathname === '/clientes'}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Clientes" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/ventas')}
            selected={location.pathname === '/ventas'}
          >
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary="Nueva Venta" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/historial-ventas')}
            selected={location.pathname === '/historial-ventas'}
          >
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary="Historial Ventas" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/remitos')}
            selected={location.pathname === '/remitos'}
          >
            <ListItemIcon>
              <LocalShippingIcon />
            </ListItemIcon>
            <ListItemText primary="Remitos" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/cobranzas')}
            selected={location.pathname === '/cobranzas'}
          >
            <ListItemIcon>
              <AccountBalanceWalletIcon />
            </ListItemIcon>
            <ListItemText primary="Cobranzas" />
          </ListItemButton>
        </ListItem>
               
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/facturas')}
            selected={location.pathname === '/facturas'}
          >
            <ListItemIcon>
              <ReceiptIcon />
            </ListItemIcon>
            <ListItemText primary="Facturación" />
          </ListItemButton>
        </ListItem>

      </List>
      <Divider />

      {/* Sección de Compras */}
      <List>
        <ListSubheader component="div">
          COMPRAS E INVENTARIO
        </ListSubheader>
        
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/proveedores')}
            selected={location.pathname === '/proveedores'}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Proveedores" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/materias-primas')}
            selected={location.pathname === '/materias-primas'}
          >
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Materias Primas" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/compras')}
            selected={location.pathname === '/compras'}
          >
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Compras" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/movimientos-inventario')}
            selected={location.pathname === '/movimientos-inventario'}
          >
            <ListItemIcon>
              <SwapHorizIcon />
            </ListItemIcon>
            <ListItemText primary="Movimientos" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      
      {/* Producción */}
      <List>
        <ListSubheader component="div" inset>
          PRODUCCIÓN
        </ListSubheader>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/recetas')}
            selected={location.pathname === '/recetas'}
          >
            <ListItemIcon>
              <MenuBookIcon />
            </ListItemIcon>
            <ListItemText primary="Recetas" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/ordenes-produccion')}
            selected={location.pathname === '/ordenes-produccion'}
          >
            <ListItemIcon>
              <PrecisionManufacturingIcon />
            </ListItemIcon>
            <ListItemText primary="Órdenes de Producción" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/ordenes-procesamiento')}
            selected={location.pathname.startsWith('/ordenes-procesamiento')}
          >
            <ListItemIcon>
              <EngineeringIcon />
            </ListItemIcon>
            <ListItemText primary="Procesamiento Externo" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                    <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Cerrar Sesión" />
            </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: isOpen ? drawerWidth : drawerHandleWidth,
        flexShrink: 0,
        transition: 'width 200ms ease',
        bgcolor: 'background.paper',
        boxShadow: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isOpen ? (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          {drawer}
        </Box>
      ) : (
        // Small handle area when closed
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {onToggle && (
            <IconButton onClick={onToggle} aria-label="Mostrar sidebar">
              <ChevronRightIcon />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Sidebar;
