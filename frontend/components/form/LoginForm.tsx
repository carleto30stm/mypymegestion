import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { login } from '../../redux/slices/authSlice';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { status, error: authError } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (authError) {
        setError(authError);
    }
  }, [authError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Usuario y contraseña son requeridos.');
      return;
    }
    setError('');
    dispatch(login({ username, password }));

  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}
    >
      <Typography component="h1" variant="h5">
        Iniciar Sesión
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Usuario"
          name="username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Contraseña"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                {error}
            </Alert>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? <CircularProgress size={24} /> : 'Ingresar'}
        </Button>
      </Box>
    </Box>
  );
};

export default LoginForm;