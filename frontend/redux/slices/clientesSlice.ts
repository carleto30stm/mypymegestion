import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Cliente } from '../../types';

interface ClientesState {
  items: Cliente[];
  clientesActivos: Cliente[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ClientesState = {
  items: [],
  clientesActivos: [],
  status: 'idle',
  error: null,
};

// Thunks
export const fetchClientes = createAsyncThunk('clientes/fetchClientes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/clientes');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al cargar clientes');
  }
});

export const fetchClientesActivos = createAsyncThunk('clientes/fetchActivos', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/clientes/activos');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al cargar clientes activos');
  }
});

export const createCliente = createAsyncThunk('clientes/create', async (newCliente: Omit<Cliente, '_id'>, { rejectWithValue }) => {
  try {
    const response = await api.post('/api/clientes', newCliente);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al crear cliente');
  }
});

export const updateCliente = createAsyncThunk('clientes/update', async (cliente: Cliente, { rejectWithValue }) => {
  try {
    const { _id, ...clienteData } = cliente;
    const response = await api.put(`/api/clientes/${_id}`, clienteData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al actualizar cliente');
  }
});

export const actualizarSaldo = createAsyncThunk(
  'clientes/actualizarSaldo',
  async ({ id, monto, operacion, concepto }: { id: string; monto: number; operacion: 'cargo' | 'pago'; concepto: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/clientes/${id}/saldo`, { monto, operacion, concepto });
      return response.data.cliente;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar saldo');
    }
  }
);

export const deleteCliente = createAsyncThunk('clientes/delete', async (id: string, { rejectWithValue }) => {
  try {
    await api.delete(`/api/clientes/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al eliminar cliente');
  }
});

export const reactivarCliente = createAsyncThunk('clientes/reactivar', async (id: string, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/api/clientes/${id}/reactivar`);
    return response.data.cliente;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al reactivar cliente');
  }
});

const clientesSlice = createSlice({
  name: 'clientes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch clientes
      .addCase(fetchClientes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClientes.fulfilled, (state, action: PayloadAction<Cliente[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Fetch clientes activos
      .addCase(fetchClientesActivos.fulfilled, (state, action: PayloadAction<Cliente[]>) => {
        state.clientesActivos = action.payload;
      })
      // Create cliente
      .addCase(createCliente.fulfilled, (state, action: PayloadAction<Cliente>) => {
        state.items.push(action.payload);
      })
      // Update cliente
      .addCase(updateCliente.fulfilled, (state, action: PayloadAction<Cliente>) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Actualizar saldo
      .addCase(actualizarSaldo.fulfilled, (state, action: PayloadAction<Cliente>) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete cliente
      .addCase(deleteCliente.fulfilled, (state, action: PayloadAction<string>) => {
        const index = state.items.findIndex(c => c._id === action.payload);
        if (index !== -1) {
          state.items[index].estado = 'inactivo';
        }
      })
      // Reactivar cliente
      .addCase(reactivarCliente.fulfilled, (state, action: PayloadAction<Cliente>) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export default clientesSlice.reducer;
