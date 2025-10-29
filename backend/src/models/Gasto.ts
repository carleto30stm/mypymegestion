import mongoose from 'mongoose';
import { cajas, medioDePagos, subRubrosByRubro } from '../Types/Types.js';


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
        
        // Para otros rubros, usar la validación desde la constante importada
        const validSubRubros = subRubrosByRubro[this.rubro] || [];
        return validSubRubros.includes(value);
      },
      message: function(this: any) {
        // Mensaje dinámico que muestra los subRubros válidos para el rubro actual
        const validSubRubros = subRubrosByRubro[this.rubro] || [];
        return `SubRubro '${this.value}' no es válido para el rubro '${this.rubro}'. Valores válidos: ${validSubRubros.join(', ')}`;
      }
    }
  },
  medioDePago: { 
    type: String,
    required: function(this: any) {
      return this.tipoOperacion !== 'transferencia';
    },
    enum: medioDePagos
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
    enum: cajas,
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    }
  },
  cuentaDestino: { 
    type: String,
    enum: cajas,
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
        return (cajas as readonly string[]).includes(value);
      },
      message: () => `Banco debe ser uno de los valores válidos: ${cajas.join(', ')}`
    }
  },
  // user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' } // Opcional: para asociar gastos a usuarios
}, { timestamps: true });

// MongoDB usa _id por defecto, no es necesario declararlo
const Gasto = mongoose.model('Gasto', gastoSchema);

export default Gasto;
// subRubrosByRubro ahora se exporta directamente desde Types.ts
// export { subRubrosByRubro };