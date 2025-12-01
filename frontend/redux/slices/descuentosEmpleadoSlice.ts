import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { DescuentoEmpleado } from '../../types';

interface DescuentosEmpleadoState {
  items: DescuentoEmpleado[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: DescuentosEmpleadoState = {
  items: [],
  status: 'idle',
  error: null,
};

// Filtros opcionales para fetch
interface FetchDescuentosParams {
  empleadoId?: string;
  periodoAplicacion?: string;
  estado?: string;
  tipo?: string;
}

// Async thunks
export const fetchDescuentos = createAsyncThunk(
  'descuentosEmpleado/fetchDescuentos',
  async (params?: FetchDescuentosParams) => {
    const queryParams = new URLSearchParams();
    if (params?.empleadoId) queryParams.append('empleadoId', params.empleadoId);
    if (params?.periodoAplicacion) queryParams.append('periodoAplicacion', params.periodoAplicacion);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    
    const queryString = queryParams.toString();
    const url = `/api/descuentos-empleado${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }
);

export const fetchDescuentosByEmpleado = createAsyncThunk(
  'descuentosEmpleado/fetchByEmpleado',
  async (empleadoId: string) => {
    const response = await api.get(`/api/descuentos-empleado/empleado/${empleadoId}`);
    return response.data;
  }
);

export const fetchDescuentosByPeriodo = createAsyncThunk(
  'descuentosEmpleado/fetchByPeriodo',
  async (periodo: string) => {
    const response = await api.get(`/api/descuentos-empleado/periodo/${periodo}`);
    return response.data;
  }
);

export const addDescuento = createAsyncThunk(
  'descuentosEmpleado/addDescuento',
  async (descuento: Omit<DescuentoEmpleado, '_id'>) => {
    const response = await api.post('/api/descuentos-empleado', descuento);
    return response.data;
  }
);

export const updateDescuento = createAsyncThunk(
  'descuentosEmpleado/updateDescuento',
  async ({ id, descuento }: { id: string; descuento: Partial<DescuentoEmpleado> }) => {
    const response = await api.put(`/api/descuentos-empleado/${id}`, descuento);
    return response.data;
  }
);

export const changeDescuentoEstado = createAsyncThunk(
  'descuentosEmpleado/changeEstado',
  async ({ id, estado }: { id: string; estado: 'pendiente' | 'aplicado' | 'anulado' }) => {
    const response = await api.patch(`/api/descuentos-empleado/${id}/estado`, { estado });
    return response.data;
  }
);

export const deleteDescuento = createAsyncThunk(
  'descuentosEmpleado/deleteDescuento',
  async (id: string) => {
    await api.delete(`/api/descuentos-empleado/${id}`);
    return id;
  }
);

const descuentosEmpleadoSlice = createSlice({
  name: 'descuentosEmpleado',
  initialState,
  reducers: {
    clearDescuentos: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch descuentos
      .addCase(fetchDescuentos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDescuentos.fulfilled, (state, action: PayloadAction<DescuentoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchDescuentos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar descuentos';
      })
      // Fetch by empleado
      .addCase(fetchDescuentosByEmpleado.fulfilled, (state, action: PayloadAction<DescuentoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      // Fetch by periodo
      .addCase(fetchDescuentosByPeriodo.fulfilled, (state, action: PayloadAction<DescuentoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      // Add descuento
      .addCase(addDescuento.fulfilled, (state, action: PayloadAction<DescuentoEmpleado>) => {
        state.items.unshift(action.payload);
      })
      // Update descuento
      .addCase(updateDescuento.fulfilled, (state, action: PayloadAction<DescuentoEmpleado>) => {
        const index = state.items.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Change estado
      .addCase(changeDescuentoEstado.fulfilled, (state, action: PayloadAction<DescuentoEmpleado>) => {
        const index = state.items.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete descuento
      .addCase(deleteDescuento.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(d => d._id !== action.payload);
      });
  },
});

export const { clearDescuentos } = descuentosEmpleadoSlice.actions;
export default descuentosEmpleadoSlice.reducer;
