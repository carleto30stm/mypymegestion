import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Remito, EstadisticasRemitos } from '../../types';

interface RemitosState {
  items: Remito[];
  estadisticas: EstadisticasRemitos | null;
  loading: boolean;
  error: string | null;
}

const initialState: RemitosState = {
  items: [],
  estadisticas: null,
  loading: false,
  error: null,
};

// Thunks
export const fetchRemitos = createAsyncThunk(
  'remitos/fetchRemitos',
  async (filtros?: { estado?: string; repartidor?: string; fechaInicio?: string; fechaFin?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.repartidor) params.append('repartidor', filtros.repartidor);
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
    
    const response = await api.get(`/api/remitos?${params.toString()}`);
    return response.data;
  }
);

export const fetchRemitoById = createAsyncThunk(
  'remitos/fetchRemitoById',
  async (id: string) => {
    const response = await api.get(`/api/remitos/${id}`);
    return response.data;
  }
);

export const generarRemitoDesdeVenta = createAsyncThunk(
  'remitos/generarRemitoDesdeVenta',
  async (data: {
    ventaId: string;
    direccionEntrega?: string;
    repartidor?: string;
    medioEnvio?: string;
    numeroBultos?: string;
    observaciones?: string;
    creadoPor: string;
  }) => {
    const response = await api.post('/api/remitos/desde-venta', data);
    return response.data;
  }
);

export const actualizarEstadoRemito = createAsyncThunk(
  'remitos/actualizarEstadoRemito',
  async (data: {
    id: string;
    estado: string;
    nombreReceptor?: string;
    dniReceptor?: string;
    firmaDigital?: string;
    motivoCancelacion?: string;
    modificadoPor: string;
  }) => {
    const { id, ...updateData } = data;
    const response = await api.patch(`/api/remitos/${id}/estado`, updateData);
    return response.data;
  }
);

export const actualizarItemsRemito = createAsyncThunk(
  'remitos/actualizarItemsRemito',
  async (data: {
    id: string;
    items: Array<{ productoId: string; cantidadEntregada: number; observacion?: string }>;
    modificadoPor: string;
  }) => {
    const { id, ...updateData } = data;
    const response = await api.patch(`/api/remitos/${id}/items`, updateData);
    return response.data;
  }
);

export const actualizarRemito = createAsyncThunk(
  'remitos/actualizarRemito',
  async (data: {
    id: string;
    direccionEntrega?: string;
    repartidor?: string;
    numeroBultos?: string;
    medioEnvio?: string;
    observaciones?: string;
    modificadoPor: string;
  }) => {
    const { id, ...updateData } = data;
    const response = await api.patch(`/api/remitos/${id}`, updateData);
    return response.data;
  }
);

export const eliminarRemito = createAsyncThunk(
  'remitos/eliminarRemito',
  async (id: string) => {
    await api.delete(`/api/remitos/${id}`);
    return id;
  }
);

export const fetchEstadisticasRemitos = createAsyncThunk(
  'remitos/fetchEstadisticasRemitos',
  async () => {
    const response = await api.get('/api/remitos/estadisticas');
    return response.data;
  }
);

const remitosSlice = createSlice({
  name: 'remitos',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch remitos
      .addCase(fetchRemitos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRemitos.fulfilled, (state, action: PayloadAction<Remito[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRemitos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar remitos';
      })
      
      // Fetch remito by ID
      .addCase(fetchRemitoById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRemitoById.fulfilled, (state, action: PayloadAction<Remito>) => {
        state.loading = false;
        const index = state.items.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchRemitoById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar remito';
      })
      
      // Generar remito desde venta
      .addCase(generarRemitoDesdeVenta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generarRemitoDesdeVenta.fulfilled, (state, action: PayloadAction<Remito>) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(generarRemitoDesdeVenta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al generar remito';
      })
      
      // Actualizar estado remito
      .addCase(actualizarEstadoRemito.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(actualizarEstadoRemito.fulfilled, (state, action: PayloadAction<Remito>) => {
        state.loading = false;
        const index = state.items.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(actualizarEstadoRemito.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al actualizar estado';
      })
      
      // Actualizar items remito
      .addCase(actualizarItemsRemito.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(actualizarItemsRemito.fulfilled, (state, action: PayloadAction<Remito>) => {
        state.loading = false;
        const index = state.items.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(actualizarItemsRemito.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al actualizar items';
      })
      
      // Actualizar remito
      .addCase(actualizarRemito.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(actualizarRemito.fulfilled, (state, action: PayloadAction<Remito>) => {
        state.loading = false;
        const index = state.items.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(actualizarRemito.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al actualizar remito';
      })
      
      // Eliminar remito
      .addCase(eliminarRemito.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(eliminarRemito.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.items = state.items.filter(r => r._id !== action.payload);
      })
      .addCase(eliminarRemito.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al eliminar remito';
      })
      
      // Fetch estadísticas
      .addCase(fetchEstadisticasRemitos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEstadisticasRemitos.fulfilled, (state, action: PayloadAction<EstadisticasRemitos>) => {
        state.loading = false;
        state.estadisticas = action.payload;
      })
      .addCase(fetchEstadisticasRemitos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar estadísticas';
      });
  },
});

export const { clearError } = remitosSlice.actions;
export default remitosSlice.reducer;
