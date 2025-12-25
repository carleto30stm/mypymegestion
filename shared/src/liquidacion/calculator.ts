/**
 * Calculador unificado de liquidación de sueldos
 * ÚNICA FUENTE DE VERDAD para cálculos de liquidación
 * Compartido entre frontend y backend
 */

import { APORTES_EMPLEADO, CONTRIBUCIONES_EMPLEADOR, ADICIONALES_LEGALES } from './constants';
import type {
    ICalcularLiquidacionParams,
    ICalcularLiquidacionResult,
} from '../types/liquidacion';

/**
 * Calcula la liquidación completa de un empleado
 * 
 * @param params - Parámetros de cálculo
 * @returns Resultado completo con todos los campos calculados
 * 
 * @example
 * ```typescript
 * const resultado = calcularLiquidacionEmpleado({
 *   liquidacion: { ... },
 *   empleadoData: { modalidadContratacion: 'formal', ... },
 *   tipoPeriodo: 'quincenal',
 *   descuentosDetalle: [],
 *   incentivosDetalle: [],
 *   adicionalesConvenio: null
 * });
 * console.log(resultado.totalAPagar);
 * ```
 */
export function calcularLiquidacionEmpleado(
    params: ICalcularLiquidacionParams
): ICalcularLiquidacionResult {
    const {
        liquidacion,
        empleadoData,
        tipoPeriodo,
        descuentosDetalle = [],
        incentivosDetalle = [],
        adicionalesConvenio,
    } = params;

    // 1. Ajustar sueldo base por tipo de período
    const sueldoBasePeriodo =
        tipoPeriodo === 'quincenal' ? liquidacion.sueldoBase / 2 : liquidacion.sueldoBase;

    // 2. Calcular antigüedad en años
    let antiguedad = 0;
    if (empleadoData?.fechaIngreso) {
        const fechaIngreso = new Date(empleadoData.fechaIngreso);
        const ahora = new Date();
        antiguedad = Math.floor(
            (ahora.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
    }

    // 3. Calcular adicional por antigüedad
    const aplicaAnt = empleadoData?.aplicaAntiguedad !== false; // default true
    const adicionalAntiguedadFull = aplicaAnt
        ? liquidacion.sueldoBase * (antiguedad * (ADICIONALES_LEGALES.ANTIGUEDAD / 100))
        : 0;
    const adicionalAntiguedad =
        tipoPeriodo === 'quincenal' ? adicionalAntiguedadFull / 2 : adicionalAntiguedadFull;

    // 4. Calcular adicional por presentismo
    const aplicaPres = empleadoData?.aplicaPresentismo !== false; // default true
    let adicionalPresentismoFull = 0;
    if (adicionalesConvenio?.presentismo) {
        // Usar valor del convenio si está disponible
        adicionalPresentismoFull = adicionalesConvenio.presentismo;
    } else if (aplicaPres) {
        // Fallback: calcular con porcentaje legal
        adicionalPresentismoFull =
            liquidacion.sueldoBase * (ADICIONALES_LEGALES.PRESENTISMO / 100);
    }
    if (!aplicaPres) adicionalPresentismoFull = 0;
    const adicionalPresentismo =
        tipoPeriodo === 'quincenal' ? adicionalPresentismoFull / 2 : adicionalPresentismoFull;

    // 5. Calcular adicional por zona peligrosa
    const aplicaZona = empleadoData?.aplicaZonaPeligrosa === true;
    let adicionalZonaFull = adicionalesConvenio?.zona || 0;
    if (!aplicaZona) adicionalZonaFull = 0;
    const adicionalZona =
        tipoPeriodo === 'quincenal' ? adicionalZonaFull / 2 : adicionalZonaFull;

    // 6. Calcular totales de descuentos e incentivos
    const totalDescuentos = descuentosDetalle.reduce(
        (sum, d) => sum + (d.montoCalculado ?? d.monto ?? 0),
        0
    );
    const totalIncentivos = incentivosDetalle.reduce(
        (sum, i) => sum + (i.montoCalculado ?? i.monto ?? 0),
        0
    );

    // 7. Obtener otros conceptos
    const totalHorasExtra = liquidacion.totalHorasExtra || 0;
    // 7. Obtener otros conceptos
    // totalHorasExtra ya fue calculado arriba
    const aguinaldos = liquidacion.aguinaldos || 0;
    const adelantos = liquidacion.adelantos || 0;

    // 8. Calcular base imponible (CRÍTICO: incluir TODOS los adicionales)
    // Base imponible = sueldo + horas extra + adicionales + incentivos
    const baseImponible =
        sueldoBasePeriodo +
        totalHorasExtra +
        adicionalAntiguedad +
        adicionalPresentismo +
        adicionalZona +
        totalIncentivos;

    // 9. Calcular aportes del empleado (solo para empleados formales)
    const esFormal = empleadoData?.modalidadContratacion === 'formal';
    const aporteJubilacion = esFormal
        ? baseImponible * (APORTES_EMPLEADO.JUBILACION / 100)
        : 0;
    const aporteObraSocial = esFormal
        ? baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100)
        : 0;
    const aportePami = esFormal ? baseImponible * (APORTES_EMPLEADO.PAMI / 100) : 0;
    const aporteSindicato =
        esFormal && empleadoData?.sindicato
            ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100)
            : 0;
    const totalAportes = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;

    // 10. Calcular contribuciones patronales (para costo empresa)
    const contribJubilacion = esFormal
        ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100)
        : 0;
    const contribObraSocial = esFormal
        ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100)
        : 0;
    const contribPami = esFormal
        ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100)
        : 0;
    const contribART = esFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.ART / 100) : 0;
    const totalContribucionesPatronales =
        contribJubilacion + contribObraSocial + contribPami + contribART;

    // 11. Calcular totales finales
    // Total haberes = sueldo + horas extra + adicionales + aguinaldos + incentivos
    const totalHaberes =
        sueldoBasePeriodo +
        totalHorasExtra +
        adicionalAntiguedad +
        adicionalPresentismo +
        adicionalZona +
        aguinaldos +
        totalIncentivos;

    // Total deducciones = adelantos + descuentos + aportes
    const totalDeducciones = adelantos + totalDescuentos + totalAportes;

    // Total a pagar (neto) = haberes - deducciones
    const totalAPagar = totalHaberes - totalDeducciones;

    // Costo total empresa = neto + aportes + contribuciones patronales
    const costoTotalEmpresa = totalAPagar + totalAportes + totalContribucionesPatronales;

    // 12. Retornar resultado completo
    return {
        ...liquidacion,
        sueldoBasePeriodo,
        empleadoAntiguedad: antiguedad,
        adicionalAntiguedad,
        adicionalPresentismo,
        adicionalZona,
        totalHorasExtra,
        aguinaldos,
        baseImponible,
        aporteJubilacion,
        aporteObraSocial,
        aportePami,
        aporteSindicato,
        totalAportes,
        descuentos: totalDescuentos,
        incentivos: totalIncentivos,
        totalHaberes,
        totalDeducciones,
        totalAPagar,
        contribJubilacion,
        contribObraSocial,
        contribPami,
        contribART,
        totalContribucionesPatronales,
        costoTotalEmpresa,
    };
}

/**
 * Calcula años de antigüedad y monto del adicional por antigüedad
 * 
 * @param options - Opciones de cálculo
 * @returns Objeto con años de antigüedad y monto del adicional
 */
export function calcularAntiguedadYearsAndAmount(options: {
    fechaIngreso?: string | Date | null;
    empleadoAntiguedad?: number | null;
    adicionalAntiguedad?: number | null;
    sueldoBasePeriodo: number;
    porcentajePorAnio?: number;
}): { years: number; amount: number } {
    const {
        fechaIngreso,
        empleadoAntiguedad,
        adicionalAntiguedad,
        sueldoBasePeriodo,
        porcentajePorAnio,
    } = options;
    const pct = porcentajePorAnio ?? ADICIONALES_LEGALES.ANTIGUEDAD;

    const years = fechaIngreso
        ? Math.floor(
            (Date.now() - new Date(fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
        : empleadoAntiguedad ?? 0;

    const amount =
        adicionalAntiguedad && adicionalAntiguedad > 0
            ? adicionalAntiguedad
            : years > 0
                ? sueldoBasePeriodo * (pct / 100) * years
                : 0;

    return { years, amount };
}
