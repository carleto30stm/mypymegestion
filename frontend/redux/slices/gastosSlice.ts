import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { gastosAPI } from '../../services/api';
import { Gasto } from '../../types';

interface GastosState {
  items: Gasto[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastUpdated: number; // Timestamp para tracking de cambios
}

const initialState: GastosState = {
  items: [],
  status: 'idle',
  error: null,
  lastUpdated: Date.now(),
};

interface FetchGastosParams {
  desde?: string;  // Formato: YYYY-MM-DD
  hasta?: string;  // Formato: YYYY-MM-DD
  limite?: number;
  todosPeriodos?: boolean; // Flag para traer todos los registros
}

export const fetchGastos = createAsyncThunk(
  'gastos/fetchGastos', 
  async (params: FetchGastosParams = {}, { rejectWithValue }) => {
    try {
      // Si explícitamente pide todos los períodos, no enviar filtros de fecha
      if (params.todosPeriodos) {
        const response = await api.get('/api/gastos');
        return response.data;
      }
      
      // Por defecto: últimos 3 meses
      const hasta = params.hasta || new Date().toISOString().split('T')[0];
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      const desde = params.desde || tresMesesAtras.toISOString().split('T')[0];
      
      // Construir query params
      const queryParams = new URLSearchParams();
      queryParams.append('desde', desde);
      queryParams.append('hasta', hasta);
      if (params.limite) {
        queryParams.append('limite', params.limite.toString());
      }
      
      const response = await api.get(`/api/gastos?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

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
      .addCase(createGasto.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        state.status = 'succeeded';
        // Agregar al inicio del array para que aparezca primero
        state.items.unshift(action.payload);
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(createGasto.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateGasto.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(updateGasto.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteGasto.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(item => item._id !== action.payload);
        state.lastUpdated = Date.now();
      })
      // Cancel
      .addCase(cancelGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.lastUpdated = Date.now();
      })
      // Reactivate
      .addCase(reactivateGasto.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.lastUpdated = Date.now();
      })
      // Confirmar cheque
      .addCase(confirmarCheque.fulfilled, (state, action: PayloadAction<Gasto>) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.lastUpdated = Date.now();
      })
      // Disponer cheque - recargar todos los gastos ya que se crean nuevas entradas
      .addCase(disponerCheque.fulfilled, (state, action) => {
        // La acción devuelve múltiples operaciones, mejor recargar todo
        // Esto se maneja desde el componente con fetchGastos()
        state.lastUpdated = Date.now();
      });
  },
});

export default gastosSlice.reducer;
