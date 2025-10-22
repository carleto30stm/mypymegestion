import axios from 'axios';

// Configuración de la API base URL
const baseURL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

console.log('🔗 API Base URL:', baseURL);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos timeout
});

// Interceptor para añadir el token de autenticación a cada solicitud
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o no válido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Funciones específicas para la API de gastos
export const gastosAPI = {
  // Confirmar un cheque
  confirmarCheque: async (id: string) => {
    const response = await api.patch(`/api/gastos/${id}/confirmar`);
    return response.data;
  },
  
  // Disponer de un cheque de tercero (depositarlo o pagarlo a proveedor)
  disponerCheque: async (id: string, tipoDisposicion: 'depositar' | 'pagar_proveedor', destino: string, detalleOperacion: string) => {
    const response = await api.post(`/api/gastos/${id}/disponer-cheque`, {
      tipoDisposicion,
      destino,
      detalleOperacion
    });
    return response.data;
  }
};
