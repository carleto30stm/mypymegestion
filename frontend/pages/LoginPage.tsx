import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../redux/store';
import LoginForm from '../components/form/LoginForm';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Si el usuario ya está autenticado, redirigir al dashboard.
    // Esto maneja tanto el login exitoso como el caso de que un usuario
    // ya logueado intente volver a la página de login.
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  return (
    <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
            <LoginForm />
        </Box>
    </Container>
  );
};

export default LoginPage;
