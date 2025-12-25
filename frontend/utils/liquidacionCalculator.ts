/**
 * @deprecated Este archivo ahora es un wrapper del calculador compartido
 * Usar directamente @mygestor/shared en nuevos componentes
 */

import { calcularLiquidacionEmpleado as calcularShared, calcularAntiguedadYearsAndAmount as calcularAntShared } from '@mygestor/shared';
import type { IEmpleadoData, IAdicionalesConvenio, TipoPeriodo } from '@mygestor/shared';
import { LiquidacionEmpleado, LiquidacionPeriodo, DescuentoEmpleado, IncentivoEmpleado, Employee } from '../types';

interface CalcularParams {
  liquidacion: LiquidacionEmpleado;
  empleadoData?: Employee | null;
  periodo: LiquidacionPeriodo;
  descuentosDetalle?: DescuentoEmpleado[];
  incentivosDetalle?: IncentivoEmpleado[];
  adicionalesConvenio?: { presentismo: number; zona: number } | null;
}

/**
 * Wrapper del calculador compartido para mantener compatibilidad con código existente
 * @deprecated Usar directamente calcularLiquidacionEmpleado de @mygestor/shared
 */
export const calcularLiquidacionEmpleado = (params: CalcularParams): LiquidacionEmpleado => {
  const { liquidacion, empleadoData, periodo, descuentosDetalle = [], incentivosDetalle = [], adicionalesConvenio } = params;

  // Convertir empleadoData al formato del paquete compartido
  const empleadoDataShared: IEmpleadoData | null = empleadoData ? {
    _id: empleadoData._id,
    modalidadContratacion: (empleadoData.modalidadContratacion || 'informal') as any,
    fechaIngreso: empleadoData.fechaIngreso,
    sindicato: empleadoData.sindicato || null,
    aplicaAntiguedad: (empleadoData as any).aplicaAntiguedad,
    aplicaPresentismo: (empleadoData as any).aplicaPresentismo,
    aplicaZonaPeligrosa: (empleadoData as any).aplicaZonaPeligrosa,
    convenioId: empleadoData.convenioId || null,
    categoriaConvenio: empleadoData.categoriaConvenio || null,
  } as IEmpleadoData : null;

  // Convertir adicionalesConvenio al formato del paquete compartido
  const adicionalesConvenioShared: IAdicionalesConvenio | null = adicionalesConvenio ? {
    presentismo: adicionalesConvenio.presentismo,
    zona: adicionalesConvenio.zona,
  } : null;

  // Llamar al calculador compartido
  const resultado = calcularShared({
    liquidacion: liquidacion as any,
    empleadoData: empleadoDataShared,
    tipoPeriodo: periodo.tipo as TipoPeriodo,
    descuentosDetalle: descuentosDetalle as any,
    incentivosDetalle: incentivosDetalle as any,
    adicionalesConvenio: adicionalesConvenioShared,
  });

  // Retornar resultado (ya es compatible con LiquidacionEmpleado)
  return resultado as any;
};

/**
 * Wrapper de calcularAntiguedadYearsAndAmount para mantener compatibilidad
 * @deprecated Usar directamente calcularAntiguedadYearsAndAmount de @mygestor/shared
 */
export function calcularAntiguedadYearsAndAmount(options: {
  fechaIngreso?: string | Date | null;
  empleadoAntiguedad?: number | null;
  adicionalAntiguedad?: number | null;
  sueldoBasePeriodo: number;
  porcentajePorAnio?: number;
}): { years: number; amount: number } {
  return calcularAntShared(options);
}

export default calcularLiquidacionEmpleado;


