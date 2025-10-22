import mongoose from 'mongoose';

// Define valid subRubros for each rubro
const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['EDENOR', 'PROGRAMACION', 'AGUA', 'GAS', 'RED NET', 'NIC AR', 'JARDIN'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE'],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA', 'OTROS'],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA','OTROS'],
  'AFIT': ['IVA'],
  'GASTOS.ADMIN': ['MANT.CTA', 'B.PERSONALES', 'CONVENIO MULT','IMP.DEB.CRED','HONORARIOS MARKETING','AFIP','SIRCREB'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TERNERO','MAQ. NUEVA','OTROS'],
  'SUELDOS': ['DIVIDENDOS ','MARCELO','HANUEL','TOBIAS', 'ALEJO','MONICA','EXTRA 1','EXTRA 2'],
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
     'PROOVMANO.DE.OBRA', 'BANCO', 'AFIT','GASTOS.ADMIN',
     'MANT.MAQ','SUELDOS','MOVILIDAD'
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
      'Mov. Banco', 
      'Efectivo', 
      'Transferencia',
      'Tarjeta Débito',
      'Tarjeta Crédito',
      'Cheque Propio',
      'Cheque Tercero',
      'FCI', 
      'FT',
      'otro'
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
  entrada: { type: Number, default: 0 },
  salida: { type: Number, default: 0 },
  // Campos específicos para transferencias
  cuentaOrigen: { 
    type: String,
    enum: ['SANTANDER', 'EFECTIVO', 'PROVINCIA', 'FCI', 'CHEQUES 3ro', 'CHEQUE PRO.'],
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    }
  },
  cuentaDestino: { 
    type: String,
    enum: ['SANTANDER', 'EFECTIVO', 'PROVINCIA', 'FCI', 'CHEQUES 3ro', 'CHEQUE PRO.'],
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    }
  },
  montoTransferencia: {
    type: Number,
    required: function(this: any) {
      return this.tipoOperacion === 'transferencia';
    },
    min: [0.01, 'El monto de transferencia debe ser mayor a 0']
  },
  banco: { 
    type: String, 
    required: function(this: any) {
      // Para transferencias, banco se usa como cuenta principal (origen)
      return this.tipoOperacion !== 'transferencia';
    },
    enum: [
      'SANTANDER', 
      'EFECTIVO', 
      'PROVINCIA',
      'FCI',
      'CHEQUES 3ro',
      'CHEQUE PRO.'
    ] 
  },
  // user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' } // Opcional: para asociar gastos a usuarios
}, { timestamps: true });

// MongoDB usa _id por defecto, no es necesario declararlo
const Gasto = mongoose.model('Gasto', gastoSchema);

export default Gasto;
export { subRubrosByRubro };