import React from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { AppDispatch } from '../redux/store';
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

export const drawerWidth = 240;
export const drawerHandleWidth = 40;

interface SidebarProps {
    onAddNew: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onToggleBankSummary?: () => void;
  showBankSummary?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onAddNew, 
  isOpen = true, 
  onToggle, 
  onToggleBankSummary,
  showBankSummary = true 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  // Todos los usuarios pueden crear registros (OPER puede crear, pero no editar/eliminar)
  const canCreate = true;

  const handleLogout = () => {
    dispatch(logout());
  };

  const drawer = (
    <div>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
            <Typography variant="h6" component="div" sx={{ pl: 1 }}>
                Gestor App
            </Typography>
            {onToggle && (
              <IconButton onClick={onToggle} aria-label={isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}>
                {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            )}
        </Box>
      <Divider />
      <List>
        {canCreate && (
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
