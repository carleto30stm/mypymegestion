import Employee from '../models/Employee.js';
import type LiquidacionPeriodoModel from '../models/LiquidacionPeriodo.js';

// Reusar constantes similares a las del controller
const APORTES_EMPLEADO = {
  JUBILACION: 11,
  OBRA_SOCIAL: 3,
  PAMI: 3,
  SINDICATO: 2
};

const CONTRIBUCIONES_EMPLEADOR = {
  JUBILACION: 10.17,
  OBRA_SOCIAL: 6,
  PAMI: 1.5,
  ART: 2.5
};

type Params = {
  empleado: any;
  liquidacion: any;
  periodo: any;
  totalDescuentos?: number;
  totalIncentivos?: number;
};

export async function calcularLiquidacionEmpleadoBackend(params: Params) {
  const { empleado, liquidacion, periodo } = params;
  const totalDescuentos = params.totalDescuentos ?? 0;
  const totalIncentivos = params.totalIncentivos ?? 0;

  const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? liquidacion.sueldoBase / 2 : liquidacion.sueldoBase;
  let baseImponible = sueldoBasePeriodo + (liquidacion.totalHorasExtra || 0);

  let adicionalPresentismo = 0;
  let adicionalZona = 0;
  let adicionalAntiguedad = 0;

  try {
    const necesitaCalculoConvenio = !!empleado.convenioId && !!empleado.categoriaConvenio && (
      empleado.aplicaPresentismo || empleado.aplicaZonaPeligrosa || empleado.aplicaAntiguedad
    );

    if (necesitaCalculoConvenio) {
      const Convenio = (await import('../models/Convenio.js')).default;
      const convenio = await Convenio.findById(empleado.convenioId);
      if (convenio) {
        const antig = (empleado.aplicaAntiguedad && empleado.fechaIngreso)
          ? Math.floor((Date.now() - new Date(empleado.fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0;
        const calculo = (convenio as any).calcularSueldoCategoria(
          empleado.categoriaConvenio,
          antig,
          !!empleado.aplicaPresentismo,
          !!empleado.aplicaZonaPeligrosa
        );
        adicionalPresentismo = calculo.adicionales.find((a: any) => a.concepto.toLowerCase().includes('presentismo'))?.monto || 0;
        adicionalZona = calculo.adicionales.find((a: any) => a.concepto.toLowerCase().includes('zona'))?.monto || 0;
        adicionalAntiguedad = calculo.adicionales.find((a: any) => a.concepto.toLowerCase().includes('antig'))?.monto || 0;
      }
    }

    // Fallback si no hay convenio o no devolvió presentismo, usar flag de empleado
    if (!adicionalPresentismo && empleado.aplicaPresentismo) {
      adicionalPresentismo = sueldoBasePeriodo * (8.33 / 100);
    }
  } catch (e) {
    console.error('Error al calcular adicionales en util:', e);
    adicionalPresentismo = adicionalPresentismo || 0;
    adicionalZona = adicionalZona || 0;
  }

  if (periodo.tipo === 'quincenal') {
    adicionalPresentismo = adicionalPresentismo / 2;
    adicionalZona = adicionalZona / 2;
    adicionalAntiguedad = adicionalAntiguedad / 2;
  }

  baseImponible = baseImponible + adicionalPresentismo + adicionalZona + adicionalAntiguedad;

  // Aportes empleado
  let aporteJubilacion = 0, aporteObraSocial = 0, aportePami = 0, aporteSindicato = 0;
  let totalAportesEmpleado = 0;
  if (empleado.modalidadContratacion === 'formal') {
    aporteJubilacion = baseImponible * (APORTES_EMPLEADO.JUBILACION / 100);
    aporteObraSocial = baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100);
    aportePami = baseImponible * (APORTES_EMPLEADO.PAMI / 100);
    aporteSindicato = empleado.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0;
    totalAportesEmpleado = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;
  }

  // Contribuciones patronales
  let contribJubilacion = 0, contribObraSocial = 0, contribPami = 0, contribART = 0;
  let totalContribucionesPatronales = 0;
  if (empleado.modalidadContratacion === 'formal') {
    contribJubilacion = baseImponible * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100);
    contribObraSocial = baseImponible * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100);
    contribPami = baseImponible * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100);
    contribART = baseImponible * (CONTRIBUCIONES_EMPLEADOR.ART / 100);
    totalContribucionesPatronales = contribJubilacion + contribObraSocial + contribPami + contribART;
  }

  // Incluir adicional de antigüedad en los totales para mantener consistencia con el frontend
  const totalAPagar = (liquidacion.sueldoBase || sueldoBasePeriodo) + (liquidacion.totalHorasExtra || 0) + (liquidacion.aguinaldos || 0) + totalIncentivos - (liquidacion.adelantos || 0) - totalDescuentos - totalAportesEmpleado + adicionalPresentismo + adicionalZona + adicionalAntiguedad + (liquidacion.bonus || 0);

  const montoNetoPagar = sueldoBasePeriodo + (liquidacion.totalHorasExtra || 0) + adicionalPresentismo + adicionalZona + adicionalAntiguedad + totalIncentivos - (liquidacion.adelantos || 0) - totalDescuentos - totalAportesEmpleado;

  const costoTotalEmpresa = montoNetoPagar + totalAportesEmpleado + totalContribucionesPatronales;

  return {
    sueldoBasePeriodo,
    baseImponible,
    adicionalPresentismo,
    adicionalAntiguedad,
    adicionalZona,
    aporteJubilacion,
    aporteObraSocial,
    aportePami,
    aporteSindicato,
    totalAportesEmpleado,
    contribJubilacion,
    contribObraSocial,
    contribPami,
    contribART,
    totalContribucionesPatronales,
    totalAPagar,
    montoNetoPagar,
    costoTotalEmpresa
  };
}

export default calcularLiquidacionEmpleadoBackend;
