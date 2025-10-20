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
        🚀 Gestor de Gastos - React Vite
      </h1>
      
      <div style={{ 
        background: '#d4edda', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0',
        border: '1px solid #c3e6cb'
      }}>
        <h3>✅ React funcionando con Vite</h3>
        <p>Frontend desplegado correctamente con configuración simplificada</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
        <p><strong>Hora:</strong> {new Date().toLocaleTimeString()}</p>
        <p><strong>URL:</strong> {window.location.href}</p>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("No se encontró el elemento root");
} else {
  console.log("✅ Elemento root encontrado, montando React...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<SimpleApp />);
    console.log("✅ React montado exitosamente con Vite");
  } catch (error) {
    console.error("❌ Error al montar React:", error);
  }
}
