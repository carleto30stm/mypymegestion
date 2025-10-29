import mongoose from 'mongoose';

// Define valid subRubros for each rubro
const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['ELECTRICIDAD', 'PROGRAMACION', 'AGUA', 'GAS', 'Servicios de Internet/Telecomunicaciones', 'JARDIN','LIMPIEZA'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE',],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA' ],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA'],
  'ARCA': ['IVA'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO','MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

const gastoSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  rubro: { 
    type: String, 
    required: function(this: any) {
      return this.tipoOperacion !== 'transferencia';
    },
    enum: 
    ['COBRO.VENTA', 'SERVICIOS', 'PROOV.MATERIA.PRIMA', 
     'PROOVMANO.DE.OBRA', 'BANCO', 'ARCA','GASTOS.ADMIN',
     'GASTOS ADMINISTRATIVOS', 'MANT.MAQ','SUELDOS','MOVILIDAD'
    ] },
  subRubro: { 
    type: String,
    validate: {
      validator: function(this: any, value: string) {
        if (!value) return true; // Optional field
        
        // Para transferencias, no validar subRubro
        if (this.tipoOperacion === 'transferencia') {
          return true;
        }
        
        // Para el rubro SUELDOS, permitir cualquier valor (nombres de empleados)
        if (this.rubro === 'SUELDOS') {
          return true;
        }
        
        // Para otros rubros, usar la validación estática
        const validSubRubros = subRubrosByRubro[this.rubro] || [];
        return validSubRubros.includes(value);
      },
      message: 'SubRubro no válido para el rubro seleccionado'
    }
  },
  medioDePago: { 
    type: String,
    required: function(this: any) {
      return this.tipoOperacion !== 'transferencia';
    },
    enum: [
      'Cheque Tercero',
      'Cheque Propio', 
      'Efectivo',
      'Transferencia',
      'Tarjeta Débito',
      'Tarjeta Crédito',
      'Reserva',
      'Otro'
    ] 
  },
  clientes: { type: String },
  detalleGastos: { type: String, required: true },
  tipoOperacion: {
    type: String,
    required: true,
    enum: ['entrada', 'salida', 'transferencia'],
    default: 'salida'
  },
  concepto: { 
    type: String,
    enum: ['sueldo', 'adelanto', 'hora_extra', 'aguinaldo', 'bonus', 'otro'],
    default: 'sueldo'
  },
  comentario: { type: String },
  fechaStandBy: { type: Date },
  estado: {
    type: String,
    enum: ['activo', 'cancelado'],
    default: 'activo'
  },
  confirmado: { 
    type: Boolean,
    default: function(this: any) {
      // Para cheques (medioDePago con 'Cheque'), default es false
      // Para otros medios de pago, default es true
      return !this.medioDePago || (!this.medioDePago.includes('Cheque'));
    }
  },
  // Nuevos campos para manejo de cheques de terceros
  estadoCheque: {
    type: String,
    enum: ['recibido', 'depositado', 'pagado_proveedor', 'endosado'],
    default: function(this: any) {
      return this.medioDePago === 'Cheque Tercero' ? 'recibido' : undefined;
    }
  },
  chequeRelacionadoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gasto',
    default: null // Se usa para vincular el movimiento de salida con la entrada original
  },
  entrada: { type: Number, default: 0 },
  salida: { type: Number, default: 0 },
  // Campos específicos para transferencias
  cuentaOrigen: { 
    type: String,
    enum: ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'],
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    }
  },
  cuentaDestino: { 
    type: String,
    enum: ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'],
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    }
  },
  montoTransferencia: {
    type: Number,
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    },
    validate: {
      validator: function(this: any, value: number) {
        // Solo validar si es una transferencia
        if (this.tipoOperacion === 'transferencia') {
          return value && value > 0;
        }
        return true; // Para no transferencias, cualquier valor es válido
      },
      message: 'El monto de transferencia debe ser mayor a 0'
    }
  },
  banco: { 
    type: String, 
    required: function(this: any) {
      // Para transferencias, no es requerido (usan cuentaOrigen/cuentaDestino)
      if (this.tipoOperacion === 'transferencia') {
        return false;
      }
      // Para Cheque Tercero, no es requerido (se define al confirmar/depositar)
      if (this.medioDePago === 'Cheque Tercero') {
        return false;
      }
      // Para otros casos, sí es requerido
      return true;
    },
    validate: {
      validator: function(this: any, value: string) {
        // Si el valor está vacío, solo validar si es requerido
        if (!value || value === '') {
          // Para transferencias, permitir vacío
          if (this.tipoOperacion === 'transferencia') {
            return true;
          }
          // Para Cheque Tercero, permitir vacío
          if (this.medioDePago === 'Cheque Tercero') {
            return true;
          }
          // Para otros casos, no permitir vacío
          return false;
        }
        
        // Si tiene valor, debe ser uno de los valores válidos
        const validBancos = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'];
        return validBancos.includes(value);
      },
      message: 'Banco debe ser uno de los valores válidos: PROVINCIA, SANTANDER, EFECTIVO, FCI, RESERVA'
    }
  },
  // user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' } // Opcional: para asociar gastos a usuarios
}, { timestamps: true });

// MongoDB usa _id por defecto, no es necesario declararlo
const Gasto = mongoose.model('Gasto', gastoSchema);

export default Gasto;
export { subRubrosByRubro };