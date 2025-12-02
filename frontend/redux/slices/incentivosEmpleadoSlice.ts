import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { IncentivoEmpleado } from '../../types';

interface IncentivosEmpleadoState {
  items: IncentivoEmpleado[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: IncentivosEmpleadoState = {
  items: [],
  status: 'idle',
  error: null,
};

// Filtros opcionales para fetch
interface FetchIncentivosParams {
  empleadoId?: string;
  periodoAplicacion?: string;
  estado?: string;
  tipo?: string;
}

// Async thunks
export const fetchIncentivos = createAsyncThunk(
  'incentivosEmpleado/fetchIncentivos',
  async (params?: FetchIncentivosParams) => {
    const queryParams = new URLSearchParams();
    if (params?.empleadoId) queryParams.append('empleadoId', params.empleadoId);
    if (params?.periodoAplicacion) queryParams.append('periodoAplicacion', params.periodoAplicacion);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    
    const queryString = queryParams.toString();
    const url = `/api/incentivos-empleado${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  }
);

export const fetchIncentivosByEmpleado = createAsyncThunk(
  'incentivosEmpleado/fetchByEmpleado',
  async (empleadoId: string) => {
    const response = await api.get(`/api/incentivos-empleado/empleado/${empleadoId}`);
    return response.data;
  }
);

export const fetchIncentivosByPeriodo = createAsyncThunk(
  'incentivosEmpleado/fetchByPeriodo',
  async (periodo: string) => {
    const response = await api.get(`/api/incentivos-empleado/periodo/${periodo}`);
    return response.data;
  }
);

export const addIncentivo = createAsyncThunk(
  'incentivosEmpleado/addIncentivo',
  async (incentivo: Omit<IncentivoEmpleado, '_id'>) => {
    const response = await api.post('/api/incentivos-empleado', incentivo);
    return response.data;
  }
);

export const updateIncentivo = createAsyncThunk(
  'incentivosEmpleado/updateIncentivo',
  async ({ id, incentivo }: { id: string; incentivo: Partial<IncentivoEmpleado> }) => {
    const response = await api.put(`/api/incentivos-empleado/${id}`, incentivo);
    return response.data;
  }
);

export const changeIncentivoEstado = createAsyncThunk(
  'incentivosEmpleado/changeEstado',
  async ({ id, estado }: { id: string; estado: 'pendiente' | 'pagado' | 'anulado' }) => {
    const response = await api.patch(`/api/incentivos-empleado/${id}/estado`, { estado });
    return response.data;
  }
);

export const deleteIncentivo = createAsyncThunk(
  'incentivosEmpleado/deleteIncentivo',
  async (id: string) => {
    await api.delete(`/api/incentivos-empleado/${id}`);
    return id;
  }
);

const incentivosEmpleadoSlice = createSlice({
  name: 'incentivosEmpleado',
  initialState,
  reducers: {
    clearIncentivos: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch incentivos
      .addCase(fetchIncentivos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchIncentivos.fulfilled, (state, action: PayloadAction<IncentivoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchIncentivos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar incentivos';
      })
      // Fetch by empleado
      .addCase(fetchIncentivosByEmpleado.fulfilled, (state, action: PayloadAction<IncentivoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      // Fetch by periodo
      .addCase(fetchIncentivosByPeriodo.fulfilled, (state, action: PayloadAction<IncentivoEmpleado[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      // Add incentivo
      .addCase(addIncentivo.fulfilled, (state, action: PayloadAction<IncentivoEmpleado>) => {
        state.items.unshift(action.payload);
      })
      // Update incentivo
      .addCase(updateIncentivo.fulfilled, (state, action: PayloadAction<IncentivoEmpleado>) => {
        const index = state.items.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Change estado
      .addCase(changeIncentivoEstado.fulfilled, (state, action: PayloadAction<IncentivoEmpleado>) => {
        const index = state.items.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete incentivo
      .addCase(deleteIncentivo.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(i => i._id !== action.payload);
      });
  },
});

export const { clearIncentivos } = incentivosEmpleadoSlice.actions;
export default incentivosEmpleadoSlice.reducer;
