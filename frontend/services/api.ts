import axios from 'axios';

// Configuración de la API base URL
const baseURL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';


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
    const tokenExpiration = localStorage.getItem('tokenExpiration');
    
    // Verificar si el token ha expirado
    if (token && tokenExpiration) {
      const now = Date.now();
      const expirationTime = parseInt(tokenExpiration);
      
      if (now > expirationTime) {
        console.log('🚨 [API] Token expirado detectado - removiendo del localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
        // Redirigir al login
        window.location.href = '/login';
        return Promise.reject(new Error('Token expirado'));
      }
      
      // Advertir si el token expira en menos de 30 minutos
      const timeUntilExpiration = expirationTime - now;
      const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);
      
      if (minutesUntilExpiration < 30 && minutesUntilExpiration > 0) {
        console.log(`⚠️ [API] Token expira en ${Math.round(minutesUntilExpiration)} minutos`);
      }
    }
    
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
      console.log('🚨 [API] Error 401 - Token inválido o expirado');
      // Token expirado o no válido
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
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

// Funciones específicas para la API de facturación
export const facturasAPI = {
  // Listar facturas con filtros opcionales
  listar: async (filtros?: {
    estado?: string;
    clienteId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoComprobante?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/api/facturacion', { params: filtros });
    return response.data;
  },

  // Crear factura desde una venta existente
  crearDesdeVenta: async (ventaId: string) => {
    const response = await api.post('/api/facturacion/desde-venta', { ventaId });
    return response.data;
  },

  // Crear factura manualmente
  crearManual: async (datos: {
    clienteId: string;
    tipoComprobante: string;
    puntoVenta: number;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      alicuotaIVA: number;
    }>;
    observaciones?: string;
  }) => {
    const response = await api.post('/api/facturacion/manual', datos);
    return response.data;
  },

  // Autorizar factura con AFIP
  autorizar: async (id: string) => {
    const response = await api.post(`/api/facturacion/${id}/autorizar`);
    return response.data;
  },

  // Obtener una factura por ID
  obtener: async (id: string) => {
    const response = await api.get(`/api/facturacion/${id}`);
    return response.data;
  },

  // Anular factura
  anular: async (id: string, motivo: string) => {
    const response = await api.post(`/api/facturacion/${id}/anular`, { motivo });
    return response.data;
  },

  // Verificar CAE con AFIP
  verificarCAE: async (id: string) => {
    const response = await api.get(`/api/facturacion/${id}/verificar-cae`);
    return response.data;
  },

  // Obtener puntos de venta disponibles
  obtenerPuntosVenta: async () => {
    const response = await api.get('/api/facturacion/config/puntos-venta');
    return response.data;
  }
};

// ========== API DE PRODUCTOS ==========
export const productosAPI = {
  obtenerTodos: async (filtros?: { estado?: string; categoria?: string; stockBajo?: boolean }) => {
    const response = await api.get('/api/productos', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/productos/${id}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/productos', datos);
    return response.data;
  },

  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/productos/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/api/productos/${id}`);
    return response.data;
  },

  obtenerStockBajo: async () => {
    const response = await api.get('/api/productos/stock-bajo');
    return response.data;
  }
};

// ========== API DE PROVEEDORES ==========
export const proveedoresAPI = {
  obtenerTodos: async (filtros?: { estado?: string; categoria?: string }) => {
    const response = await api.get('/api/proveedores', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/proveedores/${id}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/proveedores', datos);
    return response.data;
  },

  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/proveedores/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/api/proveedores/${id}`);
    return response.data;
  },

  buscar: async (q: string) => {
    const response = await api.get('/api/proveedores/search', { params: { q } });
    return response.data;
  },

  actualizarSaldo: async (id: string, datos: { monto: number; operacion: 'suma' | 'resta' | 'set' }) => {
    const response = await api.patch(`/api/proveedores/${id}/saldo`, datos);
    return response.data;
  }
};

// ========== API DE MATERIAS PRIMAS ==========
export const materiasPrimasAPI = {
  obtenerTodas: async (filtros?: { estado?: string; categoria?: string; stockBajo?: boolean }) => {
    const response = await api.get('/api/materias-primas', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/materias-primas/${id}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/materias-primas', datos);
    return response.data;
  },

  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/materias-primas/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/api/materias-primas/${id}`);
    return response.data;
  },

  buscar: async (q: string) => {
    const response = await api.get('/api/materias-primas/search', { params: { q } });
    return response.data;
  },

  actualizarStock: async (id: string, datos: { cantidad: number; operacion: 'entrada' | 'salida' | 'set'; precio?: number }) => {
    const response = await api.patch(`/api/materias-primas/${id}/stock`, datos);
    return response.data;
  },

  obtenerAlertasStockBajo: async () => {
    const response = await api.get('/api/materias-primas/alertas/stock-bajo');
    return response.data;
  }
};

// ========== API DE COMPRAS ==========
export const comprasAPI = {
  obtenerTodas: async (filtros?: { 
    estado?: string; 
    proveedorId?: string; 
    fechaDesde?: string; 
    fechaHasta?: string 
  }) => {
    const response = await api.get('/api/compras', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/compras/${id}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/compras', datos);
    return response.data;
  },

  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/compras/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/api/compras/${id}`);
    return response.data;
  },

  cambiarEstado: async (id: string, nuevoEstado: string) => {
    const response = await api.patch(`/api/compras/${id}/estado`, { estado: nuevoEstado });
    return response.data;
  },

  confirmarRecepcion: async (id: string, datos: { fechaRecepcion?: string }) => {
    const response = await api.post(`/api/compras/${id}/confirmar-recepcion`, datos);
    return response.data;
  },

  confirmarPago: async (id: string, datos: {
    medioPago: string;
    banco?: string;
    detallesPago?: string;
    montoPagado?: number;
  }) => {
    const response = await api.post(`/api/compras/${id}/confirmar-pago`, datos);
    return response.data;
  },

  anular: async (id: string, motivo: string) => {
    const response = await api.post(`/api/compras/${id}/anular`, { motivo });
    return response.data;
  },

  obtenerEstadisticas: async (filtros?: { fechaDesde?: string; fechaHasta?: string }) => {
    const response = await api.get('/api/compras/estadisticas', { params: filtros });
    return response.data;
  }
};

// ========== API DE MOVIMIENTOS DE INVENTARIO ==========
export const movimientosInventarioAPI = {
  obtenerTodos: async (filtros?: { 
    materiaPrimaId?: string;
    tipo?: string; 
    fechaDesde?: string; 
    fechaHasta?: string;
    limit?: number;
  }) => {
    const response = await api.get('/api/movimientos-inventario', { params: filtros });
    return response.data;
  },

  obtenerPorMateriaPrima: async (materiaPrimaId: string, filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const response = await api.get(`/api/movimientos-inventario/materia-prima/${materiaPrimaId}`, { params: filtros });
    return response.data;
  },

  obtenerKardex: async (materiaPrimaId: string, filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const response = await api.get(`/api/movimientos-inventario/kardex/${materiaPrimaId}`, { params: filtros });
    return response.data;
  },

  crearAjuste: async (datos: {
    materiaPrimaId: string;
    cantidad: number;
    tipo: 'entrada' | 'salida';
    observaciones: string;
  }) => {
    const response = await api.post('/api/movimientos-inventario/ajuste', datos);
    return response.data;
  },

  obtenerEstadisticas: async (filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const response = await api.get('/api/movimientos-inventario/estadisticas', { params: filtros });
    return response.data;
  }
};

// ========== API DE RECETAS ==========
export const recetasAPI = {
  obtenerTodas: async (filtros?: {
    estado?: string;
    productoId?: string;
  }) => {
    const response = await api.get('/api/recetas', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/recetas/${id}`);
    return response.data;
  },

  obtenerPorProducto: async (productoId: string) => {
    const response = await api.get(`/api/recetas/producto/${productoId}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/recetas', datos);
    return response.data;
  },

  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/recetas/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/api/recetas/${id}`);
    return response.data;
  },

  calcularCostoActual: async (id: string) => {
    const response = await api.get(`/api/recetas/${id}/costo-actual`);
    return response.data;
  },

  simularProduccion: async (datos: {
    recetaId: string;
    cantidadAProducir: number;
  }) => {
    const response = await api.post('/api/recetas/simular', datos);
    return response.data;
  },

  obtenerEstadisticas: async () => {
    const response = await api.get('/api/recetas/estadisticas');
    return response.data;
  }
};

// ========== API DE ÓRDENES DE PRODUCCIÓN ==========
export const ordenesProduccionAPI = {
  obtenerTodas: async (filtros?: {
    estado?: string;
    productoId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    prioridad?: string;
  }) => {
    const response = await api.get('/api/ordenes-produccion', { params: filtros });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/ordenes-produccion/${id}`);
    return response.data;
  },

  crear: async (datos: any) => {
    const response = await api.post('/api/ordenes-produccion', datos);
    return response.data;
  },

  iniciar: async (id: string) => {
    const response = await api.post(`/api/ordenes-produccion/${id}/iniciar`);
    return response.data;
  },

  completar: async (id: string, datos: { unidadesProducidas: number; completadoPor: string }) => {
    const response = await api.post(`/api/ordenes-produccion/${id}/completar`, datos);
    return response.data;
  },

  cancelar: async (id: string, motivoCancelacion: string) => {
    const response = await api.post(`/api/ordenes-produccion/${id}/cancelar`, { motivoCancelacion });
    return response.data;
  },

  obtenerEstadisticas: async (filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const response = await api.get('/api/ordenes-produccion/estadisticas', { params: filtros });
    return response.data;
  }
};

