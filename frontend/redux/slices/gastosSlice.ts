import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { gastosAPI } from '../../services/api';
import { Gasto } from '../../types';

interface GastosState {
  items: Gasto[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: GastosState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchGastos = createAsyncThunk('gastos/fetchGastos', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/gastos');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch expenses');
  }
});

export const createGasto = createAsyncThunk('/api/gastos/createGasto', async (newGasto: Omit<Gasto, '_id'>, { rejectWithValue }) => {
  try {
    const response = await api.post('/api/gastos', newGasto);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create expense');
  }
});

export const updateGasto = createAsyncThunk('/apigastos/updateGasto', async (gastoToUpdate: Gasto, { rejectWithValue }) => {
    try {
      const { _id, ...gastoData } = gastoToUpdate;
      const response = await api.put(`/api/gastos/${_id}`, gastoData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update expense');
    }
  }
);

export const deleteGasto = createAsyncThunk(
  'gastos/deleteGasto',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/gastos/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete gasto');
    }
  }
);

// Nueva acción para cancelar gastos (oper_ad)
export const cancelGasto = createAsyncThunk(
  'gastos/cancelGasto',
  async ({ id, comentario }: { id: string; comentario: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/gastos/${id}/cancel`, { comentario });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel gasto');
    }
  }
);

// Nueva acción para reactivar gastos (solo admin)
export const reactivateGasto = createAsyncThunk(
  'gastos/reactivateGasto',
  async ({ id, comentario }: { id: string; comentario: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/gastos/${id}/reactivate`, { comentario });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reactivate gasto');
    }
  }
);

export const confirmarCheque = createAsyncThunk(
  'gastos/confirmarCheque',
  async (chequeId: string, { rejectWithValue }) => {
    try {
      const response = await gastosAPI.confirmarCheque(chequeId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm check');
    }
  }
);

export const disponerCheque = createAsyncThunk(
  'gastos/disponerCheque',
  async ({ chequeId, tipoDisposicion, destino, detalleOperacion }: {
    chequeId: string;
    tipoDisposicion: 'depositar' | 'pagar_proveedor';
    destino: string;
    detalleOperacion: string;
  }, { rejectWithValue }) => {
    try {
      const response = await gastosAPI.disponerCheque(chequeId, tipoDisposicion, destino, detalleOperacion);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dispose check');
    }
  }
);


const gastosSlice = createSlice({
  name: 'gastos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchGastos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGastos.fulfilled, (state, action: PayloadAction<Gasto[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchGastos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Create
      .addCase(createGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        state.items.push(action.payload);
      })
      // Update
      .addCase(updateGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteGasto.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      // Cancel
      .addCase(cancelGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Reactivate
      .addCase(reactivateGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Confirmar cheque
      .addCase(confirmarCheque.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Disponer cheque - recargar todos los gastos ya que se crean nuevas entradas
      .addCase(disponerCheque.fulfilled, (state, action) => {
        // La acción devuelve múltiples operaciones, mejor recargar todo
        // Esto se maneja desde el componente con fetchGastos()
      });
  },
});

export default gastosSlice.reducer;
