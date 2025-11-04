import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { ReciboPago, EstadisticasCobranza } from '../../types';

interface RecibosState {
  items: ReciboPago[];
  estadisticas: EstadisticasCobranza | null;
  loading: boolean;
  error: string | null;
}

const initialState: RecibosState = {
  items: [],
  estadisticas: null,
  loading: false,
  error: null
};

// Thunks

// Obtener recibos con filtros
export const fetchRecibos = createAsyncThunk(
  'recibos/fetchRecibos',
  async (filtros?: {
    clienteId?: string;
    estadoRecibo?: string;
    momentoCobro?: string;
    fechaInicio?: string;
    fechaFin?: string;
    medioPago?: string;
  }) => {
    const params = new URLSearchParams();
    if (filtros?.clienteId) params.append('clienteId', filtros.clienteId);
    if (filtros?.estadoRecibo) params.append('estadoRecibo', filtros.estadoRecibo);
    if (filtros?.momentoCobro) params.append('momentoCobro', filtros.momentoCobro);
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
    if (filtros?.medioPago) params.append('medioPago', filtros.medioPago);

    const queryString = params.toString();
    const url = queryString ? `/api/recibos?${queryString}` : '/api/recibos';
    
    const response = await api.get(url);
    return response.data;
  }
);

// Obtener recibo por ID
export const fetchReciboById = createAsyncThunk(
  'recibos/fetchReciboById',
  async (id: string) => {
    const response = await api.get(`/api/recibos/${id}`);
    return response.data;
  }
);

// Crear nuevo recibo
export const crearRecibo = createAsyncThunk(
  'recibos/crearRecibo',
  async (datos: {
    clienteId: string;
    ventasIds: string[];
    formasPago: any[];
    momentoCobro: string;
    observaciones?: string;
    creadoPor: string;
  }) => {
    const response = await api.post('/api/recibos', datos);
    return response.data;
  }
);

// Anular recibo
export const anularRecibo = createAsyncThunk(
  'recibos/anularRecibo',
  async (datos: {
    id: string;
    motivoAnulacion: string;
    modificadoPor: string;
  }) => {
    const response = await api.patch(`/api/recibos/${datos.id}/anular`, {
      motivoAnulacion: datos.motivoAnulacion,
      modificadoPor: datos.modificadoPor
    });
    return response.data;
  }
);

// Obtener estadísticas de cobranza
export const fetchEstadisticasCobranza = createAsyncThunk(
  'recibos/fetchEstadisticasCobranza',
  async () => {
    const response = await api.get('/api/recibos/estadisticas');
    return response.data;
  }
);

// Obtener recibos por cliente
export const fetchRecibosPorCliente = createAsyncThunk(
  'recibos/fetchRecibosPorCliente',
  async (clienteId: string) => {
    const response = await api.get(`/api/recibos/cliente/${clienteId}`);
    return response.data;
  }
);

// Slice
const recibosSlice = createSlice({
  name: 'recibos',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // fetchRecibos
    builder.addCase(fetchRecibos.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecibos.fulfilled, (state, action: PayloadAction<ReciboPago[]>) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchRecibos.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al obtener recibos';
    });

    // fetchReciboById
    builder.addCase(fetchReciboById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReciboById.fulfilled, (state, action: PayloadAction<ReciboPago>) => {
      state.loading = false;
      // Actualizar o agregar el recibo en el array
      const index = state.items.findIndex(r => r._id === action.payload._id);
      if (index >= 0) {
        state.items[index] = action.payload;
      } else {
        state.items.unshift(action.payload);
      }
    });
    builder.addCase(fetchReciboById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al obtener recibo';
    });

    // crearRecibo
    builder.addCase(crearRecibo.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(crearRecibo.fulfilled, (state, action: PayloadAction<ReciboPago>) => {
      state.loading = false;
      state.items.unshift(action.payload);
    });
    builder.addCase(crearRecibo.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al crear recibo';
    });

    // anularRecibo
    builder.addCase(anularRecibo.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(anularRecibo.fulfilled, (state, action: PayloadAction<ReciboPago>) => {
      state.loading = false;
      // Actualizar el recibo en el array
      const index = state.items.findIndex(r => r._id === action.payload._id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    });
    builder.addCase(anularRecibo.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al anular recibo';
    });

    // fetchEstadisticasCobranza
    builder.addCase(fetchEstadisticasCobranza.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEstadisticasCobranza.fulfilled, (state, action: PayloadAction<EstadisticasCobranza>) => {
      state.loading = false;
      state.estadisticas = action.payload;
    });
    builder.addCase(fetchEstadisticasCobranza.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al obtener estadísticas';
    });

    // fetchRecibosPorCliente
    builder.addCase(fetchRecibosPorCliente.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecibosPorCliente.fulfilled, (state, action: PayloadAction<ReciboPago[]>) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchRecibosPorCliente.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al obtener recibos del cliente';
    });
  }
});

export const { clearError } = recibosSlice.actions;
export default recibosSlice.reducer;
