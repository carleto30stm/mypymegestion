import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
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

export const deleteGasto = createAsyncThunk('/api/gastos/deleteGasto', async (gastoId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/gastos/${gastoId}`);
      return gastoId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete expense');
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
      });
  },
});

export default gastosSlice.reducer;
