import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Typography, Alert, Box, Chip } from '@mui/material';

const DiagnosticPage: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [backendData, setBackendData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://mypymegestion.onrender.com';

  const testBackendConnection = async () => {
    try {
      setBackendStatus('loading');
      setError('');
      
      console.log('🔍 Probando conexión con:', `${backendUrl}/api/debug/test`);
      
      const response = await fetch(`${backendUrl}/api/debug/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBackendData(data);
      setBackendStatus('success');
      console.log('✅ Conexión exitosa:', data);
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setBackendStatus('error');
    }
  };

  useEffect(() => {
    testBackendConnection();
  }, []);

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔧 Diagnóstico del Sistema
      </Typography>
      
      <Card sx={{ marginBottom: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estado del Frontend
          </Typography>
          <Chip label={`✅ Funcionando en ${window.location.origin}`} color="success" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Backend URL configurada: <strong>{backendUrl}</strong>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ marginBottom: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estado del Backend
          </Typography>
          
          {backendStatus === 'loading' && (
            <Chip label="🔄 Probando conexión..." color="info" />
          )}
          
          {backendStatus === 'success' && (
            <>
              <Chip label="✅ Backend conectado" color="success" sx={{ mb: 2 }} />
              {backendData && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Mensaje:</strong> {backendData.message}</Typography>
                  <Typography variant="body2"><strong>Timestamp:</strong> {backendData.timestamp}</Typography>
                  <Typography variant="body2"><strong>CORS Origin:</strong> {backendData.cors}</Typography>
                  <Typography variant="body2"><strong>MongoDB:</strong> {backendData.environment?.MONGODB_CONNECTED ? '✅ Conectado' : '❌ Desconectado'}</Typography>
                  <Typography variant="body2"><strong>Entorno:</strong> {backendData.environment?.NODE_ENV}</Typography>
                </Box>
              )}
            </>
          )}
          
          {backendStatus === 'error' && (
            <>
              <Chip label="❌ Error de conexión" color="error" sx={{ mb: 2 }} />
              <Alert severity="error" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Error:</strong> {error}
                </Typography>
              </Alert>
            </>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={testBackendConnection}
              disabled={backendStatus === 'loading'}
            >
              🔄 Reintentar Conexión
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Información del Entorno
          </Typography>
          <Typography variant="body2"><strong>URL Frontend:</strong> {window.location.origin}</Typography>
          <Typography variant="body2"><strong>URL Backend:</strong> {backendUrl}</Typography>
          <Typography variant="body2"><strong>User Agent:</strong> {navigator.userAgent}</Typography>
          <Typography variant="body2"><strong>Timestamp:</strong> {new Date().toISOString()}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DiagnosticPage;