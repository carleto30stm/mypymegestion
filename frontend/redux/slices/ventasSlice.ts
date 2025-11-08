import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Venta, EstadisticasVentas } from '../../types';

interface VentasState {
  items: Venta[];
  estadisticas: EstadisticasVentas | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: VentasState = {
  items: [],
  estadisticas: null,
  status: 'idle',
  error: null,
};

// Thunks
export const fetchVentas = createAsyncThunk('ventas/fetchVentas', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/ventas');
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
      .addCase(fetchVentas.fulfilled, (state, action: PayloadAction<Venta[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
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
      });
  },
});

export default ventasSlice.reducer;
