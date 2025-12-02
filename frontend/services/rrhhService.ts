import api from './api';

/**
 * API de Recursos Humanos
 * - Convenios Colectivos y Paritarias
 * - Formulario 931 AFIP
 * - Antigüedad
 * - Libro de Sueldos Digital
 * - Recibos de Sueldo
 */

// ========== CONVENIOS COLECTIVOS ==========
export const conveniosAPI = {
  // Listar todos los convenios
  obtenerTodos: async () => {
    const response = await api.get('/api/convenios');
    return response.data;
  },

  // Obtener un convenio por ID
  obtenerPorId: async (id: string) => {
    const response = await api.get(`/api/convenios/${id}`);
    return response.data;
  },

  // Crear nuevo convenio
  crear: async (datos: any) => {
    const response = await api.post('/api/convenios', datos);
    return response.data;
  },

  // Actualizar convenio
  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/convenios/${id}`, datos);
    return response.data;
  },

  // Eliminar convenio
  eliminar: async (id: string) => {
    const response = await api.delete(`/api/convenios/${id}`);
    return response.data;
  },

  // Registrar paritaria/ajuste salarial
  registrarParitaria: async (id: string, datos: {
    tipoAjuste: 'paritaria' | 'decreto' | 'acuerdo' | 'otro';
    porcentajeAumento: number;
    montoFijo?: number;
    descripcion: string;
    aplicadoA: 'todas' | string[];
    retroactivo?: boolean;
    fechaRetroactiva?: string;
  }) => {
    const response = await api.post(`/api/convenios/${id}/paritaria`, datos);
    return response.data;
  },

  // Obtener todas las paritarias del sistema
  getTodasParitarias: async (anio?: number) => {
    const params = anio ? { anio } : {};
    const response = await api.get('/api/convenios/paritarias/todas', { params });
    return response.data;
  },

  // Obtener alertas de paritarias
  getAlertasParitarias: async () => {
    const response = await api.get('/api/convenios/paritarias/alertas');
    return response.data;
  },

  // Obtener resumen anual de paritarias
  getResumenAnualParitarias: async (anio?: number) => {
    const params = anio ? { anio } : {};
    const response = await api.get('/api/convenios/paritarias/resumen-anual', { params });
    return response.data;
  },

  // Calcular sueldo según convenio
  calcularSueldo: async (id: string, datos: {
    codigoCategoria: string;
    antiguedadAnios?: number;
    aplicaPresentismo?: boolean;
    tieneZonaPeligrosa?: boolean;
    nivelTitulo?: string;
  }) => {
    const response = await api.post(`/api/convenios/${id}/calcular-sueldo`, datos);
    return response.data;
  }
};

// ========== FORMULARIO 931 AFIP ==========
export const f931API = {
  // Preview del F931
  preview: async (periodoId: string) => {
    const response = await api.get(`/api/f931/preview/${periodoId}`);
    return response.data;
  },

  // Generar datos completos
  generar: async (periodoId: string, rectificativa?: boolean, numeroOriginal?: string) => {
    const params: any = {};
    if (rectificativa) params.rectificativa = 'true';
    if (numeroOriginal) params.numeroOriginal = numeroOriginal;
    const response = await api.get(`/api/f931/generar/${periodoId}`, { params });
    return response.data;
  },

  // Exportar TXT para SICOSS
  exportarTXT: async (periodoId: string) => {
    const response = await api.get(`/api/f931/exportar-txt/${periodoId}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `F931_${periodoId}_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Historial de F931
  getHistorial: async (anio?: number) => {
    const params = anio ? { anio } : {};
    const response = await api.get('/api/f931/historial', { params });
    return response.data;
  }
};

// ========== ANTIGÜEDAD ==========
export const antiguedadAPI = {
  // Estadísticas generales
  getEstadisticas: async () => {
    const response = await api.get('/api/antiguedad/estadisticas');
    return response.data;
  },

  // Ranking de antigüedad
  getRanking: async (limite?: number) => {
    const params = limite ? { limite } : {};
    const response = await api.get('/api/antiguedad/ranking', { params });
    return response.data;
  },

  // Alertas de aniversarios próximos
  getAlertas: async (dias?: number) => {
    const params = dias ? { dias } : {};
    const response = await api.get('/api/antiguedad/alertas', { params });
    return response.data;
  },

  // Antigüedad de todos los empleados
  getTodos: async (area?: string, incluirAdicional?: boolean) => {
    const params: any = {};
    if (area) params.area = area;
    if (incluirAdicional) params.incluirAdicional = 'true';
    const response = await api.get('/api/antiguedad/todos', { params });
    return response.data;
  },

  // Antigüedad de un empleado
  getEmpleado: async (empleadoId: string, sueldoBasico?: number, sueldoBruto?: number) => {
    const params: any = {};
    if (sueldoBasico) params.sueldoBasico = sueldoBasico;
    if (sueldoBruto) params.sueldoBruto = sueldoBruto;
    const response = await api.get(`/api/antiguedad/empleado/${empleadoId}`, { params });
    return response.data;
  },

  // Calcular adicional por antigüedad
  calcularAdicional: async (datos: {
    empleadoId: string;
    sueldoBasico: number;
    sueldoBruto?: number;
    fechaCalculo?: string;
  }) => {
    const response = await api.post('/api/antiguedad/calcular-adicional', datos);
    return response.data;
  },

  // Simular antigüedad
  simular: async (datos: {
    fechaIngreso: string;
    fechaCalculo?: string;
    sueldoBasico?: number;
    porcentajePorAnio?: number;
    topeAnios?: number;
  }) => {
    const response = await api.post('/api/antiguedad/simular', datos);
    return response.data;
  },

  // Historial de antigüedad de un empleado
  getHistorial: async (empleadoId: string, anio?: number) => {
    const params = anio ? { anio } : {};
    const response = await api.get(`/api/antiguedad/historial/${empleadoId}`, { params });
    return response.data;
  }
};

// ========== LIBRO DE SUELDOS DIGITAL ==========
export const libroSueldosAPI = {
  // Preview
  preview: async (periodoId: string) => {
    const response = await api.get(`/api/libro-sueldos/preview/${periodoId}`);
    return response.data;
  },

  // Generar libro completo
  generar: async (periodoId: string) => {
    const response = await api.get(`/api/libro-sueldos/generar/${periodoId}`);
    return response.data;
  },

  // Exportar TXT para AFIP
  exportarTXT: async (periodoId: string) => {
    const response = await api.get(`/api/libro-sueldos/exportar-txt/${periodoId}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Sueldos_${periodoId}_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Exportar Excel/CSV
  exportarExcel: async (periodoId: string) => {
    const response = await api.get(`/api/libro-sueldos/exportar-excel/${periodoId}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Sueldos_${periodoId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Historial
  getHistorial: async (anio?: number) => {
    const params = anio ? { anio } : {};
    const response = await api.get('/api/libro-sueldos/historial', { params });
    return response.data;
  }
};

// ========== RECIBOS DE SUELDO ==========
export const recibosSueldoAPI = {
  // Generar recibo individual
  generar: async (periodoId: string, empleadoId: string) => {
    const response = await api.get(`/api/recibos-sueldo/generar/${periodoId}/${empleadoId}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Recibo_${empleadoId}_${periodoId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Generar todos los recibos del período
  generarTodos: async (periodoId: string) => {
    const response = await api.get(`/api/recibos-sueldo/generar-todos/${periodoId}`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Recibos_${periodoId}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Previsualizar recibo (devuelve datos, no PDF)
  previsualizar: async (periodoId: string, empleadoId: string) => {
    const response = await api.get(`/api/recibos-sueldo/preview/${periodoId}/${empleadoId}`);
    return response.data;
  },

  // Historial de recibos de un empleado
  getHistorial: async (empleadoId: string) => {
    const response = await api.get(`/api/recibos-sueldo/historial/${empleadoId}`);
    return response.data;
  }
};

// ========== DESCUENTOS E INCENTIVOS ==========
export const descuentosAPI = {
  // Obtener descuentos de un empleado
  getDescuentosEmpleado: async (empleadoId: string, filtros?: {
    estado?: string;
    tipo?: string;
    mes?: number;
    anio?: number;
  }) => {
    const response = await api.get(`/api/descuentos-empleado/empleado/${empleadoId}`, { params: filtros });
    return response.data;
  },

  // Crear descuento
  crear: async (datos: any) => {
    const response = await api.post('/api/descuentos-empleado', datos);
    return response.data;
  },

  // Actualizar descuento
  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/descuentos-empleado/${id}`, datos);
    return response.data;
  },

  // Eliminar/cancelar descuento
  eliminar: async (id: string) => {
    const response = await api.delete(`/api/descuentos-empleado/${id}`);
    return response.data;
  }
};

export const incentivosAPI = {
  // Obtener incentivos de un empleado
  getIncentivosEmpleado: async (empleadoId: string, filtros?: {
    estado?: string;
    tipo?: string;
    mes?: number;
    anio?: number;
  }) => {
    const response = await api.get(`/api/incentivos-empleado/empleado/${empleadoId}`, { params: filtros });
    return response.data;
  },

  // Crear incentivo
  crear: async (datos: any) => {
    const response = await api.post('/api/incentivos-empleado', datos);
    return response.data;
  },

  // Actualizar incentivo
  actualizar: async (id: string, datos: any) => {
    const response = await api.put(`/api/incentivos-empleado/${id}`, datos);
    return response.data;
  },

  // Eliminar/cancelar incentivo
  eliminar: async (id: string) => {
    const response = await api.delete(`/api/incentivos-empleado/${id}`);
    return response.data;
  }
};

// ========== LIQUIDACIÓN FINAL ==========
export const liquidacionFinalAPI = {
  // Obtener liquidación final de un empleado
  obtenerPorEmpleado: async (empleadoId: string) => {
    const response = await api.get(`/api/liquidacion-final/empleado/${empleadoId}`);
    return response.data;
  },

  // Crear liquidación final
  crear: async (datos: any) => {
    const response = await api.post('/api/liquidacion-final', datos);
    return response.data;
  },

  // Simular liquidación final
  simular: async (datos: {
    empleadoId: string;
    fechaEgreso: string;
    motivoEgreso: string;
    vacacionesPendientes?: number;
    diasIntegracionMes?: number;
  }) => {
    const response = await api.post('/api/liquidacion-final/simular', datos);
    return response.data;
  },

  // Listar todas las liquidaciones finales
  listar: async (filtros?: {
    estado?: string;
    motivoEgreso?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    const response = await api.get('/api/liquidacion-final', { params: filtros });
    return response.data;
  }
};
