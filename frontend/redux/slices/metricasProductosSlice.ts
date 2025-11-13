import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { EstadisticasProductos } from '../../types';

interface MetricasProductosState {
  estadisticas: EstadisticasProductos | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: MetricasProductosState = {
  estadisticas: null,
  status: 'idle',
  error: null,
};

// Thunk para obtener estadísticas de productos
export const fetchEstadisticasProductos = createAsyncThunk(
  'metricasProductos/fetchEstadisticas',
  async (params?: {
    fechaInicio?: string;
    fechaFin?: string;
    categoria?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params?.fechaInicio) queryParams.append('fechaInicio', params.fechaInicio);
    if (params?.fechaFin) queryParams.append('fechaFin', params.fechaFin);
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await api.get(`/api/ventas/estadisticas-productos?${queryParams.toString()}`);
    return response.data;
  }
);

const metricasProductosSlice = createSlice({
  name: 'metricasProductos',
  initialState,
  reducers: {
    limpiarEstadisticas: (state) => {
      state.estadisticas = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEstadisticasProductos.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEstadisticasProductos.fulfilled, (state, action: PayloadAction<EstadisticasProductos>) => {
        state.status = 'succeeded';
        state.estadisticas = action.payload;
      })
      .addCase(fetchEstadisticasProductos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al obtener estadísticas de productos';
      });
  },
});

export const { limpiarEstadisticas } = metricasProductosSlice.actions;
export default metricasProductosSlice.reducer;
