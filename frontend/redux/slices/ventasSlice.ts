import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { ventasAPI } from '../../services/api';
import { Venta, EstadisticasVentas } from '../../types';

interface VentasState {
  items: Venta[];
  total: number; // total de registros disponibles en el servidor
  sinFacturar: Venta[]; // Ventas confirmadas que requieren facturación
  estadisticas: EstadisticasVentas | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: VentasState = {
  items: [],
  total: 0,
  sinFacturar: [],
  estadisticas: null,
  status: 'idle',
  error: null,
};

// Thunks
export const fetchVentas = createAsyncThunk('ventas/fetchVentas', async (params: { page?: number; limit?: number; fechaInicio?: string; fechaFin?: string; all?: boolean; estado?: string } | undefined, { rejectWithValue }) => {
  try {
    const p = params || {};
    const search = new URLSearchParams();
    if (p.page) search.append('page', String(p.page));
    if (p.limit) search.append('limit', String(p.limit));
    if (p.fechaInicio) search.append('fechaInicio', String(p.fechaInicio));
    if (p.fechaFin) search.append('fechaFin', String(p.fechaFin));
    if (p.all) search.append('all', 'true');
    if (p.estado) search.append('estado', String(p.estado));

    const qs = search.toString() ? `?${search.toString()}` : '';
    const response = await api.get(`/api/ventas${qs}`);
    // response.data -> { ventas, total, page, limit } or { ventas } for compatibility
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al cargar ventas');
  }
});

export const fetchVentasByRango = createAsyncThunk(
  'ventas/fetchByRango',
  async ({ fechaInicio, fechaFin }: { fechaInicio: string; fechaFin: string }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/ventas/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar ventas');
    }
  }
);

export const createVenta = createAsyncThunk(
  'ventas/create',
  async (newVenta: Omit<Venta, '_id' | 'numeroVenta' | 'fechaCreacion' | 'fechaActualizacion'>, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/ventas', newVenta);
      return response.data.venta;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear venta');
    }
  }
);

export const updateVenta = createAsyncThunk(
  'ventas/update',
  async ({ id, ventaData }: { id: string; ventaData: Partial<Venta> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/ventas/${id}`, ventaData);
      return response.data.venta;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar venta');
    }
  }
);

export const anularVenta = createAsyncThunk(
  'ventas/anular',
  async ({ id, motivoAnulacion }: { id: string; motivoAnulacion: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/ventas/${id}/anular`, { motivoAnulacion });
      return response.data.venta;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al anular venta');
    }
  }
);

export const confirmarVenta = createAsyncThunk(
  'ventas/confirmar',
  async ({ id, usuarioConfirmacion }: { id: string; usuarioConfirmacion: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/ventas/${id}/confirmar`, { creadoPor: usuarioConfirmacion, usuarioConfirmacion });
      return response.data.venta;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al confirmar venta');
    }
  }
);

export const registrarPago = createAsyncThunk(
  'ventas/registrarPago',
  async ({ id, montoPago, medioPago, banco, observaciones }: { id: string; montoPago: number; medioPago: string; banco?: string; observaciones?: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/ventas/${id}/registrar-pago`, { montoPago, medioPago, banco, observaciones });
      return response.data.venta;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al registrar pago');
    }
  }
);

export const fetchEstadisticasVentas = createAsyncThunk(
  'ventas/fetchEstadisticas',
  async ({ fechaInicio, fechaFin }: { fechaInicio?: string; fechaFin?: string }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      const response = await api.get(`/api/ventas/estadisticas?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  }
);

export const fetchVentasSinFacturar = createAsyncThunk(
  'ventas/fetchSinFacturar',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ventasAPI.getSinFacturar();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar ventas sin facturar');
    }
  }
);

const ventasSlice = createSlice({
  name: 'ventas',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch ventas
      .addCase(fetchVentas.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVentas.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        // payload may be { ventas, total } or ventas[] (legacy)
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
          state.total = action.payload.length;
        } else {
          state.items = action.payload.ventas || [];
          state.total = action.payload.total ?? state.items.length;
        }
      })
      .addCase(fetchVentas.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Fetch by rango
      .addCase(fetchVentasByRango.fulfilled, (state, action: PayloadAction<Venta[]>) => {
        state.items = action.payload;
      })
      // Create venta
      .addCase(createVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        state.items.unshift(action.payload);
      })
      // Update venta
      .addCase(updateVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Confirmar venta
      .addCase(confirmarVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Anular venta
      .addCase(anularVenta.fulfilled, (state, action: PayloadAction<Venta>) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Registrar pago
      .addCase(registrarPago.fulfilled, (state, action: PayloadAction<Venta>) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Fetch estadísticas
      .addCase(fetchEstadisticasVentas.fulfilled, (state, action: PayloadAction<EstadisticasVentas>) => {
        state.estadisticas = action.payload;
      })
      // Fetch ventas sin facturar
      .addCase(fetchVentasSinFacturar.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVentasSinFacturar.fulfilled, (state, action: PayloadAction<Venta[]>) => {
        state.status = 'succeeded';
        state.sinFacturar = action.payload;
      })
      .addCase(fetchVentasSinFacturar.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export default ventasSlice.reducer;
