import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DiagnosticPage from './src/pages/DiagnosticPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const DiagnosticApp = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DiagnosticPage />
    </ThemeProvider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("No se encontró el elemento root");
  document.body.innerHTML = '<h1 style="color: red;">Error: No se encontró el elemento root</h1>';
} else {
  console.log("✅ Elemento root encontrado, montando React...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<DiagnosticApp />);
    console.log("✅ React montado exitosamente");
  } catch (error) {
    console.error("❌ Error al montar React:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    document.body.innerHTML = '<h1 style="color: red;">Error: ' + errorMessage + '</h1>';
  }
}