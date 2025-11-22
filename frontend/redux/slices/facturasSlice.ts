import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { facturasAPI } from '../../services/api';

// Tipos de comprobantes
export type TipoComprobante =
  | 'FACTURA_A'
  | 'FACTURA_B'
  | 'FACTURA_C'
  | 'NOTA_CREDITO_A'
  | 'NOTA_CREDITO_B'
  | 'NOTA_CREDITO_C'
  | 'NOTA_DEBITO_A'
  | 'NOTA_DEBITO_B'
  | 'NOTA_DEBITO_C';

export type EstadoFactura =
  | 'borrador'
  | 'autorizada'
  | 'rechazada'
  | 'anulada'
  | 'error';

export interface ItemFactura {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  importeBruto: number;
  importeDescuento: number;
  importeNeto: number;
  alicuotaIVA: number;
  importeIVA: number;
  importeTotal: number;
}

export interface DatosAFIP {
  cae?: string;
  fechaVencimientoCAE?: string;
  numeroComprobante?: string;
  puntoVenta: number;
  numeroSecuencial?: number;
  fechaAutorizacion?: string;
  codigoBarras?: string;
  resultado?: string;
  motivoRechazo?: string;
  observacionesAFIP?: string[];
}

export interface Factura {
  _id: string;
  ventaId?: string; // DEPRECATED - usar ventasRelacionadas
  ventasRelacionadas?: string[]; // Array de IDs de ventas agrupadas
  clienteId: {
    _id: string;
    nombre: string;
    apellido?: string;
    razonSocial?: string;
    numeroDocumento: string;
    condicionIVA: string;
  };
  tipoComprobante: TipoComprobante;
  estado: EstadoFactura;
  puntoVenta?: number; // DEPRECATED: Usar datosAFIP.puntoVenta
  numeroSecuencial?: number; // DEPRECATED: Usar datosAFIP.numeroSecuencial
  emisorCUIT: string;
  emisorRazonSocial: string;
  emisorDomicilio: string;
  emisorCondicionIVA: string;
  emisorIngresosBrutos?: string;
  receptorRazonSocial: string;
  receptorNumeroDocumento: string;
  receptorDomicilio?: string;
  receptorCondicionIVA: string;
  fecha: string;
  items: ItemFactura[];
  subtotal: number;
  descuentoTotal: number;
  importeNetoGravado: number;
  importeNoGravado: number;
  importeExento: number;
  importeIVA: number;
  importeOtrosTributos: number;
  importeTotal: number;
  total: number; // Alias para importeTotal
  detalleIVA: Array<{
    alicuota: number;
    baseImponible: number;
    importe: number;
  }>;
  datosAFIP: DatosAFIP;
  observaciones?: string;
  concepto: number;
  monedaId: string;
  cotizacionMoneda: number;
  usuarioCreador: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
}

interface FacturasState {
  items: Factura[];
  loading: boolean;
  error: string | null;
  currentFactura: Factura | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: FacturasState = {
  items: [],
  loading: false,
  error: null,
  currentFactura: null,
  total: 0,
  page: 1,
  pages: 1
};

// Thunks
export const fetchFacturas = createAsyncThunk(
  'facturas/fetchFacturas',
  async (filtros: {
    estado?: EstadoFactura;
    clienteId?: string;
    desde?: string;
    hasta?: string;
    tipoComprobante?: TipoComprobante;
    page?: number;
    limit?: number;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await facturasAPI.listar(filtros);
      return response; // facturasAPI.listar ya retorna response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al cargar facturas');
    }
  }
);

export const crearFacturaDesdeVenta = createAsyncThunk(
  'facturas/crearDesdeVenta',
  async (ventaId: string, { rejectWithValue }) => {
    try {
      const response = await facturasAPI.crearDesdeVenta(ventaId);
      return response.data.factura;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al crear factura');
    }
  }
);

export const crearFacturaDesdeVentas = createAsyncThunk(
  'facturas/crearDesdeVentas',
  async (ventasIds: string[], { rejectWithValue }) => {
    try {
      const response = await facturasAPI.crearDesdeVentas(ventasIds);
      return response.factura; // Backend retorna { factura, ventasAgrupadas }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al crear factura desde ventas');
    }
  }
);

export const crearFacturaManual = createAsyncThunk(
  'facturas/crearManual',
  async (datos: {
    clienteId: string;
    tipoComprobante: string;
    puntoVenta: number;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      alicuotaIVA: number;
    }>;
    observaciones?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await facturasAPI.crearManual(datos);
      return response.data.factura;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al crear factura');
    }
  }
);

export const autorizarFactura = createAsyncThunk(
  'facturas/autorizar',
  async (facturaId: string, { rejectWithValue }) => {
    try {
      const response = await facturasAPI.autorizar(facturaId);
      // Backend devuelve { message, factura, cae, numeroComprobante, ... }
      return response.factura;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ||
        error.response?.data?.errores?.join(', ') ||
        'Error al autorizar factura'
      );
    }
  }
);

export const obtenerFactura = createAsyncThunk(
  'facturas/obtener',
  async (facturaId: string) => {
    const response = await facturasAPI.obtener(facturaId);
    return response.data;
  }
);

export const anularFactura = createAsyncThunk(
  'facturas/anular',
  async ({ facturaId, motivo }: { facturaId: string; motivo: string }, { rejectWithValue }) => {
    try {
      const response = await facturasAPI.anular(facturaId, motivo);
      return response.data.factura;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al anular factura');
    }
  }
);

export const verificarCAE = createAsyncThunk(
  'facturas/verificarCAE',
  async (facturaId: string) => {
    const response = await facturasAPI.verificarCAE(facturaId);
    return response.data;
  }
);

const facturasSlice = createSlice({
  name: 'facturas',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentFactura: (state) => {
      state.currentFactura = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch facturas
    builder.addCase(fetchFacturas.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFacturas.fulfilled, (state, action) => {
      state.loading = false;
      // Validar que la respuesta tenga la estructura esperada
      if (action.payload && Array.isArray(action.payload.facturas)) {
        state.items = action.payload.facturas;
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.pages = action.payload.pages || 1;
      } else {
        // Si la estructura es diferente, intentar usar directamente
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.total = state.items.length;
        state.page = 1;
        state.pages = 1;
      }
    });
    builder.addCase(fetchFacturas.rejected, (state, action) => {
      state.loading = false;
      state.error = (action.payload as string) || action.error.message || 'Error al cargar facturas';
      state.items = [];
    });

    // Crear desde venta
    builder.addCase(crearFacturaDesdeVenta.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(crearFacturaDesdeVenta.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFactura = action.payload;
      state.items.unshift(action.payload);
    });
    builder.addCase(crearFacturaDesdeVenta.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Crear desde múltiples ventas (agrupación)
    builder.addCase(crearFacturaDesdeVentas.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(crearFacturaDesdeVentas.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFactura = action.payload;
      state.items.unshift(action.payload);
    });
    builder.addCase(crearFacturaDesdeVentas.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Crear manual
    builder.addCase(crearFacturaManual.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(crearFacturaManual.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFactura = action.payload;
      state.items.unshift(action.payload);
    });
    builder.addCase(crearFacturaManual.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Autorizar
    builder.addCase(autorizarFactura.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(autorizarFactura.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.items.findIndex(f => f._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.currentFactura?._id === action.payload._id) {
        state.currentFactura = action.payload;
      }
    });
    builder.addCase(autorizarFactura.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Obtener
    builder.addCase(obtenerFactura.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(obtenerFactura.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFactura = action.payload;
    });
    builder.addCase(obtenerFactura.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al obtener factura';
    });

    // Anular
    builder.addCase(anularFactura.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(anularFactura.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.items.findIndex(f => f._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.currentFactura?._id === action.payload._id) {
        state.currentFactura = action.payload;
      }
    });
    builder.addCase(anularFactura.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Verificar CAE
    builder.addCase(verificarCAE.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(verificarCAE.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(verificarCAE.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Error al verificar CAE';
    });
  }
});

export const { clearError, clearCurrentFactura } = facturasSlice.actions;
export default facturasSlice.reducer;
