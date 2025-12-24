import { LiquidacionEmpleado, LiquidacionPeriodo, DescuentoEmpleado, IncentivoEmpleado, Employee, APORTES_EMPLEADO, ADICIONALES_LEGALES } from '../types';

interface CalcularParams {
  liquidacion: LiquidacionEmpleado;
  empleadoData?: Employee | null;
  periodo: LiquidacionPeriodo;
  descuentosDetalle?: DescuentoEmpleado[];
  incentivosDetalle?: IncentivoEmpleado[];
  adicionalesConvenio?: { presentismo: number; zona: number } | null;
}

export const calcularLiquidacionEmpleado = (params: CalcularParams): LiquidacionEmpleado => {
  const { liquidacion, empleadoData, periodo, descuentosDetalle = [], incentivosDetalle = [], adicionalesConvenio } = params;

  const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? (liquidacion.sueldoBase / 2) : liquidacion.sueldoBase;

  // Antiguedad
  let antiguedad = 0;
  if (empleadoData?.fechaIngreso) {
    const fechaIngreso = new Date(empleadoData.fechaIngreso);
    antiguedad = Math.floor((new Date().getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Adicional antiguedad: respetar flag aplicaAntiguedad
  const aplicaAnt = (empleadoData as any)?.aplicaAntiguedad !== false; // default true
  const adicionalAntiguedadFull = aplicaAnt ? (liquidacion.sueldoBase * (antiguedad * 0.01)) : 0; // 1% por año
  const adicionalAntiguedad = periodo.tipo === 'quincenal' ? (adicionalAntiguedadFull / 2) : adicionalAntiguedadFull;

  // Bonus / incentivos
  const totalIncentivos = incentivosDetalle.reduce((s, it) => s + (it.montoCalculado ?? it.monto ?? 0), 0) || (liquidacion.incentivos || 0) || 0;
  const bonus = liquidacion.bonus || 0;

  // Adicional presentismo: respetar aplicaPresentismo
  const aplicaPres = (empleadoData as any)?.aplicaPresentismo !== false; // default true
  let adicionalPresentismoFull = 0;
  if (adicionalesConvenio && adicionalesConvenio.presentismo) {
    adicionalPresentismoFull = adicionalesConvenio.presentismo;
  } else if (aplicaPres) {
    // Fallback: aplicar porcentaje legal si la flag permite presentismo
    adicionalPresentismoFull = liquidacion.sueldoBase * (ADICIONALES_LEGALES.PRESENTISMO / 100);
  }
  if (!aplicaPres) adicionalPresentismoFull = 0;
  const adicionalPresentismo = periodo.tipo === 'quincenal' ? (adicionalPresentismoFull / 2) : adicionalPresentismoFull;

  // Adicional zona peligrosa: respetar aplicaZonaPeligrosa
  const aplicaZona = (empleadoData as any)?.aplicaZonaPeligrosa === true;
  let adicionalZonaFull = 0;
  if (adicionalesConvenio && adicionalesConvenio.zona) adicionalZonaFull = adicionalesConvenio.zona;
  // fallback: no default zona
  if (!aplicaZona) adicionalZonaFull = 0;
  const adicionalZona = periodo.tipo === 'quincenal' ? (adicionalZonaFull / 2) : adicionalZonaFull;

  // Horas extra y aguinaldos ya vienen en liquidacion
  const totalHorasExtra = liquidacion.totalHorasExtra || 0;
  const aguinaldos = liquidacion.aguinaldos || 0;

  // Base imponible: sueldo periodo + horas extra + antiguedad + presentismo + zona + bonus + incentivos
  const baseImponible = sueldoBasePeriodo + totalHorasExtra + adicionalAntiguedad + adicionalPresentismo + adicionalZona + bonus + totalIncentivos;

  // Aportes (solo para empleados formales)
  const esFormal = empleadoData?.modalidadContratacion === 'formal';
  const aporteJubilacion = esFormal ? baseImponible * (APORTES_EMPLEADO.JUBILACION / 100) : 0;
  const aporteObraSocial = esFormal ? baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100) : 0;
  const aportePami = esFormal ? baseImponible * (APORTES_EMPLEADO.PAMI / 100) : 0;
  const aporteSindicato = esFormal && empleadoData?.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0;
  const totalAportes = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;

  // Descuentos e incentivos aplicados (detallados pasados)
  const descuentosTotal = descuentosDetalle.reduce((s, d) => s + (d.montoCalculado ?? d.monto ?? 0), 0);
  const incentivosTotal = totalIncentivos; // ya calculado

  const totalHaberes = sueldoBasePeriodo + totalHorasExtra + adicionalAntiguedad + adicionalPresentismo + adicionalZona + aguinaldos + bonus + incentivosTotal;
  const totalDeducciones = (liquidacion.adelantos || 0) + descuentosTotal + totalAportes;
  const totalAPagar = totalHaberes - totalDeducciones;

  // Contribuciones patronales (para costo empresa)
  const contribJubilacion = esFormal ? baseImponible * (/* employer */ (0.0 + ( (APORTES_EMPLEADO as any).JUBILACION ? 0 : 0 ))) : 0; // placeholder, real values in CONTRIBUCIONES_EMPLEADOR

  return {
    ...liquidacion,
    empleadoAntiguedad: antiguedad,
    adicionalAntiguedad: adicionalAntiguedad,
    adicionalPresentismo: adicionalPresentismo,
    adicionalZona: adicionalZona,
    totalHorasExtra,
    aguinaldos,
    bonus,
    baseImponible,
    aporteJubilacion,
    aporteObraSocial,
    aportePami,
    aporteSindicato,
    totalAportes,
    descuentos: descuentosTotal,
    incentivos: incentivosTotal,
    totalHaberes,
    totalDeducciones,
    totalAPagar,
  } as LiquidacionEmpleado;
};

export default calcularLiquidacionEmpleado;

// Helper: calcular años de antiguedad y monto del adicional por antigüedad
export function calcularAntiguedadYearsAndAmount(options: {
  fechaIngreso?: string | null;
  empleadoAntiguedad?: number | null;
  adicionalAntiguedad?: number | null; // si ya viene calculado
  sueldoBasePeriodo: number; // ya ajustado por quincena si aplica
  porcentajePorAnio?: number; // default from ADICIONALES_LEGALES
}) {
  const { fechaIngreso, empleadoAntiguedad, adicionalAntiguedad, sueldoBasePeriodo, porcentajePorAnio } = options;
  const pct = porcentajePorAnio ?? ADICIONALES_LEGALES.ANTIGUEDAD;

  const years = fechaIngreso
    ? Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : (empleadoAntiguedad ?? 0);

  // Si ya viene un adicional calculado en la liquidación, usarlo
  const amount = (adicionalAntiguedad && adicionalAntiguedad > 0)
    ? adicionalAntiguedad
    : (years > 0 ? (sueldoBasePeriodo * (pct / 100) * years) : 0);

  return { years, amount };
}
