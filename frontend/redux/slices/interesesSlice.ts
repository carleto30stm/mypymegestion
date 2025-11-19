import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { interesesAPI } from '../../services/api';
import type { InteresPunitorio, ConfiguracionIntereses, EstadisticasIntereses } from '../../types';

// ========== TIPOS ==========
interface InteresesState {
  // Configuraciones
  configuraciones: ConfiguracionIntereses[];
  configuracionVigente: ConfiguracionIntereses | null;
  
  // Intereses
  intereses: InteresPunitorio[];
  interesSeleccionado: InteresPunitorio | null;
  
  // Estadísticas
  estadisticas: EstadisticasIntereses | null;
  
  // Estado de carga
  loading: boolean;
  error: string | null;
}

const initialState: InteresesState = {
  configuraciones: [],
  configuracionVigente: null,
  intereses: [],
  interesSeleccionado: null,
  estadisticas: null,
  loading: false,
  error: null
};

// ========== THUNKS - CONFIGURACIÓN ==========
export const fetchConfiguracionVigente = createAsyncThunk(
  'intereses/fetchConfiguracionVigente',
  async (_, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getConfiguracionVigente();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener configuración vigente');
    }
  }
);

export const fetchConfiguraciones = createAsyncThunk(
  'intereses/fetchConfiguraciones',
  async (_, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getConfiguraciones();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener configuraciones');
    }
  }
);

export const crearConfiguracion = createAsyncThunk(
  'intereses/crearConfiguracion',
  async (datos: {
    tasaMensualVigente: number;
    fechaVigenciaDesde?: string;
    aplicaDesde?: number;
    fuenteReferencia: string;
    observaciones?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await interesesAPI.crearConfiguracion(datos);
      return response.config;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear configuración');
    }
  }
);

// ========== THUNKS - INTERESES ==========
export const fetchIntereses = createAsyncThunk(
  'intereses/fetchIntereses',
  async (filtros: {
    estado?: string;
    clienteId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  } | undefined, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getIntereses(filtros);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener intereses');
    }
  }
);

export const fetchInteresesPorCliente = createAsyncThunk(
  'intereses/fetchInteresesPorCliente',
  async ({ clienteId, estado }: { clienteId: string; estado?: string }, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getInteresesPorCliente(clienteId, estado);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener intereses del cliente');
    }
  }
);

export const fetchInteresById = createAsyncThunk(
  'intereses/fetchInteresById',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getInteresById(id);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener detalle del interés');
    }
  }
);

export const actualizarCalculo = createAsyncThunk(
  'intereses/actualizarCalculo',
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await interesesAPI.actualizarCalculo(id);
      // Refrescar lista de intereses después de actualizar
      dispatch(fetchIntereses());
      return response.interes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar cálculo');
    }
  }
);

export const cobrarIntereses = createAsyncThunk(
  'intereses/cobrar',
  async ({ id, datos }: {
    id: string;
    datos: {
      montoCobrar?: number;
      observaciones?: string;
      formasPago?: Array<{
        medioPago: string;
        monto: number;
        banco?: string;
      }>;
    }
  }, { rejectWithValue, dispatch }) => {
    try {
      const response = await interesesAPI.cobrarIntereses(id, datos);
      // Refrescar lista y estadísticas
      dispatch(fetchIntereses());
      dispatch(fetchEstadisticas());
      return response.interes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cobrar intereses');
    }
  }
);

export const condonarIntereses = createAsyncThunk(
  'intereses/condonar',
  async ({ id, datos }: {
    id: string;
    datos: {
      montoCondonar: number;
      motivo: string;
    }
  }, { rejectWithValue, dispatch }) => {
    try {
      const response = await interesesAPI.condonarIntereses(id, datos);
      // Refrescar lista y estadísticas
      dispatch(fetchIntereses());
      dispatch(fetchEstadisticas());
      return response.interes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al condonar intereses');
    }
  }
);

export const fetchEstadisticas = createAsyncThunk(
  'intereses/fetchEstadisticas',
  async (filtros: {
    fechaDesde?: string;
    fechaHasta?: string;
  } | undefined, { rejectWithValue }) => {
    try {
      const data = await interesesAPI.getEstadisticas(filtros);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  }
);

// ========== SLICE ==========
const interesesSlice = createSlice({
  name: 'intereses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearInteresSeleccionado: (state) => {
      state.interesSeleccionado = null;
    }
  },
  extraReducers: (builder) => {
    // CONFIGURACIÓN VIGENTE
    builder
      .addCase(fetchConfiguracionVigente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfiguracionVigente.fulfilled, (state, action) => {
        state.loading = false;
        state.configuracionVigente = action.payload;
      })
      .addCase(fetchConfiguracionVigente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // CONFIGURACIONES
    builder
      .addCase(fetchConfiguraciones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfiguraciones.fulfilled, (state, action) => {
        state.loading = false;
        state.configuraciones = action.payload;
      })
      .addCase(fetchConfiguraciones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // CREAR CONFIGURACIÓN
    builder
      .addCase(crearConfiguracion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(crearConfiguracion.fulfilled, (state, action) => {
        state.loading = false;
        state.configuracionVigente = action.payload;
        state.configuraciones = [action.payload, ...state.configuraciones];
      })
      .addCase(crearConfiguracion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // INTERESES
    builder
      .addCase(fetchIntereses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntereses.fulfilled, (state, action) => {
        state.loading = false;
        state.intereses = action.payload;
      })
      .addCase(fetchIntereses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // INTERESES POR CLIENTE
    builder
      .addCase(fetchInteresesPorCliente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInteresesPorCliente.fulfilled, (state, action) => {
        state.loading = false;
        state.intereses = action.payload;
      })
      .addCase(fetchInteresesPorCliente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // INTERÉS BY ID
    builder
      .addCase(fetchInteresById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInteresById.fulfilled, (state, action) => {
        state.loading = false;
        state.interesSeleccionado = action.payload;
      })
      .addCase(fetchInteresById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ACTUALIZAR CÁLCULO
    builder
      .addCase(actualizarCalculo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(actualizarCalculo.fulfilled, (state, action) => {
        state.loading = false;
        // Actualizar en la lista si existe
        const index = state.intereses.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.intereses[index] = action.payload;
        }
        // Actualizar seleccionado si coincide
        if (state.interesSeleccionado?._id === action.payload._id) {
          state.interesSeleccionado = action.payload;
        }
      })
      .addCase(actualizarCalculo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // COBRAR INTERESES
    builder
      .addCase(cobrarIntereses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cobrarIntereses.fulfilled, (state, action) => {
        state.loading = false;
        // Actualizar en la lista
        const index = state.intereses.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.intereses[index] = action.payload;
        }
        if (state.interesSeleccionado?._id === action.payload._id) {
          state.interesSeleccionado = action.payload;
        }
      })
      .addCase(cobrarIntereses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // CONDONAR INTERESES
    builder
      .addCase(condonarIntereses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(condonarIntereses.fulfilled, (state, action) => {
        state.loading = false;
        // Actualizar en la lista
        const index = state.intereses.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.intereses[index] = action.payload;
        }
        if (state.interesSeleccionado?._id === action.payload._id) {
          state.interesSeleccionado = action.payload;
        }
      })
      .addCase(condonarIntereses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ESTADÍSTICAS
    builder
      .addCase(fetchEstadisticas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEstadisticas.fulfilled, (state, action) => {
        state.loading = false;
        state.estadisticas = action.payload;
      })
      .addCase(fetchEstadisticas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearInteresSeleccionado } = interesesSlice.actions;
export default interesesSlice.reducer;
