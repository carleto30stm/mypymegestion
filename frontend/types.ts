export interface User {
  id: string;
  username: string;
  userType: 'admin' | 'oper' | 'oper_ad';
}

// Interface para empleados
export interface Employee {
  _id?: string;
  nombre: string;
  apellido: string;
  documento: string;
  puesto: string;
  fechaIngreso: string;
  sueldoBase: number;
  estado: 'activo' | 'inactivo';
  email?: string;
  telefono?: string;
  observaciones?: string;
}

// Interface para el cálculo de sueldos
export interface EmployeePayroll {
  employeeId: string;
  nombre: string;
  apellido: string;
  sueldoBase: number;
  totalPagado: number; // Suma de gastos con su nombre en subRubro de SUELDOS
  adelantos: number;    // Adelantos registrados (concepto = 'adelanto')
  horasExtra: number;   // Horas extra (concepto = 'hora_extra')
  sueldos: number;      // Sueldos regulares (concepto = 'sueldo')
  aguinaldos: number;   // Aguinaldos (concepto = 'aguinaldo')
  bonus: number;        // Bonus (concepto = 'bonus')
  saldoPendiente: number; // sueldoBase - totalPagado
}

// SubRubros mapping
export const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['EDENOR', 'PROGRAMACION', 'AGUA', 'GAS', 'RED NET', 'NIC AR', 'JARDIN'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE'],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA', 'OTROS'],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO'],
  'GASTOS.ADMIN': ['MANT.CTA', 'B.PERSONALES', 'CONVENIO MULT','IMP.DEB.CRED','HONORARIOS MARKETING','AFIP','SIRCREB'],
  'AFIT': ['IVA'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TERNERO','MAQ. NUEVA','OTROS'],
  'SUELDOS': ['DIVIDENDOS ','MARCELO','HANUEL','TOBIAS', 'ALEJO','MONICA','EXTRA 1','EXTRA 2'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

export interface Gasto {
  _id?: string;
  fecha: string;
  rubro: 'COBRO.VENTA' | 'SERVICIOS' | 'PROOV.MATERIA.PRIMA' | 'PROOVMANO.DE.OBRA' | 'BANCO' | 'AFIT' | 'GASTOS.ADMIN' | 'MANT.MAQ' | 'SUELDOS' | 'MOVILIDAD';
  subRubro: string;
  // Allow empty string as a valid initial value for Select components
  medioDePago: '' | 'Mov. Banco' | 'reserva' | 'CR.F' | 'DLL.B' | 'FCI' | 'FT' | 'Visa' | 'Amex' | 'otro';
  clientes: string;
  detalleGastos: string;
  concepto?: 'sueldo' | 'adelanto' | 'hora_extra' | 'aguinaldo' | 'bonus' | 'otro';
  comentario: string;
  fechaStandBy?: string;
  entrada?: number;
  salida?: number;
  banco: 'SANTANDER' | 'EFECTIVO' | 'PROVINCIA' | 'FCI' | 'CHEQUES 3ro' | 'CHEQUE PRO.';
}
