import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { LiquidacionPeriodo } from '../../types';

interface LiquidacionState {
  items: LiquidacionPeriodo[];
  periodoActual: LiquidacionPeriodo | null;
  loading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: LiquidacionState = {
  items: [],
  periodoActual: null,
  loading: false,
  error: null,
  status: 'idle'
};

const apiUrl = '/api'
// Thunks
export const fetchPeriodos = createAsyncThunk(
  'liquidacion/fetchPeriodos',
  async () => {
    const response = await api.get(`${apiUrl}/liquidacion`);
    return response.data;
  }
);

export const fetchPeriodoById = createAsyncThunk(
  'liquidacion/fetchPeriodoById',
  async (id: string) => {
    const response = await api.get(`${apiUrl}/liquidacion/${id}`);
    return response.data;
  }
);

export const createPeriodo = createAsyncThunk(
  'liquidacion/createPeriodo',
  async (data: {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    tipo: 'quincenal' | 'mensual';
  }) => {
    const response = await api.post(`${apiUrl}/liquidacion`, data);
    return response.data;
  }
);

export const agregarHorasExtra = createAsyncThunk(
  'liquidacion/agregarHorasExtra',
  async (data: {
    periodoId: string;
    empleadoId: string;
    horaExtraId: string;
  }) => {
    const response = await api.post(`${apiUrl}/liquidacion/horas-extra`, data);
    return response.data;
  }
);

export const registrarAdelanto = createAsyncThunk(
  'liquidacion/registrarAdelanto',
  async (data: {
    periodoId: string;
    empleadoId: string;
    monto: number;
    banco?: string;
    observaciones?: string;
  }) => {
    const response = await api.post(`${apiUrl}/liquidacion/adelanto`, data);
    return response.data;
  }
);

export const liquidarEmpleado = createAsyncThunk(
  'liquidacion/liquidarEmpleado',
  async (data: {
    periodoId: string;
    empleadoId: string;
    observaciones?: string;
    medioDePago: string;
    banco: string;
    descuentos?: Array<{ id?: string; monto?: number; esPorcentaje?: boolean }>;
    incentivos?: Array<{ id?: string; monto?: number; esPorcentaje?: boolean }>;
    calculos?: {
      adicionalPresentismo?: number;
      adicionalZona?: number;
      adicionalAntiguedad?: number;
      totalAportesEmpleado?: number;
      totalContribucionesPatronales?: number;
      sueldoBasePeriodo?: number;
      montoNetoPagar?: number;
      costoTotalEmpresa?: number;
      aporteJubilacion?: number;
      aporteObraSocial?: number;
      aportePami?: number;
      aporteSindicato?: number;
      contribJubilacion?: number;
      contribObraSocial?: number;
      contribPami?: number;
      contribART?: number;
      totalAPagar?: number;
    };
  }) => {
    const response = await api.post('/api/liquidacion/liquidar', data);
    return response.data;
  }
);

export const cerrarPeriodo = createAsyncThunk(
  'liquidacion/cerrarPeriodo',
  async (data: {
    id: string;
    cerradoPor: string;
    observaciones?: string;
  }) => {
    const { id, ...body } = data;
    const response = await api.post(`${apiUrl}/liquidacion/${id}/cerrar`, body);
    return response.data;
  }
);

export const agregarEmpleado = createAsyncThunk(
  'liquidacion/agregarEmpleado',
  async (data: {
    periodoId: string;
    empleadoId: string;
  }) => {
    const response = await api.post(`${apiUrl}/liquidacion/agregar-empleado`, data);
    return response.data;
  }
);

export const actualizarEstadoPeriodo = createAsyncThunk(
  'liquidacion/actualizarEstadoPeriodo',
  async (data: {
    id: string;
    estado: 'abierto' | 'en_revision' | 'cerrado';
  }) => {
    const { id, estado } = data;
    const response = await api.patch(`${apiUrl}/liquidacion/${id}/estado`, { estado });
    return response.data;
  }
);

export const deletePeriodo = createAsyncThunk(
  'liquidacion/deletePeriodo',
  async (id: string) => {
    await api.delete(`${apiUrl}/liquidacion/${id}`);
    return id;
  }
);

const liquidacionSlice = createSlice({
  name: 'liquidacion',
  initialState,
  reducers: {
    setPeriodoActual: (state, action: PayloadAction<LiquidacionPeriodo | null>) => {
      state.periodoActual = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.status = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch períodos
      .addCase(fetchPeriodos.pending, (state) => {
        state.loading = true;
        state.status = 'loading';
      })
      .addCase(fetchPeriodos.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPeriodos.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar períodos';
      })
      
      // Fetch período by ID
      .addCase(fetchPeriodoById.pending, (state) => {
        state.loading = true;
        state.status = 'loading';
      })
      .addCase(fetchPeriodoById.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'succeeded';
        state.periodoActual = action.payload;
      })
      .addCase(fetchPeriodoById.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar período';
      })
      
      // Create período
      .addCase(createPeriodo.pending, (state) => {
        state.loading = true;
        state.status = 'loading';
      })
      .addCase(createPeriodo.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'succeeded';
        state.items.unshift(action.payload);
        state.periodoActual = action.payload;
      })
      .addCase(createPeriodo.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        // Capturar el mensaje específico del backend
        let errorMessage = null;

        if (action.payload) {
          const error = action.payload as any;
          errorMessage = error?.message || error?.error || error?.data?.message || errorMessage;
        } else if (action.error?.message) {
          // Intentar extraer mensaje específico del error de axios
          try {
            const parsedError = JSON.parse(action.error.message);
            errorMessage = parsedError?.message || parsedError?.error || action.error.message;
          } catch {
            errorMessage = 'Error al crear período';
          }
        }

        state.error = errorMessage;
      })
      
      // Agregar empleado
      .addCase(agregarEmpleado.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const periodo = action.payload.periodo;
        const index = state.items.findIndex(p => p._id === periodo._id);
        if (index !== -1) {
          state.items[index] = periodo;
        }
        if (state.periodoActual?._id === periodo._id) {
          state.periodoActual = periodo;
        }
      })

      // Agregar horas extra
      .addCase(agregarHorasExtra.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.periodoActual?._id === action.payload._id) {
          state.periodoActual = action.payload;
        }
      })
      
      // Registrar adelanto
      .addCase(registrarAdelanto.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.periodoActual?._id === action.payload._id) {
          state.periodoActual = action.payload;
        }
      })
      
      // Liquidar empleado
      .addCase(liquidarEmpleado.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const periodo = action.payload.periodo;
        const index = state.items.findIndex(p => p._id === periodo._id);
        if (index !== -1) {
          state.items[index] = periodo;
        }
        if (state.periodoActual?._id === periodo._id) {
          state.periodoActual = periodo;
        }
      })
      
      // Cerrar período
      .addCase(cerrarPeriodo.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.periodoActual?._id === action.payload._id) {
          state.periodoActual = action.payload;
        }
      })
      
      // Actualizar estado
      .addCase(actualizarEstadoPeriodo.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.periodoActual?._id === action.payload._id) {
          state.periodoActual = action.payload;
        }
      })
      
      // Delete período
      .addCase(deletePeriodo.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(p => p._id !== action.payload);
        if (state.periodoActual?._id === action.payload) {
          state.periodoActual = null;
        }
      });
  }
});

export const { setPeriodoActual, clearError } = liquidacionSlice.actions;
export default liquidacionSlice.reducer;
