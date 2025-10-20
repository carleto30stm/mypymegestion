import React from 'react';
import ReactDOM from 'react-dom/client';

// Debug simple - solo mostrar que React funciona
const SimpleApp = () => {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'No configurada';
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🚀 React está funcionando!</h1>
      <p>Backend URL: {backendUrl}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
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
    root.render(<SimpleApp />);
    console.log("✅ React montado exitosamente");
  } catch (error) {
    console.error("❌ Error al montar React:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    document.body.innerHTML = '<h1 style="color: red;">Error: ' + errorMessage + '</h1>';
  }
}