import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './redux/store';
import { initializeAuth } from './redux/slices/authSlice';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { Box, CircularProgress, Typography } from '@mui/material';

const PrivateRoute: React.FC = () => {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { isInitialized, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Simular una pequeña pausa para verificar la autenticación
    const timer = setTimeout(() => {
      dispatch(initializeAuth());
    }, 500); // 500ms para evitar el flash

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Mostrar pantalla de carga mientras se inicializa
  if (!isInitialized) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <CircularProgress size={50} />
        <Typography variant="h6" sx={{ mt: 2, color: '#666' }}>
          Cargando aplicación...
        </Typography>
      </Box>
    );
  }

  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
  );
};

export default App;