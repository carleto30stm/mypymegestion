import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Convenio from '../models/Convenio.js';

/**
 * SERVICIO DE CÁLCULO DE ANTIGÜEDAD
 * 
 * Implementación según:
 * - Ley 20.744 (LCT) - Arts. 18, 245
 * - Convenios Colectivos de Trabajo (adicionales por antigüedad)
 * 
 * La antigüedad se computa desde:
 * - Fecha de ingreso efectivo al empleador
 * - Se considera el tiempo de trabajo aunque haya interrupciones
 * - Licencias con goce de haberes computan
 */

// Interfaces
export interface IAntiguedad {
  fechaIngreso: Date;
  fechaCalculo: Date;
  anios: number;
  meses: number;
  dias: number;
  totalDias: number;
  descripcion: string;
}

export interface IAdicionalAntiguedad {
  aplicable: boolean;
  porcentaje: number;
  montoBase: number;
  montoAdicional: number;
  concepto: string;
  convenioId?: string;
  convenioNombre?: string;
  detalles: {
    aniosComputados: number;
    topeAplicado: boolean;
    porcentajePorAnio: number;
    aplicaSobre: 'basico' | 'bruto';
  };
}

export interface IResumenAntiguedadEmpleado {
  empleadoId: string;
  nombreCompleto: string;
  cuit: string;
  fechaIngreso: Date;
  antiguedad: IAntiguedad;
  adicional: IAdicionalAntiguedad | null;
  proximoAniversario: {
    fecha: Date;
    diasRestantes: number;
    aniosCumplira: number;
  };
}

/**
 * Calcula la antigüedad exacta entre dos fechas
 */
export function calcularAntiguedad(fechaIngreso: Date, fechaCalculo: Date = new Date()): IAntiguedad {
  const ingreso = new Date(fechaIngreso);
  const calculo = new Date(fechaCalculo);
  
  // Asegurar que fechaCalculo sea posterior a fechaIngreso
  if (calculo < ingreso) {
    return {
      fechaIngreso: ingreso,
      fechaCalculo: calculo,
      anios: 0,
      meses: 0,
      dias: 0,
      totalDias: 0,
      descripcion: '0 años, 0 meses, 0 días'
    };
  }

  // Calcular diferencia en días totales
  const diffTime = Math.abs(calculo.getTime() - ingreso.getTime());
  const totalDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calcular años, meses y días
  let anios = calculo.getFullYear() - ingreso.getFullYear();
  let meses = calculo.getMonth() - ingreso.getMonth();
  let dias = calculo.getDate() - ingreso.getDate();

  // Ajustar si los días son negativos
  if (dias < 0) {
    meses--;
    // Obtener días del mes anterior
    const mesAnterior = new Date(calculo.getFullYear(), calculo.getMonth(), 0);
    dias += mesAnterior.getDate();
  }

  // Ajustar si los meses son negativos
  if (meses < 0) {
    anios--;
    meses += 12;
  }

  // Generar descripción
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} año${anios > 1 ? 's' : ''}`);
  if (meses > 0) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} día${dias > 1 ? 's' : ''}`);

  return {
    fechaIngreso: ingreso,
    fechaCalculo: calculo,
    anios,
    meses,
    dias,
    totalDias,
    descripcion: partes.join(', ')
  };
}

/**
 * Calcula el adicional por antigüedad según convenio colectivo
 */
export async function calcularAdicionalAntiguedad(
  empleadoId: string,
  sueldoBasico: number,
  sueldoBruto?: number,
  fechaCalculo: Date = new Date()
): Promise<IAdicionalAntiguedad | null> {
  try {
    const empleado = await Employee.findById(empleadoId);
    if (!empleado || !empleado.fechaIngreso) {
      return null;
    }

    // Si no tiene convenio asignado, verificar si hay convenio por defecto
    if (!empleado.convenioId) {
      return {
        aplicable: false,
        porcentaje: 0,
        montoBase: sueldoBasico,
        montoAdicional: 0,
        concepto: 'Sin convenio asignado',
        detalles: {
          aniosComputados: 0,
          topeAplicado: false,
          porcentajePorAnio: 0,
          aplicaSobre: 'basico'
        }
      };
    }

    // Obtener convenio
    const convenio = await Convenio.findById(empleado.convenioId);
    if (!convenio || !convenio.adicionalesGenerales?.antiguedad?.activo) {
      return {
        aplicable: false,
        porcentaje: 0,
        montoBase: sueldoBasico,
        montoAdicional: 0,
        concepto: 'Convenio sin adicional por antigüedad',
        convenioId: empleado.convenioId.toString(),
        convenioNombre: convenio?.nombre || '',
        detalles: {
          aniosComputados: 0,
          topeAplicado: false,
          porcentajePorAnio: 0,
          aplicaSobre: 'basico'
        }
      };
    }

    // Calcular antigüedad
    const antiguedad = calcularAntiguedad(new Date(empleado.fechaIngreso), fechaCalculo);
    
    // Configuración del convenio
    const configAntiguedad = convenio.adicionalesGenerales.antiguedad;
    const porcentajePorAnio = configAntiguedad.porcentajePorAnio || 1; // Default 1% por año
    const tope = configAntiguedad.tope || 25; // Default tope 25 años
    const aplicaSobre = configAntiguedad.aplicaSobre || 'basico';

    // Aplicar tope si corresponde
    let aniosComputados = antiguedad.anios;
    let topeAplicado = false;
    if (aniosComputados > tope) {
      aniosComputados = tope;
      topeAplicado = true;
    }

    // Si no tiene años completos, no corresponde adicional (generalmente)
    if (aniosComputados < 1) {
      return {
        aplicable: false,
        porcentaje: 0,
        montoBase: sueldoBasico,
        montoAdicional: 0,
        concepto: 'Menos de 1 año de antigüedad',
        convenioId: empleado.convenioId.toString(),
        convenioNombre: convenio.nombre,
        detalles: {
          aniosComputados: 0,
          topeAplicado: false,
          porcentajePorAnio,
          aplicaSobre
        }
      };
    }

    // Calcular monto
    const base = aplicaSobre === 'bruto' && sueldoBruto ? sueldoBruto : sueldoBasico;
    const porcentajeTotal = porcentajePorAnio * aniosComputados;
    const montoAdicional = Math.round((base * porcentajeTotal / 100) * 100) / 100;

    return {
      aplicable: true,
      porcentaje: porcentajeTotal,
      montoBase: base,
      montoAdicional,
      concepto: `Antigüedad ${aniosComputados} año${aniosComputados > 1 ? 's' : ''} (${porcentajeTotal}%)`,
      convenioId: empleado.convenioId.toString(),
      convenioNombre: convenio.nombre,
      detalles: {
        aniosComputados,
        topeAplicado,
        porcentajePorAnio,
        aplicaSobre
      }
    };

  } catch (error) {
    console.error('Error calculando adicional antigüedad:', error);
    return null;
  }
}

/**
 * Obtiene el resumen de antigüedad de un empleado
 */
export async function getResumenAntiguedadEmpleado(
  empleadoId: string,
  sueldoBasico?: number,
  sueldoBruto?: number
): Promise<IResumenAntiguedadEmpleado | null> {
  try {
    if (!mongoose.Types.ObjectId.isValid(empleadoId)) {
      return null;
    }

    const empleado = await Employee.findById(empleadoId);
    if (!empleado || !empleado.fechaIngreso) {
      return null;
    }

    const fechaIngreso = new Date(empleado.fechaIngreso);
    const ahora = new Date();

    // Calcular antigüedad actual
    const antiguedad = calcularAntiguedad(fechaIngreso, ahora);

    // Calcular adicional si se proporcionó sueldo
    let adicional: IAdicionalAntiguedad | null = null;
    if (sueldoBasico) {
      adicional = await calcularAdicionalAntiguedad(empleadoId, sueldoBasico, sueldoBruto);
    }

    // Calcular próximo aniversario
    const proximoAniversario = calcularProximoAniversario(fechaIngreso, ahora);

    return {
      empleadoId: (empleado._id as any).toString(),
      nombreCompleto: `${empleado.apellido}, ${empleado.nombre}`,
      cuit: empleado.cuit || '',
      fechaIngreso,
      antiguedad,
      adicional,
      proximoAniversario
    };

  } catch (error) {
    console.error('Error obteniendo resumen antigüedad:', error);
    return null;
  }
}

/**
 * Calcula la fecha del próximo aniversario laboral
 */
function calcularProximoAniversario(fechaIngreso: Date, fechaActual: Date): {
  fecha: Date;
  diasRestantes: number;
  aniosCumplira: number;
} {
  const ingreso = new Date(fechaIngreso);
  const actual = new Date(fechaActual);
  
  // Próximo aniversario en el año actual
  let proximoAniversario = new Date(
    actual.getFullYear(),
    ingreso.getMonth(),
    ingreso.getDate()
  );

  // Si ya pasó este año, es el próximo año
  if (proximoAniversario <= actual) {
    proximoAniversario = new Date(
      actual.getFullYear() + 1,
      ingreso.getMonth(),
      ingreso.getDate()
    );
  }

  // Calcular días restantes
  const diffTime = proximoAniversario.getTime() - actual.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Calcular años que cumplirá
  const aniosCumplira = proximoAniversario.getFullYear() - ingreso.getFullYear();

  return {
    fecha: proximoAniversario,
    diasRestantes,
    aniosCumplira
  };
}

/**
 * Obtiene empleados próximos a cumplir aniversario (alertas)
 */
export async function getEmpleadosProximosAniversario(
  diasAnticipacion: number = 30
): Promise<Array<{
  empleado: {
    id: string;
    nombre: string;
    apellido: string;
  };
  aniversario: {
    fecha: Date;
    diasRestantes: number;
    aniosCumplira: number;
  };
}>> {
  try {
    const empleados = await Employee.find({ activo: true });
    const ahora = new Date();
    const resultados: Array<{
      empleado: { id: string; nombre: string; apellido: string };
      aniversario: { fecha: Date; diasRestantes: number; aniosCumplira: number };
    }> = [];

    for (const emp of empleados) {
      if (!emp.fechaIngreso) continue;

      const fechaIngreso = new Date(emp.fechaIngreso);
      const aniversario = calcularProximoAniversario(fechaIngreso, ahora);

      if (aniversario.diasRestantes <= diasAnticipacion) {
        resultados.push({
          empleado: {
            id: (emp._id as any).toString(),
            nombre: emp.nombre,
            apellido: emp.apellido
          },
          aniversario
        });
      }
    }

    // Ordenar por días restantes (más próximos primero)
    return resultados.sort((a, b) => a.aniversario.diasRestantes - b.aniversario.diasRestantes);

  } catch (error) {
    console.error('Error obteniendo empleados próximos a aniversario:', error);
    return [];
  }
}

/**
 * Obtiene ranking de empleados por antigüedad
 */
export async function getRankingAntiguedad(
  limite: number = 10
): Promise<Array<{
  posicion: number;
  empleado: {
    id: string;
    nombre: string;
    apellido: string;
    area?: string;
  };
  antiguedad: IAntiguedad;
}>> {
  try {
    const empleados = await Employee.find({ activo: true });
    const ahora = new Date();

    const conAntiguedad = empleados
      .filter(emp => emp.fechaIngreso)
      .map(emp => ({
        empleado: {
          id: (emp._id as any).toString(),
          nombre: emp.nombre,
          apellido: emp.apellido,
          area: (emp as any).area
        },
        antiguedad: calcularAntiguedad(new Date(emp.fechaIngreso), ahora)
      }))
      .sort((a, b) => b.antiguedad.totalDias - a.antiguedad.totalDias)
      .slice(0, limite);

    return conAntiguedad.map((item, index) => ({
      posicion: index + 1,
      ...item
    }));

  } catch (error) {
    console.error('Error obteniendo ranking antigüedad:', error);
    return [];
  }
}

/**
 * Estadísticas generales de antigüedad
 */
export async function getEstadisticasAntiguedad(): Promise<{
  totalEmpleados: number;
  promedioAnios: number;
  promedioMeses: number;
  distribucion: {
    menosDeUnAnio: number;
    de1a3anios: number;
    de3a5anios: number;
    de5a10anios: number;
    masde10anios: number;
  };
  empleadoMasAntiguo: {
    id: string;
    nombre: string;
    antiguedad: IAntiguedad;
  } | null;
  empleadoMasReciente: {
    id: string;
    nombre: string;
    antiguedad: IAntiguedad;
  } | null;
}> {
  try {
    const empleados = await Employee.find({ activo: true });
    const ahora = new Date();

    const empleadosConFecha = empleados.filter(emp => emp.fechaIngreso);
    
    if (empleadosConFecha.length === 0) {
      return {
        totalEmpleados: 0,
        promedioAnios: 0,
        promedioMeses: 0,
        distribucion: {
          menosDeUnAnio: 0,
          de1a3anios: 0,
          de3a5anios: 0,
          de5a10anios: 0,
          masde10anios: 0
        },
        empleadoMasAntiguo: null,
        empleadoMasReciente: null
      };
    }

    // Calcular antigüedad de cada empleado
    const antiguedades = empleadosConFecha.map(emp => ({
      empleado: emp,
      antiguedad: calcularAntiguedad(new Date(emp.fechaIngreso), ahora)
    }));

    // Distribución
    const distribucion = {
      menosDeUnAnio: antiguedades.filter(a => a.antiguedad.anios < 1).length,
      de1a3anios: antiguedades.filter(a => a.antiguedad.anios >= 1 && a.antiguedad.anios < 3).length,
      de3a5anios: antiguedades.filter(a => a.antiguedad.anios >= 3 && a.antiguedad.anios < 5).length,
      de5a10anios: antiguedades.filter(a => a.antiguedad.anios >= 5 && a.antiguedad.anios < 10).length,
      masde10anios: antiguedades.filter(a => a.antiguedad.anios >= 10).length
    };

    // Promedios
    const totalDiasProm = antiguedades.reduce((sum, a) => sum + a.antiguedad.totalDias, 0);
    const promedioDias = totalDiasProm / antiguedades.length;
    const promedioAnios = Math.floor(promedioDias / 365);
    const promedioMeses = Math.floor((promedioDias % 365) / 30);

    // Ordenar para obtener más antiguo y más reciente
    antiguedades.sort((a, b) => b.antiguedad.totalDias - a.antiguedad.totalDias);
    
    const masAntiguo = antiguedades[0];
    const masReciente = antiguedades[antiguedades.length - 1];

    return {
      totalEmpleados: empleadosConFecha.length,
      promedioAnios,
      promedioMeses,
      distribucion,
      empleadoMasAntiguo: masAntiguo ? {
        id: (masAntiguo.empleado._id as any).toString(),
        nombre: `${masAntiguo.empleado.apellido}, ${masAntiguo.empleado.nombre}`,
        antiguedad: masAntiguo.antiguedad
      } : null,
      empleadoMasReciente: masReciente ? {
        id: (masReciente.empleado._id as any).toString(),
        nombre: `${masReciente.empleado.apellido}, ${masReciente.empleado.nombre}`,
        antiguedad: masReciente.antiguedad
      } : null
    };

  } catch (error) {
    console.error('Error obteniendo estadísticas antigüedad:', error);
    throw error;
  }
}

// Exportar servicio como singleton
export const antiguedadService = {
  calcularAntiguedad,
  calcularAdicionalAntiguedad,
  getResumenAntiguedadEmpleado,
  getEmpleadosProximosAniversario,
  getRankingAntiguedad,
  getEstadisticasAntiguedad
};
