import React from 'react';
import ReactDOM from 'react-dom/client';

const SimpleApp = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>
        � Gestor de Gastos
      </h1>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0',
        border: '1px solid #dee2e6'
      }}>
        <h3>✅ Aplicación funcionando</h3>
        <p>Frontend desplegado correctamente</p>
        <p>Fecha: {new Date().toLocaleDateString()}</p>
        <p>Hora: {new Date().toLocaleTimeString()}</p>
      </div>
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