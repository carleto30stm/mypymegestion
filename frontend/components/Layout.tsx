import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Estados para controlar las secciones del dashboard
  const [showBankSummary, setShowBankSummary] = useState(true);
  const [showPendingChecks, setShowPendingChecks] = useState(true);
  const [showChequesDisponibles, setShowChequesDisponibles] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleToggleBankSummary = () => {
    setShowBankSummary(!showBankSummary);
  };

  const handleTogglePendingChecks = () => {
    setShowPendingChecks(!showPendingChecks);
  };

  const handleToggleChequesDisponibles = () => {
    setShowChequesDisponibles(!showChequesDisponibles);
  };

  // Función para manejar "Agregar Registro" desde el sidebar
  const handleAddNew = () => {
    // Esta función se pasa solo cuando estamos en el dashboard
    // Para otras páginas, se puede manejar de manera diferente
    const event = new CustomEvent('openAddModal');
    window.dispatchEvent(event);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar persistente */}
      <Sidebar
        onAddNew={(location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos') ? handleAddNew : undefined}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        onToggleBankSummary={(location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos') ? handleToggleBankSummary : undefined}
        showBankSummary={showBankSummary}
        onTogglePendingChecks={(location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos') ? handleTogglePendingChecks : undefined}
        showPendingChecks={showPendingChecks}
        onToggleChequesDisponibles={(location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/gastos') ? handleToggleChequesDisponibles : undefined}
        showChequesDisponibles={showChequesDisponibles}
      />
      
      {/* Área de contenido principal */}
      <Box 
        component="main"
        sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          height: '100vh'
        }}
      >
        <Outlet context={{
          showBankSummary,
          showPendingChecks,
          showChequesDisponibles,
          onToggleBankSummary: handleToggleBankSummary,
          onTogglePendingChecks: handleTogglePendingChecks,
          onToggleChequesDisponibles: handleToggleChequesDisponibles
        }} />
      </Box>
    </Box>
  );
};

export default Layout;