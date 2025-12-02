import type { Request, Response } from 'express';
import LiquidacionFinal, { TIPOS_BAJA, type TipoBaja, type IDetalleCalculo } from '../models/LiquidacionFinal.js';
import Employee from '../models/Employee.js';
import Gasto from '../models/Gasto.js';

// =====================================================
// CONSTANTES SEGÚN LEGISLACIÓN ARGENTINA (LCT)
// =====================================================

// Días de vacaciones según antigüedad (Art. 150 LCT)
const VACACIONES_POR_ANTIGUEDAD = [
  { hasta: 5, dias: 14 },   // Hasta 5 años: 14 días corridos
  { hasta: 10, dias: 21 },  // De 5 a 10 años: 21 días corridos
  { hasta: 20, dias: 28 },  // De 10 a 20 años: 28 días corridos
  { hasta: Infinity, dias: 35 } // Más de 20 años: 35 días corridos
];

// Preaviso según antigüedad (Art. 231 LCT)
const PREAVISO_POR_ANTIGUEDAD = [
  { hasta: 0.25, dias: 15 },  // Durante período de prueba (3 meses): 15 días
  { hasta: 5, dias: 30 },     // Hasta 5 años: 1 mes
  { hasta: Infinity, dias: 60 } // Más de 5 años: 2 meses
];

// Tipos de baja que generan indemnización
const TIPOS_CON_INDEMNIZACION: TipoBaja[] = ['despido_sin_causa'];

// Tipos de baja que generan preaviso (o su indemnización sustitutiva)
const TIPOS_CON_PREAVISO: TipoBaja[] = ['despido_sin_causa', 'despido_con_causa'];

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * Calcula la antigüedad del empleado
 */
function calcularAntiguedad(fechaIngreso: Date, fechaEgreso: Date) {
  const diff = fechaEgreso.getTime() - fechaIngreso.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const anios = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;
  
  return {
    anios,
    meses: mesesRestantes,
    dias: diasRestantes,
    totalDias: dias,
    totalMeses: anios * 12 + mesesRestantes
  };
}

/**
 * Calcula días de vacaciones correspondientes según antigüedad (Art. 150 LCT)
 */
function calcularDiasVacaciones(antiguedadAnios: number): number {
  for (const rango of VACACIONES_POR_ANTIGUEDAD) {
    if (antiguedadAnios < rango.hasta) {
      return rango.dias;
    }
  }
  return 35; // Máximo
}

/**
 * Calcula vacaciones proporcionales (Art. 156 LCT)
 * Fórmula: (días trabajados en el año / 365) * días vacaciones correspondientes
 */
function calcularVacacionesProporcionales(
  fechaIngreso: Date,
  fechaEgreso: Date,
  sueldoBase: number,
  antiguedadAnios: number
): { dias: number; monto: number; plusVacacional: number } {
  const diasVacacionesAno = calcularDiasVacaciones(antiguedadAnios);
  
  // Calcular días trabajados en el año calendario actual
  const inicioAno = new Date(fechaEgreso.getFullYear(), 0, 1);
  const fechaDesde = fechaIngreso > inicioAno ? fechaIngreso : inicioAno;
  const diasTrabajadosAno = Math.floor((fechaEgreso.getTime() - fechaDesde.getTime()) / (1000 * 60 * 60 * 24));
  
  // Proporcional: (días trabajados / 365) * días vacaciones
  const diasProporcionales = Math.round((diasTrabajadosAno / 365) * diasVacacionesAno);
  
  // Valor día = sueldo / 25 (Art. 155 LCT)
  const valorDia = sueldoBase / 25;
  const montoVacaciones = diasProporcionales * valorDia;
  
  // Plus vacacional: 25% adicional (práctica habitual en Argentina)
  const plusVacacional = montoVacaciones * 0.25;
  
  return {
    dias: diasProporcionales,
    monto: montoVacaciones,
    plusVacacional
  };
}

/**
 * Calcula SAC proporcional (Art. 123 LCT)
 * Fórmula: (mejor remuneración / 12) * meses trabajados en el semestre
 */
function calcularSACProporcional(
  fechaEgreso: Date,
  mejorRemuneracion: number
): { mesesSemestre: number; monto: number } {
  // Determinar el semestre actual
  const mes = fechaEgreso.getMonth();
  const inicioSemestre = mes < 6 
    ? new Date(fechaEgreso.getFullYear(), 0, 1)  // Primer semestre: enero
    : new Date(fechaEgreso.getFullYear(), 6, 1); // Segundo semestre: julio
  
  // Meses trabajados en el semestre
  const mesesSemestre = mes < 6 ? mes + 1 : mes - 5;
  
  // SAC = (mejor remuneración / 12) * meses trabajados
  const sacMensual = mejorRemuneracion / 12;
  const sacProporcional = sacMensual * mesesSemestre;
  
  return {
    mesesSemestre,
    monto: sacProporcional
  };
}

/**
 * Calcula días de preaviso según antigüedad (Art. 231 LCT)
 */
function calcularDiasPreaviso(antiguedadAnios: number): number {
  for (const rango of PREAVISO_POR_ANTIGUEDAD) {
    if (antiguedadAnios < rango.hasta) {
      return rango.dias;
    }
  }
  return 60; // 2 meses para más de 5 años
}

/**
 * Calcula indemnización por antigüedad (Art. 245 LCT)
 * Fórmula: 1 mes de sueldo por cada año trabajado o fracción > 3 meses
 * Base: mejor remuneración mensual, normal y habitual
 * Tope: 3 veces el promedio de remuneraciones del convenio (no implementado aquí)
 */
function calcularIndemnizacionAntiguedad(
  antiguedadAnios: number,
  antiguedadMeses: number,
  mejorRemuneracion: number
): { periodos: number; monto: number } {
  // Mínimo 1 período, luego 1 por cada año o fracción > 3 meses
  let periodos = antiguedadAnios;
  if (antiguedadMeses > 3) {
    periodos += 1;
  }
  periodos = Math.max(1, periodos); // Mínimo 1 mes
  
  const monto = periodos * mejorRemuneracion;
  
  return { periodos, monto };
}

// =====================================================
// CONTROLADORES
// =====================================================

/**
 * Obtener tipos de baja disponibles
 */
export const getTiposBaja = async (_req: Request, res: Response) => {
  const tiposConDescripcion = [
    { valor: 'renuncia', descripcion: 'Renuncia voluntaria', generaIndemnizacion: false, generaPreaviso: false },
    { valor: 'despido_con_causa', descripcion: 'Despido con justa causa', generaIndemnizacion: false, generaPreaviso: true },
    { valor: 'despido_sin_causa', descripcion: 'Despido sin causa', generaIndemnizacion: true, generaPreaviso: true },
    { valor: 'mutuo_acuerdo', descripcion: 'Extinción por mutuo acuerdo', generaIndemnizacion: false, generaPreaviso: false },
    { valor: 'jubilacion', descripcion: 'Jubilación', generaIndemnizacion: false, generaPreaviso: false },
    { valor: 'fallecimiento', descripcion: 'Fallecimiento', generaIndemnizacion: true, generaPreaviso: false },
    { valor: 'fin_contrato', descripcion: 'Fin de contrato a plazo fijo', generaIndemnizacion: false, generaPreaviso: false },
    { valor: 'periodo_prueba', descripcion: 'Durante período de prueba', generaIndemnizacion: false, generaPreaviso: true }
  ];
  res.json(tiposConDescripcion);
};

/**
 * Simular/calcular liquidación final (sin guardar)
 */
export const simularLiquidacionFinal = async (req: Request, res: Response) => {
  try {
    const { empleadoId, fechaEgreso, tipoBaja, mejorRemuneracion, vacacionesGozadas = 0 } = req.body;
    
    const empleado = await Employee.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    const fechaEgresoDate = new Date(fechaEgreso);
    const fechaIngresoDate = new Date(empleado.fechaIngreso);
    
    // Calcular todo
    const calculo = calcularLiquidacionCompleta(
      empleado,
      fechaIngresoDate,
      fechaEgresoDate,
      tipoBaja,
      mejorRemuneracion || empleado.sueldoBase,
      vacacionesGozadas
    );
    
    res.json(calculo);
  } catch (error) {
    console.error('Error al simular liquidación final:', error);
    res.status(500).json({ message: 'Error al simular liquidación final' });
  }
};

/**
 * Crear liquidación final
 */
export const crearLiquidacionFinal = async (req: Request, res: Response) => {
  try {
    const {
      empleadoId,
      fechaEgreso,
      tipoBaja,
      motivoBaja,
      mejorRemuneracion,
      vacacionesGozadas = 0,
      descuentosAdicionales = [],
      aplicarMultaArt80 = false,
      observaciones
    } = req.body;
    
    const empleado = await Employee.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Verificar que no exista una liquidación final activa
    const liquidacionExistente = await LiquidacionFinal.findOne({
      empleadoId,
      estado: { $nin: ['anulada'] }
    });
    
    if (liquidacionExistente) {
      return res.status(400).json({ 
        message: 'Ya existe una liquidación final para este empleado',
        liquidacionId: liquidacionExistente._id
      });
    }
    
    const fechaEgresoDate = new Date(fechaEgreso);
    const fechaIngresoDate = new Date(empleado.fechaIngreso);
    
    // Calcular todo
    const calculo = calcularLiquidacionCompleta(
      empleado,
      fechaIngresoDate,
      fechaEgresoDate,
      tipoBaja,
      mejorRemuneracion || empleado.sueldoBase,
      vacacionesGozadas
    );
    
    // Agregar multa Art. 80 si se solicita (3 sueldos por no entregar certificados)
    let multaArt80 = 0;
    if (aplicarMultaArt80) {
      multaArt80 = calculo.mejorRemuneracion * 3;
    }
    
    // Procesar descuentos adicionales
    let totalDescuentos = 0;
    const descuentosAplicados = descuentosAdicionales.map((d: any) => {
      totalDescuentos += d.monto;
      return { concepto: d.concepto, monto: d.monto };
    });
    
    // Calcular total bruto y neto
    const totalBruto = calculo.salarioProporcional +
      calculo.vacacionesProporcionales + calculo.plusVacacional +
      calculo.sacProporcional +
      calculo.indemnizacionAntiguedad +
      calculo.indemnizacionPreaviso +
      calculo.integracionMesDespido +
      calculo.sacSobrePreaviso + calculo.sacSobreIntegracion +
      multaArt80;
    
    const totalNeto = totalBruto - totalDescuentos - calculo.aportesEmpleado;
    
    // Crear liquidación
    const liquidacion = new LiquidacionFinal({
      empleadoId: empleado._id,
      empleadoNombre: empleado.nombre,
      empleadoApellido: empleado.apellido,
      empleadoDocumento: empleado.documento,
      empleadoCuit: empleado.cuit,
      
      fechaIngreso: fechaIngresoDate,
      fechaEgreso: fechaEgresoDate,
      antiguedadAnios: calculo.antiguedad.anios,
      antiguedadMeses: calculo.antiguedad.meses,
      antiguedadDias: calculo.antiguedad.dias,
      sueldoBase: empleado.sueldoBase,
      mejorRemuneracion: calculo.mejorRemuneracion,
      
      tipoBaja,
      motivoBaja,
      
      diasTrabajadosMes: calculo.diasTrabajadosMes,
      salarioProporcional: calculo.salarioProporcional,
      
      diasVacacionesCorrespondientes: calculo.diasVacacionesCorrespondientes,
      diasVacacionesGozadas: vacacionesGozadas,
      diasVacacionesPendientes: calculo.diasVacacionesPendientes,
      vacacionesProporcionales: calculo.vacacionesProporcionales,
      plusVacacional: calculo.plusVacacional,
      
      mesesTrabajadosSemestre: calculo.mesesTrabajadosSemestre,
      sacProporcional: calculo.sacProporcional,
      
      aplicaIndemnizacion: calculo.aplicaIndemnizacion,
      baseIndemnizacion: calculo.baseIndemnizacion,
      periodosIndemnizacion: calculo.periodosIndemnizacion,
      indemnizacionAntiguedad: calculo.indemnizacionAntiguedad,
      
      aplicaPreaviso: calculo.aplicaPreaviso,
      diasPreaviso: calculo.diasPreaviso,
      indemnizacionPreaviso: calculo.indemnizacionPreaviso,
      
      aplicaIntegracionMes: calculo.aplicaIntegracionMes,
      diasIntegracionMes: calculo.diasIntegracionMes,
      integracionMesDespido: calculo.integracionMesDespido,
      
      sacSobrePreaviso: calculo.sacSobrePreaviso,
      sacSobreIntegracion: calculo.sacSobreIntegracion,
      
      multaArt80,
      
      descuentosAplicados,
      totalDescuentos,
      
      esEmpleadoFormal: calculo.esEmpleadoFormal,
      aportesEmpleado: calculo.aportesEmpleado,
      contribucionesPatronales: calculo.contribucionesPatronales,
      
      totalBruto,
      totalNeto,
      
      detalleCalculos: calculo.detalleCalculos,
      
      estado: 'calculada',
      fechaCalculo: new Date(),
      observaciones
    });
    
    await liquidacion.save();
    
    res.status(201).json(liquidacion);
  } catch (error) {
    console.error('Error al crear liquidación final:', error);
    res.status(500).json({ message: 'Error al crear liquidación final' });
  }
};

/**
 * Función principal de cálculo
 */
function calcularLiquidacionCompleta(
  empleado: any,
  fechaIngreso: Date,
  fechaEgreso: Date,
  tipoBaja: TipoBaja,
  mejorRemuneracion: number,
  vacacionesGozadas: number
) {
  const detalleCalculos: IDetalleCalculo[] = [];
  
  // 1. Calcular antigüedad
  const antiguedad = calcularAntiguedad(fechaIngreso, fechaEgreso);
  
  // 2. Días trabajados del mes en curso
  const diaEgreso = fechaEgreso.getDate();
  const diasTrabajadosMes = diaEgreso;
  const valorDiario = empleado.sueldoBase / 30;
  const salarioProporcional = diasTrabajadosMes * valorDiario;
  
  detalleCalculos.push({
    concepto: 'Salario proporcional',
    descripcion: `${diasTrabajadosMes} días trabajados en el mes`,
    diasBase: diasTrabajadosMes,
    valorDiario,
    monto: salarioProporcional
  });
  
  // 3. Vacaciones proporcionales
  const vacaciones = calcularVacacionesProporcionales(
    fechaIngreso, fechaEgreso, empleado.sueldoBase, antiguedad.anios
  );
  const diasVacacionesCorrespondientes = calcularDiasVacaciones(antiguedad.anios);
  const diasVacacionesPendientes = Math.max(0, vacaciones.dias - vacacionesGozadas);
  const vacacionesProporcionales = diasVacacionesPendientes * (empleado.sueldoBase / 25);
  
  detalleCalculos.push({
    concepto: 'Vacaciones proporcionales',
    descripcion: `${diasVacacionesPendientes} días pendientes (corresponden ${diasVacacionesCorrespondientes} días/año)`,
    diasBase: diasVacacionesPendientes,
    valorDiario: empleado.sueldoBase / 25,
    monto: vacacionesProporcionales
  });
  
  if (vacaciones.plusVacacional > 0) {
    detalleCalculos.push({
      concepto: 'Plus vacacional',
      descripcion: '25% adicional sobre vacaciones',
      porcentaje: 25,
      monto: vacaciones.plusVacacional
    });
  }
  
  // 4. SAC proporcional
  const sac = calcularSACProporcional(fechaEgreso, mejorRemuneracion);
  
  detalleCalculos.push({
    concepto: 'SAC proporcional',
    descripcion: `${sac.mesesSemestre} meses trabajados en el semestre`,
    monto: sac.monto
  });
  
  // 5. Indemnización por antigüedad (solo despido sin causa)
  const aplicaIndemnizacion = TIPOS_CON_INDEMNIZACION.includes(tipoBaja);
  let indemnizacionAntiguedad = 0;
  let periodosIndemnizacion = 0;
  let baseIndemnizacion = mejorRemuneracion;
  
  if (aplicaIndemnizacion) {
    const indem = calcularIndemnizacionAntiguedad(
      antiguedad.anios, antiguedad.meses, mejorRemuneracion
    );
    indemnizacionAntiguedad = indem.monto;
    periodosIndemnizacion = indem.periodos;
    
    detalleCalculos.push({
      concepto: 'Indemnización por antigüedad',
      descripcion: `Art. 245 LCT - ${periodosIndemnizacion} período(s) x $${mejorRemuneracion.toFixed(2)}`,
      monto: indemnizacionAntiguedad
    });
  }
  
  // 6. Preaviso (sustitutivo)
  const aplicaPreaviso = TIPOS_CON_PREAVISO.includes(tipoBaja);
  let diasPreaviso = 0;
  let indemnizacionPreaviso = 0;
  
  if (aplicaPreaviso) {
    diasPreaviso = calcularDiasPreaviso(antiguedad.anios);
    indemnizacionPreaviso = (mejorRemuneracion / 30) * diasPreaviso;
    
    detalleCalculos.push({
      concepto: 'Indemnización sustitutiva de preaviso',
      descripcion: `Art. 232 LCT - ${diasPreaviso} días`,
      diasBase: diasPreaviso,
      valorDiario: mejorRemuneracion / 30,
      monto: indemnizacionPreaviso
    });
  }
  
  // 7. Integración mes de despido (si el despido no es el último día del mes)
  const aplicaIntegracionMes = aplicaPreaviso && diaEgreso < 28;
  let diasIntegracionMes = 0;
  let integracionMesDespido = 0;
  
  if (aplicaIntegracionMes) {
    const ultimoDiaMes = new Date(fechaEgreso.getFullYear(), fechaEgreso.getMonth() + 1, 0).getDate();
    diasIntegracionMes = ultimoDiaMes - diaEgreso;
    integracionMesDespido = (mejorRemuneracion / 30) * diasIntegracionMes;
    
    detalleCalculos.push({
      concepto: 'Integración mes de despido',
      descripcion: `Art. 233 LCT - ${diasIntegracionMes} días hasta fin de mes`,
      diasBase: diasIntegracionMes,
      valorDiario: mejorRemuneracion / 30,
      monto: integracionMesDespido
    });
  }
  
  // 8. SAC sobre preaviso e integración
  const sacSobrePreaviso = indemnizacionPreaviso / 12;
  const sacSobreIntegracion = integracionMesDespido / 12;
  
  if (sacSobrePreaviso > 0) {
    detalleCalculos.push({
      concepto: 'SAC sobre preaviso',
      descripcion: 'Proporcional al preaviso',
      monto: sacSobrePreaviso
    });
  }
  
  if (sacSobreIntegracion > 0) {
    detalleCalculos.push({
      concepto: 'SAC sobre integración',
      descripcion: 'Proporcional a la integración',
      monto: sacSobreIntegracion
    });
  }
  
  // 9. Aportes (solo si es formal)
  const esEmpleadoFormal = empleado.modalidadContratacion === 'formal';
  let aportesEmpleado = 0;
  let contribucionesPatronales = 0;
  
  if (esEmpleadoFormal) {
    // Base imponible: conceptos remunerativos
    const baseImponible = salarioProporcional + vacacionesProporcionales + 
      vacaciones.plusVacacional + sac.monto;
    
    // Aportes empleado: ~17% (jubilación 11% + OS 3% + PAMI 3%)
    aportesEmpleado = baseImponible * 0.17;
    
    // Contribuciones patronales: ~20.17%
    contribucionesPatronales = baseImponible * 0.2017;
    
    detalleCalculos.push({
      concepto: 'Aportes empleado (retención)',
      descripcion: '17% sobre conceptos remunerativos',
      porcentaje: 17,
      monto: -aportesEmpleado // Negativo porque es descuento
    });
  }
  
  return {
    antiguedad,
    mejorRemuneracion,
    
    diasTrabajadosMes,
    salarioProporcional,
    
    diasVacacionesCorrespondientes,
    diasVacacionesPendientes,
    vacacionesProporcionales,
    plusVacacional: vacaciones.plusVacacional,
    
    mesesTrabajadosSemestre: sac.mesesSemestre,
    sacProporcional: sac.monto,
    
    aplicaIndemnizacion,
    baseIndemnizacion,
    periodosIndemnizacion,
    indemnizacionAntiguedad,
    
    aplicaPreaviso,
    diasPreaviso,
    indemnizacionPreaviso,
    
    aplicaIntegracionMes,
    diasIntegracionMes,
    integracionMesDespido,
    
    sacSobrePreaviso,
    sacSobreIntegracion,
    
    esEmpleadoFormal,
    aportesEmpleado,
    contribucionesPatronales,
    
    detalleCalculos
  };
}

/**
 * Obtener todas las liquidaciones finales
 */
export const getLiquidacionesFinales = async (req: Request, res: Response) => {
  try {
    const { estado, empleadoId, desde, hasta } = req.query;
    
    const filtro: any = {};
    
    if (estado) filtro.estado = estado;
    if (empleadoId) filtro.empleadoId = empleadoId;
    if (desde || hasta) {
      filtro.fechaEgreso = {};
      if (desde) filtro.fechaEgreso.$gte = new Date(desde as string);
      if (hasta) filtro.fechaEgreso.$lte = new Date(hasta as string);
    }
    
    const liquidaciones = await LiquidacionFinal.find(filtro)
      .sort({ fechaEgreso: -1 })
      .populate('empleadoId', 'nombre apellido documento');
    
    res.json(liquidaciones);
  } catch (error) {
    console.error('Error al obtener liquidaciones finales:', error);
    res.status(500).json({ message: 'Error al obtener liquidaciones finales' });
  }
};

/**
 * Obtener una liquidación final por ID
 */
export const getLiquidacionFinalById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const liquidacion = await LiquidacionFinal.findById(id)
      .populate('empleadoId', 'nombre apellido documento cuit');
    
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación final no encontrada' });
    }
    
    res.json(liquidacion);
  } catch (error) {
    console.error('Error al obtener liquidación final:', error);
    res.status(500).json({ message: 'Error al obtener liquidación final' });
  }
};

/**
 * Aprobar liquidación final
 */
export const aprobarLiquidacionFinal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aprobadoPor } = req.body;
    
    const liquidacion = await LiquidacionFinal.findById(id);
    
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación final no encontrada' });
    }
    
    if (liquidacion.estado !== 'calculada') {
      return res.status(400).json({ 
        message: `No se puede aprobar una liquidación en estado ${liquidacion.estado}` 
      });
    }
    
    liquidacion.estado = 'aprobada';
    liquidacion.fechaAprobacion = new Date();
    liquidacion.aprobadoPor = aprobadoPor || 'Sistema';
    
    await liquidacion.save();
    
    res.json(liquidacion);
  } catch (error) {
    console.error('Error al aprobar liquidación final:', error);
    res.status(500).json({ message: 'Error al aprobar liquidación final' });
  }
};

/**
 * Pagar liquidación final (crea los gastos correspondientes)
 */
export const pagarLiquidacionFinal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { medioDePago = 'EFECTIVO', banco = 'EFECTIVO', observaciones } = req.body;
    
    const liquidacion = await LiquidacionFinal.findById(id);
    
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación final no encontrada' });
    }
    
    if (liquidacion.estado !== 'aprobada') {
      return res.status(400).json({ 
        message: `Solo se pueden pagar liquidaciones aprobadas. Estado actual: ${liquidacion.estado}` 
      });
    }
    
    const gastosCreados = [];
    
    // Crear gasto de liquidación final
    const gastoLiquidacion = new Gasto({
      rubro: 'SUELDOS',
      subRubro: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      concepto: 'otro',
      medioDePago,
      banco,
      tipoOperacion: 'salida',
      clientes: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      detalleGastos: `Liquidación Final - ${liquidacion.tipoBaja}`,
      comentario: `Egreso: ${liquidacion.fechaEgreso.toLocaleDateString('es-AR')} | Antigüedad: ${liquidacion.antiguedadAnios}a ${liquidacion.antiguedadMeses}m`,
      salida: liquidacion.totalNeto,
      entrada: 0,
      fecha: new Date(),
      estado: 'activo',
      confirmado: true
    });
    
    await gastoLiquidacion.save();
    gastosCreados.push(gastoLiquidacion);
    liquidacion.gastosRelacionados.push(gastoLiquidacion._id as any);
    
    // Si es empleado formal, crear gasto de cargas sociales
    if (liquidacion.esEmpleadoFormal && liquidacion.contribucionesPatronales > 0) {
      const gastoAFIP = new Gasto({
        rubro: 'IMPUESTOS',
        subRubro: 'AFIP - Cargas Sociales',
        concepto: 'impuesto',
        medioDePago: 'TRANSFERENCIA',
        banco,
        tipoOperacion: 'salida',
        clientes: 'AFIP',
        detalleGastos: `Cargas sociales Liquidación Final - ${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
        comentario: `Aportes: $${liquidacion.aportesEmpleado.toFixed(2)} | Contribuciones: $${liquidacion.contribucionesPatronales.toFixed(2)}`,
        salida: liquidacion.aportesEmpleado + liquidacion.contribucionesPatronales,
        entrada: 0,
        fecha: new Date(),
        estado: 'activo',
        confirmado: false
      });
      
      await gastoAFIP.save();
      gastosCreados.push(gastoAFIP);
      liquidacion.gastosRelacionados.push(gastoAFIP._id as any);
    }
    
    // Actualizar estado del empleado a inactivo
    await Employee.findByIdAndUpdate(liquidacion.empleadoId, {
      estado: 'inactivo'
    });
    
    // Actualizar liquidación
    liquidacion.estado = 'pagada';
    liquidacion.fechaPago = new Date();
    liquidacion.medioDePago = medioDePago;
    liquidacion.banco = banco;
    if (observaciones) {
      liquidacion.observaciones = observaciones;
    }
    
    await liquidacion.save();
    
    res.json({
      liquidacion,
      gastosCreados,
      mensaje: 'Liquidación pagada y empleado marcado como inactivo'
    });
  } catch (error) {
    console.error('Error al pagar liquidación final:', error);
    res.status(500).json({ message: 'Error al pagar liquidación final' });
  }
};

/**
 * Anular liquidación final
 */
export const anularLiquidacionFinal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const liquidacion = await LiquidacionFinal.findById(id);
    
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación final no encontrada' });
    }
    
    if (liquidacion.estado === 'pagada') {
      return res.status(400).json({ 
        message: 'No se puede anular una liquidación ya pagada' 
      });
    }
    
    liquidacion.estado = 'anulada';
    liquidacion.observaciones = `${liquidacion.observaciones || ''}\n[ANULADA] ${motivo || 'Sin motivo especificado'}`;
    
    await liquidacion.save();
    
    res.json(liquidacion);
  } catch (error) {
    console.error('Error al anular liquidación final:', error);
    res.status(500).json({ message: 'Error al anular liquidación final' });
  }
};
