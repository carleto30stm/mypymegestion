import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { MovimientoCuentaCorriente, ResumenCuentaCorriente, AntiguedadDeuda } from '../../types';

interface CuentaCorrienteState {
  movimientos: MovimientoCuentaCorriente[];
  resumen: ResumenCuentaCorriente | null;
  antiguedad: AntiguedadDeuda | null;
  loading: boolean;
  error: string | null;
}

const initialState: CuentaCorrienteState = {
  movimientos: [],
  resumen: null,
  antiguedad: null,
  loading: false,
  error: null
};

// ========== ASYNC THUNKS ==========

// Obtener movimientos de un cliente
export const fetchMovimientos = createAsyncThunk(
  'cuentaCorriente/fetchMovimientos',
  async (params: { clienteId: string; desde?: string; hasta?: string; tipo?: string; incluirAnulados?: boolean }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.desde) queryParams.append('desde', params.desde);
      if (params.hasta) queryParams.append('hasta', params.hasta);
      if (params.tipo) queryParams.append('tipo', params.tipo);
      if (params.incluirAnulados !== undefined) queryParams.append('incluirAnulados', params.incluirAnulados.toString());

      const response = await api.get(`/api/cuenta-corriente/${params.clienteId}/movimientos?${queryParams.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener movimientos');
    }
  }
);

// Obtener resumen de cuenta corriente
export const fetchResumen = createAsyncThunk(
  'cuentaCorriente/fetchResumen',
  async (clienteId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/cuenta-corriente/${clienteId}/resumen`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener resumen');
    }
  }
);

// Obtener antigüedad de deuda
export const fetchAntiguedad = createAsyncThunk(
  'cuentaCorriente/fetchAntiguedad',
  async (clienteId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/cuenta-corriente/${clienteId}/antiguedad`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener antigüedad');
    }
  }
);

// Crear ajuste manual
export const crearAjuste = createAsyncThunk(
  'cuentaCorriente/crearAjuste',
  async (
    ajuste: {
      clienteId: string;
      tipo: 'ajuste_cargo' | 'ajuste_descuento';
      monto: number;
      concepto: string;
      observaciones?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post('/api/cuenta-corriente/ajuste', ajuste);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear ajuste');
    }
  }
);

// Anular movimiento
export const anularMovimiento = createAsyncThunk(
  'cuentaCorriente/anularMovimiento',
  async (params: { movimientoId: string; motivo: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/cuenta-corriente/movimientos/${params.movimientoId}/anular`, {
        motivo: params.motivo
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al anular movimiento');
    }
  }
);

// ========== SLICE ==========

const cuentaCorrienteSlice = createSlice({
  name: 'cuentaCorriente',
  initialState,
  reducers: {
    clearCuentaCorriente: (state) => {
      state.movimientos = [];
      state.resumen = null;
      state.antiguedad = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch movimientos
      .addCase(fetchMovimientos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMovimientos.fulfilled, (state, action: PayloadAction<MovimientoCuentaCorriente[]>) => {
        state.loading = false;
        state.movimientos = action.payload;
      })
      .addCase(fetchMovimientos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch resumen
      .addCase(fetchResumen.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumen.fulfilled, (state, action: PayloadAction<ResumenCuentaCorriente>) => {
        state.loading = false;
        state.resumen = action.payload;
      })
      .addCase(fetchResumen.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch antigüedad
      .addCase(fetchAntiguedad.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAntiguedad.fulfilled, (state, action: PayloadAction<AntiguedadDeuda>) => {
        state.loading = false;
        state.antiguedad = action.payload;
      })
      .addCase(fetchAntiguedad.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Crear ajuste
      .addCase(crearAjuste.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(crearAjuste.fulfilled, (state, action) => {
        state.loading = false;
        // Actualizar movimientos y resumen después de crear ajuste
        if (action.payload.movimiento) {
          state.movimientos.unshift(action.payload.movimiento);
        }
      })
      .addCase(crearAjuste.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Anular movimiento
      .addCase(anularMovimiento.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(anularMovimiento.fulfilled, (state, action) => {
        state.loading = false;
        // Marcar movimiento como anulado
        const index = state.movimientos.findIndex(m => m._id === action.payload._id);
        if (index !== -1) {
          state.movimientos[index] = action.payload;
        }
      })
      .addCase(anularMovimiento.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearCuentaCorriente, clearError } = cuentaCorrienteSlice.actions;
export default cuentaCorrienteSlice.reducer;
