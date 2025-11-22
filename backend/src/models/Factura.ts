import mongoose, { Document, Schema } from 'mongoose';

// Tipos de comprobantes AFIP
export type TipoComprobante = 
  | 'FACTURA_A'      // 1 - Para Responsables Inscriptos
  | 'FACTURA_B'      // 6 - Para Monotributistas, Exentos
  | 'FACTURA_C'      // 11 - Para Consumidor Final
  | 'NOTA_CREDITO_A' // 3
  | 'NOTA_CREDITO_B' // 8
  | 'NOTA_CREDITO_C' // 13
  | 'NOTA_DEBITO_A'  // 2
  | 'NOTA_DEBITO_B'  // 7
  | 'NOTA_DEBITO_C'  // 12;

// Mapeo de tipo de comprobante a código AFIP
export const TIPO_COMPROBANTE_CODIGO: Record<TipoComprobante, number> = {
  'FACTURA_A': 1,
  'FACTURA_B': 6,
  'FACTURA_C': 11,
  'NOTA_CREDITO_A': 3,
  'NOTA_CREDITO_B': 8,
  'NOTA_CREDITO_C': 13,
  'NOTA_DEBITO_A': 2,
  'NOTA_DEBITO_B': 7,
  'NOTA_DEBITO_C': 12
};

// Estados de factura
export type EstadoFactura = 
  | 'borrador'      // No enviada a AFIP
  | 'autorizada'    // CAE obtenido
  | 'rechazada'     // AFIP rechazó
  | 'anulada'       // Anulada manualmente
  | 'vencida';      // CAE vencido

// Interface para items de factura
export interface IItemFactura {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string; // 7 = unidades, 1 = kg, etc.
  precioUnitario: number;
  importeBruto: number;
  importeDescuento: number;
  importeNeto: number;
  alicuotaIVA: number; // 21, 10.5, 27, 0, 5, 2.5
  importeIVA: number;
  importeTotal: number;
}

// Interface para datos de AFIP
export interface IDatosAFIP {
  cae?: string;                    // Código de Autorización Electrónico
  fechaVencimientoCAE?: Date;      // Vencimiento del CAE (10 días)
  numeroComprobante?: string;      // Formato: XXXXX-XXXXXXXX
  puntoVenta: number;              // 5 dígitos
  numeroSecuencial?: number;       // 8 dígitos
  fechaAutorizacion?: Date;
  codigoBarras?: string;           // Código de barras para impresión
  resultado?: string;              // A = Aprobado, R = Rechazado
  motivoRechazo?: string;
  observacionesAFIP?: string[];
}

// Interface para el documento principal
export interface IFactura extends Document {
  // Relaciones (ahora múltiples ventas)
  ventaId?: mongoose.Types.ObjectId; // DEPRECATED: mantener por compatibilidad
  ventasRelacionadas: mongoose.Types.ObjectId[]; // Array de IDs de ventas
  clienteId: mongoose.Types.ObjectId;
  
  // Tipo y estado
  tipoComprobante: TipoComprobante;
  estado: EstadoFactura;
  
  // Datos del emisor (tu empresa)
  emisorCUIT: string;
  emisorRazonSocial: string;
  emisorDomicilio: string;
  emisorCondicionIVA: string;
  emisorIngresosBrutos?: string;
  emisorInicioActividades: Date;
  
  // Datos del receptor (cliente)
  receptorTipoDocumento: number; // 80 = CUIT, 86 = CUIL, 96 = DNI, 99 = Consumidor Final
  receptorNumeroDocumento: string;
  receptorRazonSocial: string;
  receptorDomicilio?: string;
  receptorCondicionIVA: string; // Descripción legible (ej: "Responsable Inscripto")
  receptorCondicionIVACodigo?: number; // Código numérico AFIP (ej: 1)
  
  // Fecha y lugar
  fecha: Date;
  fechaServicioDesde?: Date; // Para servicios
  fechaServicioHasta?: Date;
  fechaVencimientoPago?: Date;
  
  // Items
  items: IItemFactura[];
  
  // Totales
  subtotal: number;           // Suma de importeNeto
  descuentoTotal: number;
  importeNetoGravado: number; // Base imponible IVA
  importeNoGravado: number;   // Conceptos exentos
  importeExento: number;
  importeIVA: number;
  importeOtrosTributos: number;
  importeTotal: number;
  total?: number;             // Virtual: alias para importeTotal
  
  // Detalle IVA por alícuota
  detalleIVA: Array<{
    alicuota: number;
    baseImponible: number;
    importe: number;
  }>;
  
  // Otros tributos (percepciones, IIBB, etc.)
  otrosTributos?: Array<{
    codigo: number;
    descripcion: string;
    baseImponible: number;
    alicuota: number;
    importe: number;
  }>;
  
  // Datos AFIP
  datosAFIP: IDatosAFIP;
  
  // Comprobantes asociados (para notas de crédito/débito)
  comprobanteAsociado?: {
    tipo: number;
    puntoVenta: number;
    numero: number;
  };
  
  // Observaciones y control
  observaciones?: string;
  concepto: number; // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
  monedaId: string; // 'PES' = Pesos, 'DOL' = Dólares
  cotizacionMoneda: number;
  
  // Usuario
  usuarioCreador: string;
  
  // Auditoría
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaAnulacion?: Date;
  motivoAnulacion?: string;
}

const ItemFacturaSchema = new Schema({
  codigo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000
  },
  cantidad: {
    type: Number,
    required: true,
    min: 0
  },
  unidadMedida: {
    type: String,
    required: true,
    default: '7' // Unidades
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  importeBruto: {
    type: Number,
    required: true,
    min: 0
  },
  importeDescuento: {
    type: Number,
    default: 0,
    min: 0
  },
  importeNeto: {
    type: Number,
    required: true,
    min: 0
  },
  alicuotaIVA: {
    type: Number,
    required: true,
    enum: [0, 2.5, 5, 10.5, 21, 27]
  },
  importeIVA: {
    type: Number,
    required: true,
    min: 0
  },
  importeTotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const FacturaSchema = new Schema({
  ventaId: {
    type: Schema.Types.ObjectId,
    ref: 'Venta'
    // DEPRECATED: mantener por compatibilidad con facturas antiguas
  },
  ventasRelacionadas: [{
    type: Schema.Types.ObjectId,
    ref: 'Venta'
  }],
  clienteId: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  tipoComprobante: {
    type: String,
    required: true,
    enum: Object.keys(TIPO_COMPROBANTE_CODIGO)
  },
  estado: {
    type: String,
    required: true,
    enum: ['borrador', 'autorizada', 'rechazada', 'anulada', 'vencida'],
    default: 'borrador'
  },
  
  // Emisor
  emisorCUIT: {
    type: String,
    required: true
  },
  emisorRazonSocial: {
    type: String,
    required: true
  },
  emisorDomicilio: {
    type: String,
    required: true
  },
  emisorCondicionIVA: {
    type: String,
    required: true
  },
  emisorIngresosBrutos: String,
  emisorInicioActividades: {
    type: Date,
    required: true
  },
  
  // Receptor
  receptorTipoDocumento: {
    type: Number,
    required: true
  },
  receptorNumeroDocumento: {
    type: String,
    required: true
  },
  receptorRazonSocial: {
    type: String,
    required: true
  },
  receptorDomicilio: String,
  receptorCondicionIVA: {
    type: String,
    required: true
  },
  receptorCondicionIVACodigo: {
    type: Number,
    required: false // Opcional para compatibilidad con facturas previas
  },
  
  // Fechas
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaServicioDesde: Date,
  fechaServicioHasta: Date,
  fechaVencimientoPago: Date,
  
  // Items
  items: {
    type: [ItemFacturaSchema],
    required: true,
    validate: {
      validator: function(v: IItemFactura[]) {
        return v && v.length > 0;
      },
      message: 'Debe haber al menos un item'
    }
  },
  
  // Totales
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  descuentoTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  importeNetoGravado: {
    type: Number,
    required: true,
    min: 0
  },
  importeNoGravado: {
    type: Number,
    default: 0,
    min: 0
  },
  importeExento: {
    type: Number,
    default: 0,
    min: 0
  },
  importeIVA: {
    type: Number,
    required: true,
    min: 0
  },
  importeOtrosTributos: {
    type: Number,
    default: 0,
    min: 0
  },
  importeTotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Detalle IVA
  detalleIVA: [{
    alicuota: {
      type: Number,
      required: true
    },
    baseImponible: {
      type: Number,
      required: true,
      min: 0
    },
    importe: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Otros tributos
  otrosTributos: [{
    codigo: Number,
    descripcion: String,
    baseImponible: Number,
    alicuota: Number,
    importe: Number
  }],
  
  // Datos AFIP
  datosAFIP: {
    cae: String,
    fechaVencimientoCAE: Date,
    numeroComprobante: String,
    puntoVenta: {
      type: Number,
      required: true,
      default: 1
    },
    numeroSecuencial: Number,
    fechaAutorizacion: Date,
    codigoBarras: String,
    resultado: String,
    motivoRechazo: String,
    observacionesAFIP: [String]
  },
  
  // Comprobante asociado
  comprobanteAsociado: {
    tipo: Number,
    puntoVenta: Number,
    numero: Number
  },
  
  // Otros campos
  observaciones: {
    type: String,
    maxlength: 4000
  },
  concepto: {
    type: Number,
    required: true,
    enum: [1, 2, 3], // 1=Productos, 2=Servicios, 3=Ambos
    default: 1
  },
  monedaId: {
    type: String,
    required: true,
    default: 'PES'
  },
  cotizacionMoneda: {
    type: Number,
    required: true,
    default: 1
  },
  
  usuarioCreador: {
    type: String,
    required: true
  },
  
  // Auditoría
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  fechaAnulacion: Date,
  motivoAnulacion: String
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices
FacturaSchema.index({ 'datosAFIP.puntoVenta': 1, 'datosAFIP.numeroSecuencial': 1 });
FacturaSchema.index({ 'datosAFIP.cae': 1 });
FacturaSchema.index({ clienteId: 1, fecha: -1 });
FacturaSchema.index({ estado: 1 });
FacturaSchema.index({ fecha: -1 });
FacturaSchema.index({ ventaId: 1 }); // DEPRECATED
FacturaSchema.index({ ventasRelacionadas: 1 }); // Búsqueda por ventas relacionadas

// Middleware para calcular totales
FacturaSchema.pre('save', function(next) {
  // Calcular subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.importeBruto, 0);
  
  // Calcular descuento total
  this.descuentoTotal = this.items.reduce((sum, item) => sum + item.importeDescuento, 0);
  
  // Calcular importe neto gravado
  this.importeNetoGravado = this.items.reduce((sum, item) => sum + item.importeNeto, 0);
  
  // Calcular IVA total
  this.importeIVA = this.items.reduce((sum, item) => sum + item.importeIVA, 0);
  
  // Calcular detalle IVA por alícuota
  const ivaMap = new Map<number, { base: number; importe: number }>();
  
  this.items.forEach(item => {
    const existing = ivaMap.get(item.alicuotaIVA) || { base: 0, importe: 0 };
    ivaMap.set(item.alicuotaIVA, {
      base: existing.base + item.importeNeto,
      importe: existing.importe + item.importeIVA
    });
  });
  
  (this.detalleIVA as any) = Array.from(ivaMap.entries()).map(([alicuota, datos]) => ({
    alicuota,
    baseImponible: datos.base,
    importe: datos.importe
  }));
  
  // Calcular total
  this.importeTotal = this.importeNetoGravado + this.importeIVA + 
                      this.importeNoGravado + this.importeExento + 
                      this.importeOtrosTributos;
  
  next();
});

// Virtual para alias de total
FacturaSchema.virtual('total').get(function() {
  return this.importeTotal;
});

// Asegurar que los virtuals se incluyan en JSON
FacturaSchema.set('toJSON', { virtuals: true });
FacturaSchema.set('toObject', { virtuals: true });

// Método para generar número de comprobante
FacturaSchema.methods.generarNumeroComprobante = function(): string {
  const ptoVenta = String(this.datosAFIP.puntoVenta).padStart(5, '0');
  const numero = String(this.datosAFIP.numeroSecuencial).padStart(8, '0');
  return `${ptoVenta}-${numero}`;
};

const Factura = mongoose.model<IFactura>('Factura', FacturaSchema);

export default Factura;
