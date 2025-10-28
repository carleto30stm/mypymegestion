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
  
  // Todos los usuarios pueden crear registros (OPER puede crear, pero no editar/eliminar)
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
              onClick={() => navigate('/horas-extra')}
              selected={location.pathname === '/horas-extra'}
            >
              <ListItemIcon>
                <ScheduleIcon />
              </ListItemIcon>
              <ListItemText primary="Horas Extra" />
            </ListItemButton>
          </ListItem>
        )}
        
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
      </List>
      <Divider />
      
      {/* Acciones específicas del dashboard */}
      {(location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos') && (
        <>
          <List>
            {canCreate && onAddNew && (
              <ListItem disablePadding>
                <ListItemButton onClick={onAddNew}>
                  <ListItemIcon>
                    <AddCircleOutlineIcon />
                  </ListItemIcon>
                  <ListItemText primary="Agregar Registro" />
                </ListItemButton>
              </ListItem>
            )}
            {onToggleBankSummary && (
              <ListItem disablePadding>
                <ListItemButton onClick={onToggleBankSummary}>
                  <ListItemIcon>
                    <AccountBalanceIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={showBankSummary ? "Ocultar Resumen Bancos" : "Mostrar Resumen Bancos"} 
                  />
                </ListItemButton>
              </ListItem>
            )}
            {onTogglePendingChecks && (
              <ListItem disablePadding>
                <ListItemButton onClick={onTogglePendingChecks}>
                  <ListItemIcon>
                    <ReceiptIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={showPendingChecks ? "Ocultar Cheques Pendientes" : "Mostrar Cheques Pendientes"} 
                  />
                </ListItemButton>
              </ListItem>
            )}

            {/* Toggle Cheques Disponibles */}
            {onToggleChequesDisponibles && (
              <ListItem disablePadding>
                <ListItemButton onClick={onToggleChequesDisponibles}>
                  <ListItemIcon>
                    <ReceiptIcon color={showChequesDisponibles ? "primary" : "action"} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={showChequesDisponibles ? "Ocultar Cheques Disponibles" : "Mostrar Cheques Disponibles"} 
                  />
                </ListItemButton>
              </ListItem>
            )}
          </List>
          <Divider />
        </>
      )}
      
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
