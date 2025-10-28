import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { HoraExtra } from '../../types';

interface HorasExtraState {
  items: HoraExtra[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: HorasExtraState = {
  items: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchHorasExtra = createAsyncThunk(
  'horasExtra/fetchHorasExtra',
  async () => {
    const response = await api.get('/api/horas-extra');
    return response.data;
  }
);

export const fetchHorasExtraByEmployee = createAsyncThunk(
  'horasExtra/fetchHorasExtraByEmployee',
  async (empleadoId: string) => {
    const response = await api.get(`/api/horas-extra/empleado/${empleadoId}`);
    return response.data;
  }
);

export const addHoraExtra = createAsyncThunk(
  'horasExtra/addHoraExtra',
  async (horaExtra: Omit<HoraExtra, '_id' | 'fechaCreacion' | 'montoTotal'>) => {
    const response = await api.post('/api/horas-extra', horaExtra);
    return response.data;
  }
);

export const updateHoraExtra = createAsyncThunk(
  'horasExtra/updateHoraExtra',
  async ({ id, horaExtra }: { id: string; horaExtra: Partial<HoraExtra> }) => {
    const response = await api.put(`/api/horas-extra/${id}`, horaExtra);
    return response.data;
  }
);

export const marcarComoPagada = createAsyncThunk(
  'horasExtra/marcarComoPagada',
  async ({ id, paymentData }: { id: string; paymentData: { medioDePago: string; banco: string; comentario: string } }) => {
    const response = await api.patch(`/api/horas-extra/${id}/pagar`, paymentData);
    return response.data;
  }
);

export const cancelarHoraExtra = createAsyncThunk(
  'horasExtra/cancelarHoraExtra',
  async (id: string) => {
    const response = await api.patch(`/api/horas-extra/${id}/cancelar`);
    return response.data;
  }
);

export const deleteHoraExtra = createAsyncThunk(
  'horasExtra/deleteHoraExtra',
  async (id: string) => {
    await api.delete(`/api/horas-extra/${id}`);
    return id;
  }
);

const horasExtraSlice = createSlice({
  name: 'horasExtra',
  initialState,
  reducers: {
    clearHorasExtra: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch horas extra
      .addCase(fetchHorasExtra.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchHorasExtra.fulfilled, (state, action: PayloadAction<HoraExtra[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchHorasExtra.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar horas extra';
      })
      // Fetch horas extra by employee
      .addCase(fetchHorasExtraByEmployee.fulfilled, (state, action: PayloadAction<HoraExtra[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      // Add hora extra
      .addCase(addHoraExtra.fulfilled, (state, action: PayloadAction<HoraExtra>) => {
        state.items.unshift(action.payload); // Agregar al principio para mostrar los más recientes
      })
      // Update hora extra
      .addCase(updateHoraExtra.fulfilled, (state, action: PayloadAction<HoraExtra>) => {
        const index = state.items.findIndex(hora => hora._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Marcar como pagada
      .addCase(marcarComoPagada.fulfilled, (state, action: PayloadAction<{ horaExtra: HoraExtra; gastoCreado: any }>) => {
        const index = state.items.findIndex(hora => hora._id === action.payload.horaExtra._id);
        if (index !== -1) {
          state.items[index] = action.payload.horaExtra;
        }
      })
      // Cancelar hora extra
      .addCase(cancelarHoraExtra.fulfilled, (state, action: PayloadAction<HoraExtra>) => {
        const index = state.items.findIndex(hora => hora._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete hora extra
      .addCase(deleteHoraExtra.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(hora => hora._id !== action.payload);
      });
  },
});

export const { clearHorasExtra } = horasExtraSlice.actions;
export default horasExtraSlice.reducer;